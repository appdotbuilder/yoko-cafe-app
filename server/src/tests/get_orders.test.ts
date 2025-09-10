import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable } from '../db/schema';
import { type GetOrdersInput } from '../schema';
import { getOrders } from '../handlers/get_orders';
import { eq } from 'drizzle-orm';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test users
  const createTestUser = async (email: string, name: string) => {
    const result = await db.insert(usersTable)
      .values({
        email,
        name,
        role: 'customer'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test orders
  const createTestOrder = async (orderData: {
    customer_id?: number;
    order_number: string;
    status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    total_amount: number;
    tax_amount: number;
    customer_name?: string;
    customer_phone?: string;
  }) => {
    const result = await db.insert(ordersTable)
      .values({
        customer_id: orderData.customer_id || null,
        order_number: orderData.order_number,
        status: orderData.status || 'pending',
        total_amount: orderData.total_amount.toString(),
        tax_amount: orderData.tax_amount.toString(),
        customer_name: orderData.customer_name || null,
        customer_phone: orderData.customer_phone || null
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should fetch all orders with default pagination', async () => {
    // Create test orders
    await createTestOrder({
      order_number: 'ORD001',
      status: 'pending',
      total_amount: 15.50,
      tax_amount: 1.55,
      customer_name: 'John Doe',
      customer_phone: '+1234567890'
    });

    await createTestOrder({
      order_number: 'ORD002',
      status: 'ready',
      total_amount: 8.75,
      tax_amount: 0.88,
      customer_name: 'Jane Smith'
    });

    const input: GetOrdersInput = {
      limit: 50,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(2);
    expect(result[0].order_number).toEqual('ORD002'); // Newest first due to ordering
    expect(result[1].order_number).toEqual('ORD001');
    
    // Verify numeric conversions
    expect(typeof result[0].total_amount).toEqual('number');
    expect(typeof result[0].tax_amount).toEqual('number');
    expect(result[0].total_amount).toEqual(8.75);
    expect(result[0].tax_amount).toEqual(0.88);
  });

  it('should filter orders by status', async () => {
    await createTestOrder({
      order_number: 'ORD001',
      status: 'pending',
      total_amount: 15.50,
      tax_amount: 1.55
    });

    await createTestOrder({
      order_number: 'ORD002',
      status: 'ready',
      total_amount: 8.75,
      tax_amount: 0.88
    });

    await createTestOrder({
      order_number: 'ORD003',
      status: 'ready',
      total_amount: 12.00,
      tax_amount: 1.20
    });

    const input: GetOrdersInput = {
      status: 'ready',
      limit: 50,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(2);
    result.forEach(order => {
      expect(order.status).toEqual('ready');
    });
  });

  it('should filter orders by customer_id', async () => {
    // Create test users
    const user1 = await createTestUser('customer1@example.com', 'Customer One');
    const user2 = await createTestUser('customer2@example.com', 'Customer Two');

    // Create orders for different customers
    await createTestOrder({
      customer_id: user1.id,
      order_number: 'ORD001',
      total_amount: 15.50,
      tax_amount: 1.55
    });

    await createTestOrder({
      customer_id: user2.id,
      order_number: 'ORD002',
      total_amount: 8.75,
      tax_amount: 0.88
    });

    await createTestOrder({
      customer_id: user1.id,
      order_number: 'ORD003',
      total_amount: 12.00,
      tax_amount: 1.20
    });

    const input: GetOrdersInput = {
      customer_id: user1.id,
      limit: 50,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(2);
    result.forEach(order => {
      expect(order.customer_id).toEqual(user1.id);
    });
  });

  it('should filter by both status and customer_id', async () => {
    const user = await createTestUser('customer@example.com', 'Customer');

    await createTestOrder({
      customer_id: user.id,
      order_number: 'ORD001',
      status: 'pending',
      total_amount: 15.50,
      tax_amount: 1.55
    });

    await createTestOrder({
      customer_id: user.id,
      order_number: 'ORD002',
      status: 'ready',
      total_amount: 8.75,
      tax_amount: 0.88
    });

    await createTestOrder({
      order_number: 'ORD003',
      status: 'ready',
      total_amount: 12.00,
      tax_amount: 1.20
    });

    const input: GetOrdersInput = {
      status: 'ready',
      customer_id: user.id,
      limit: 50,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].order_number).toEqual('ORD002');
    expect(result[0].status).toEqual('ready');
    expect(result[0].customer_id).toEqual(user.id);
  });

  it('should respect pagination limits', async () => {
    // Create multiple orders
    for (let i = 1; i <= 5; i++) {
      await createTestOrder({
        order_number: `ORD00${i}`,
        total_amount: 10.00 + i,
        tax_amount: 1.00
      });
    }

    const input: GetOrdersInput = {
      limit: 3,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(3);
  });

  it('should handle pagination offset', async () => {
    // Create test orders
    for (let i = 1; i <= 5; i++) {
      await createTestOrder({
        order_number: `ORD00${i}`,
        total_amount: 10.00 + i,
        tax_amount: 1.00
      });
    }

    const input: GetOrdersInput = {
      limit: 2,
      offset: 2
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(2);
    // Should get the 3rd and 4th orders (newest first)
    expect(result[0].order_number).toEqual('ORD003');
    expect(result[1].order_number).toEqual('ORD002');
  });

  it('should return empty array when no orders match filters', async () => {
    await createTestOrder({
      order_number: 'ORD001',
      status: 'pending',
      total_amount: 15.50,
      tax_amount: 1.55
    });

    const input: GetOrdersInput = {
      status: 'completed',
      limit: 50,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(0);
  });

  it('should handle orders with null customer_id (guest orders)', async () => {
    await createTestOrder({
      order_number: 'GUEST001',
      total_amount: 15.50,
      tax_amount: 1.55,
      customer_name: 'Guest Customer',
      customer_phone: '+1234567890'
    });

    const input: GetOrdersInput = {
      limit: 50,
      offset: 0
    };

    const result = await getOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBeNull();
    expect(result[0].customer_name).toEqual('Guest Customer');
    expect(result[0].customer_phone).toEqual('+1234567890');
  });

  it('should save orders to database correctly', async () => {
    const testOrder = await createTestOrder({
      order_number: 'TEST001',
      status: 'preparing',
      total_amount: 25.99,
      tax_amount: 2.60,
      customer_name: 'Test Customer'
    });

    // Verify order was saved to database
    const savedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, testOrder.id))
      .execute();

    expect(savedOrders).toHaveLength(1);
    expect(savedOrders[0].order_number).toEqual('TEST001');
    expect(savedOrders[0].status).toEqual('preparing');
    expect(parseFloat(savedOrders[0].total_amount)).toEqual(25.99);
    expect(parseFloat(savedOrders[0].tax_amount)).toEqual(2.60);
  });
});