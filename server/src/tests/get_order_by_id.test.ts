import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, usersTable, menuCategoriesTable, menuItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { getOrderById } from '../handlers/get_order_by_id';

describe('getOrderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return order when it exists', async () => {
    // Create test data
    const orderData = {
      order_number: 'YC001',
      status: 'pending' as const,
      total_amount: '25.50',
      tax_amount: '2.50',
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      special_instructions: 'Extra hot please'
    };

    const [createdOrder] = await db.insert(ordersTable)
      .values(orderData)
      .returning()
      .execute();

    // Test the handler
    const result = await getOrderById(createdOrder.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdOrder.id);
    expect(result!.order_number).toBe('YC001');
    expect(result!.status).toBe('pending');
    expect(result!.total_amount).toBe(25.50);
    expect(result!.tax_amount).toBe(2.50);
    expect(result!.customer_name).toBe('John Doe');
    expect(result!.customer_phone).toBe('+1234567890');
    expect(result!.special_instructions).toBe('Extra hot please');
    expect(result!.customer_id).toBeNull();
    expect(result!.estimated_ready_time).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when order does not exist', async () => {
    const result = await getOrderById(999);
    
    expect(result).toBeNull();
  });

  it('should return order with registered customer', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values({
        email: 'customer@test.com',
        name: 'Jane Smith',
        phone: '+1234567890',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create order for registered customer
    const orderData = {
      customer_id: user.id,
      order_number: 'YC002',
      status: 'confirmed' as const,
      total_amount: '18.75',
      tax_amount: '1.75',
      customer_name: null,
      customer_phone: null,
      special_instructions: null
    };

    const [createdOrder] = await db.insert(ordersTable)
      .values(orderData)
      .returning()
      .execute();

    const result = await getOrderById(createdOrder.id);

    expect(result).not.toBeNull();
    expect(result!.customer_id).toBe(user.id);
    expect(result!.customer_name).toBeNull();
    expect(result!.customer_phone).toBeNull();
    expect(result!.special_instructions).toBeNull();
    expect(result!.total_amount).toBe(18.75);
    expect(result!.tax_amount).toBe(1.75);
  });

  it('should handle numeric conversion correctly', async () => {
    // Test with decimal values
    const orderData = {
      order_number: 'YC003',
      status: 'completed' as const,
      total_amount: '12.99',
      tax_amount: '1.30',
      customer_name: 'Test Customer'
    };

    const [createdOrder] = await db.insert(ordersTable)
      .values(orderData)
      .returning()
      .execute();

    const result = await getOrderById(createdOrder.id);

    expect(result).not.toBeNull();
    expect(typeof result!.total_amount).toBe('number');
    expect(typeof result!.tax_amount).toBe('number');
    expect(result!.total_amount).toBe(12.99);
    expect(result!.tax_amount).toBe(1.30);
  });

  it('should return order with all possible statuses', async () => {
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as const;
    
    for (const status of statuses) {
      const orderData = {
        order_number: `YC-${status}`,
        status: status,
        total_amount: '10.00',
        tax_amount: '1.00',
        customer_name: 'Test Customer'
      };

      const [createdOrder] = await db.insert(ordersTable)
        .values(orderData)
        .returning()
        .execute();

      const result = await getOrderById(createdOrder.id);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(status);
    }
  });

  it('should return order with estimated ready time', async () => {
    const estimatedTime = new Date(Date.now() + 30 * 60000); // 30 minutes from now
    
    const orderData = {
      order_number: 'YC004',
      status: 'preparing' as const,
      total_amount: '15.50',
      tax_amount: '1.55',
      customer_name: 'Test Customer',
      estimated_ready_time: estimatedTime
    };

    const [createdOrder] = await db.insert(ordersTable)
      .values(orderData)
      .returning()
      .execute();

    const result = await getOrderById(createdOrder.id);

    expect(result).not.toBeNull();
    expect(result!.estimated_ready_time).toBeInstanceOf(Date);
    expect(result!.estimated_ready_time!.getTime()).toBeCloseTo(estimatedTime.getTime(), -3); // Within 1 second
  });
});