import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type GetOrdersInput, type Order } from '../schema';
import { eq, desc, and, type SQL } from 'drizzle-orm';

export const getOrders = async (input: GetOrdersInput): Promise<Order[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.status) {
      conditions.push(eq(ordersTable.status, input.status));
    }

    if (input.customer_id) {
      conditions.push(eq(ordersTable.customer_id, input.customer_id));
    }

    // Build the complete query in one go to avoid TypeScript issues
    const baseQuery = db.select().from(ordersTable);
    
    const finalQuery = conditions.length > 0
      ? baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(ordersTable.created_at))
          .limit(input.limit)
          .offset(input.offset)
      : baseQuery
          .orderBy(desc(ordersTable.created_at))
          .limit(input.limit)
          .offset(input.offset);

    const results = await finalQuery.execute();

    // Convert numeric fields back to numbers
    return results.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount),
      tax_amount: parseFloat(order.tax_amount)
    }));
  } catch (error) {
    console.error('Failed to get orders:', error);
    throw error;
  }
};