import { db } from '../db';
import { ordersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Order } from '../schema';

export const getOrderById = async (id: number): Promise<Order | null> => {
  try {
    const results = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const order = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...order,
      total_amount: parseFloat(order.total_amount),
      tax_amount: parseFloat(order.tax_amount)
    };
  } catch (error) {
    console.error('Failed to fetch order by ID:', error);
    throw error;
  }
};