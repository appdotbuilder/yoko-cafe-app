import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, menuCategoriesTable, menuItemsTable, usersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type CreateOrderInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestOrder = async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create a menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Coffee',
        description: 'Coffee beverages',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    // Create a menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryResult[0].id,
        name: 'Espresso',
        description: 'Strong coffee',
        base_price: '3.50',
        is_available: true,
        has_size_options: false,
        has_milk_options: false,
        max_extra_shots: 2,
        sort_order: 1
      })
      .returning()
      .execute();

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: userResult[0].id,
        order_number: 'TEST001',
        status: 'pending',
        total_amount: '12.75',
        tax_amount: '1.25',
        customer_name: 'Test User',
        customer_phone: '+1234567890',
        special_instructions: 'Extra hot please'
      })
      .returning()
      .execute();

    return orderResult[0];
  };

  it('should update order status successfully', async () => {
    const testOrder = await createTestOrder();

    const input: UpdateOrderStatusInput = {
      id: testOrder.id,
      status: 'confirmed'
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toBe(testOrder.id);
    expect(result.status).toBe('confirmed');
    expect(result.customer_name).toBe('Test User');
    expect(result.total_amount).toBe(12.75);
    expect(result.tax_amount).toBe(1.25);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify the update was saved to database
    const updatedOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, testOrder.id))
      .execute();

    expect(updatedOrder[0].status).toBe('confirmed');
    expect(updatedOrder[0].updated_at).toBeInstanceOf(Date);
    expect(updatedOrder[0].updated_at.getTime()).toBeGreaterThan(testOrder.updated_at.getTime());
  });

  it('should update order status with estimated ready time', async () => {
    const testOrder = await createTestOrder();
    const estimatedTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    const input: UpdateOrderStatusInput = {
      id: testOrder.id,
      status: 'preparing',
      estimated_ready_time: estimatedTime
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toBe(testOrder.id);
    expect(result.status).toBe('preparing');
    expect(result.estimated_ready_time).toBeInstanceOf(Date);
    expect(result.estimated_ready_time?.getTime()).toBe(estimatedTime.getTime());

    // Verify the update was saved to database
    const updatedOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, testOrder.id))
      .execute();

    expect(updatedOrder[0].status).toBe('preparing');
    expect(updatedOrder[0].estimated_ready_time).toBeInstanceOf(Date);
    expect(updatedOrder[0].estimated_ready_time?.getTime()).toBe(estimatedTime.getTime());
  });

  it('should update status without changing estimated ready time when not provided', async () => {
    const testOrder = await createTestOrder();
    const initialReadyTime = new Date(Date.now() + 10 * 60 * 1000);
    
    // First set an estimated ready time
    await db.update(ordersTable)
      .set({ estimated_ready_time: initialReadyTime })
      .where(eq(ordersTable.id, testOrder.id))
      .execute();

    const input: UpdateOrderStatusInput = {
      id: testOrder.id,
      status: 'ready'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toBe('ready');
    expect(result.estimated_ready_time).toBeInstanceOf(Date);
    expect(result.estimated_ready_time?.getTime()).toBe(initialReadyTime.getTime());
  });

  it('should clear estimated ready time when explicitly set to null', async () => {
    const testOrder = await createTestOrder();
    const initialReadyTime = new Date(Date.now() + 10 * 60 * 1000);
    
    // First set an estimated ready time
    await db.update(ordersTable)
      .set({ estimated_ready_time: initialReadyTime })
      .where(eq(ordersTable.id, testOrder.id))
      .execute();

    const input: UpdateOrderStatusInput = {
      id: testOrder.id,
      status: 'completed',
      estimated_ready_time: null
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toBe('completed');
    expect(result.estimated_ready_time).toBeNull();

    // Verify in database
    const updatedOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, testOrder.id))
      .execute();

    expect(updatedOrder[0].estimated_ready_time).toBeNull();
  });

  it('should handle various status transitions', async () => {
    const testOrder = await createTestOrder();

    // Test multiple status transitions
    const statusUpdates = ['confirmed', 'preparing', 'ready', 'completed'] as const;

    for (const status of statusUpdates) {
      const input: UpdateOrderStatusInput = {
        id: testOrder.id,
        status
      };

      const result = await updateOrderStatus(input);
      expect(result.status).toBe(status);

      // Verify in database
      const dbOrder = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, testOrder.id))
        .execute();

      expect(dbOrder[0].status).toBe(status);
    }
  });

  it('should handle cancelled status', async () => {
    const testOrder = await createTestOrder();

    const input: UpdateOrderStatusInput = {
      id: testOrder.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toBe('cancelled');
    expect(result.id).toBe(testOrder.id);
    expect(result.total_amount).toBe(12.75);
  });

  it('should throw error for non-existent order', async () => {
    const input: UpdateOrderStatusInput = {
      id: 99999,
      status: 'confirmed'
    };

    expect(updateOrderStatus(input)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should preserve all other order fields when updating', async () => {
    const testOrder = await createTestOrder();

    const input: UpdateOrderStatusInput = {
      id: testOrder.id,
      status: 'preparing'
    };

    const result = await updateOrderStatus(input);

    // Verify all original fields are preserved
    expect(result.order_number).toBe(testOrder.order_number);
    expect(result.customer_name).toBe(testOrder.customer_name);
    expect(result.customer_phone).toBe(testOrder.customer_phone);
    expect(result.special_instructions).toBe(testOrder.special_instructions);
    expect(result.total_amount).toBe(12.75); // Converted to number
    expect(result.tax_amount).toBe(1.25); // Converted to number
    expect(result.customer_id).toBe(testOrder.customer_id);
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Only status and updated_at should change
    expect(result.status).not.toBe(testOrder.status);
    expect(result.updated_at.getTime()).toBeGreaterThan(testOrder.updated_at.getTime());
  });
});