import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, ordersTable, usersTable, menuCategoriesTable, menuItemsTable } from '../db/schema';
import { type UpdatePaymentStatusInput } from '../schema';
import { updatePaymentStatus } from '../handlers/update_payment_status';
import { eq } from 'drizzle-orm';

// Test setup data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  phone: '123-456-7890',
  role: 'customer' as const
};

const testCategory = {
  name: 'Beverages',
  description: 'Hot and cold drinks',
  sort_order: 1,
  is_active: true
};

const testMenuItem = {
  name: 'Coffee',
  description: 'Fresh brewed coffee',
  base_price: '5.99',
  is_available: true,
  has_size_options: false,
  has_milk_options: false,
  max_extra_shots: 2,
  sort_order: 1,
  image_url: null
};

const testOrder = {
  order_number: 'ORD-001',
  status: 'pending' as const,
  total_amount: '25.50',
  tax_amount: '2.25',
  customer_name: 'John Doe',
  customer_phone: '123-456-7890',
  special_instructions: null,
  estimated_ready_time: null
};

const testPayment = {
  amount: '25.50',
  payment_method: 'credit_card' as const,
  payment_status: 'pending' as const,
  transaction_id: 'txn_123',
  payment_gateway_response: null
};

describe('updatePaymentStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update payment status successfully', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(menuCategoriesTable).values(testCategory).returning().execute();
    const [menuItem] = await db.insert(menuItemsTable).values({
      ...testMenuItem,
      category_id: category.id
    }).returning().execute();
    
    const [order] = await db.insert(ordersTable).values({
      ...testOrder,
      customer_id: user.id
    }).returning().execute();
    
    const [payment] = await db.insert(paymentsTable).values({
      ...testPayment,
      order_id: order.id
    }).returning().execute();

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      payment_status: 'completed',
      transaction_id: 'txn_456',
      payment_gateway_response: 'Payment successful'
    };

    const result = await updatePaymentStatus(input);

    // Verify the returned payment
    expect(result.id).toBe(payment.id);
    expect(result.payment_status).toBe('completed');
    expect(result.transaction_id).toBe('txn_456');
    expect(result.payment_gateway_response).toBe('Payment successful');
    expect(result.amount).toBe(25.50);
    expect(typeof result.amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated payment to database', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(menuCategoriesTable).values(testCategory).returning().execute();
    const [menuItem] = await db.insert(menuItemsTable).values({
      ...testMenuItem,
      category_id: category.id
    }).returning().execute();
    
    const [order] = await db.insert(ordersTable).values({
      ...testOrder,
      customer_id: user.id
    }).returning().execute();
    
    const [payment] = await db.insert(paymentsTable).values({
      ...testPayment,
      order_id: order.id
    }).returning().execute();

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      payment_status: 'failed',
      payment_gateway_response: 'Insufficient funds'
    };

    await updatePaymentStatus(input);

    // Verify the payment was updated in database
    const updatedPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .execute();

    expect(updatedPayments).toHaveLength(1);
    const updatedPayment = updatedPayments[0];
    expect(updatedPayment.payment_status).toBe('failed');
    expect(updatedPayment.transaction_id).toBe('txn_123'); // Should keep original value when not provided
    expect(updatedPayment.payment_gateway_response).toBe('Insufficient funds');
    expect(updatedPayment.updated_at).toBeInstanceOf(Date);
  });

  it('should confirm order when payment is completed', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(menuCategoriesTable).values(testCategory).returning().execute();
    const [menuItem] = await db.insert(menuItemsTable).values({
      ...testMenuItem,
      category_id: category.id
    }).returning().execute();
    
    const [order] = await db.insert(ordersTable).values({
      ...testOrder,
      customer_id: user.id
    }).returning().execute();
    
    const [payment] = await db.insert(paymentsTable).values({
      ...testPayment,
      order_id: order.id
    }).returning().execute();

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      payment_status: 'completed'
    };

    await updatePaymentStatus(input);

    // Verify the order status was updated to confirmed
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    const updatedOrder = updatedOrders[0];
    expect(updatedOrder.status).toBe('confirmed');
    expect(updatedOrder.updated_at).toBeInstanceOf(Date);
  });

  it('should not confirm order when payment is not completed', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(menuCategoriesTable).values(testCategory).returning().execute();
    const [menuItem] = await db.insert(menuItemsTable).values({
      ...testMenuItem,
      category_id: category.id
    }).returning().execute();
    
    const [order] = await db.insert(ordersTable).values({
      ...testOrder,
      customer_id: user.id
    }).returning().execute();
    
    const [payment] = await db.insert(paymentsTable).values({
      ...testPayment,
      order_id: order.id
    }).returning().execute();

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      payment_status: 'failed'
    };

    await updatePaymentStatus(input);

    // Verify the order status remains unchanged
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    const updatedOrder = updatedOrders[0];
    expect(updatedOrder.status).toBe('pending'); // Should remain unchanged
  });

  it('should handle optional fields correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(menuCategoriesTable).values(testCategory).returning().execute();
    const [menuItem] = await db.insert(menuItemsTable).values({
      ...testMenuItem,
      category_id: category.id
    }).returning().execute();
    
    const [order] = await db.insert(ordersTable).values({
      ...testOrder,
      customer_id: user.id
    }).returning().execute();
    
    const [payment] = await db.insert(paymentsTable).values({
      ...testPayment,
      order_id: order.id
    }).returning().execute();

    // Only provide required fields
    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      payment_status: 'processing'
    };

    const result = await updatePaymentStatus(input);

    // Verify optional fields remain unchanged
    expect(result.payment_status).toBe('processing');
    expect(result.transaction_id).toBe('txn_123'); // Original value preserved
    expect(result.payment_gateway_response).toBeNull(); // Original value preserved
  });

  it('should throw error when payment does not exist', async () => {
    const input: UpdatePaymentStatusInput = {
      id: 999, // Non-existent payment ID
      payment_status: 'completed'
    };

    await expect(updatePaymentStatus(input)).rejects.toThrow(/payment with id 999 not found/i);
  });

  it('should handle all payment status transitions', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(menuCategoriesTable).values(testCategory).returning().execute();
    const [menuItem] = await db.insert(menuItemsTable).values({
      ...testMenuItem,
      category_id: category.id
    }).returning().execute();
    
    const [order] = await db.insert(ordersTable).values({
      ...testOrder,
      customer_id: user.id
    }).returning().execute();
    
    const [payment] = await db.insert(paymentsTable).values({
      ...testPayment,
      order_id: order.id
    }).returning().execute();

    const statuses = ['processing', 'completed', 'failed', 'refunded'] as const;

    for (const status of statuses) {
      const input: UpdatePaymentStatusInput = {
        id: payment.id,
        payment_status: status
      };

      const result = await updatePaymentStatus(input);
      expect(result.payment_status).toBe(status);
    }
  });
});