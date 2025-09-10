import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrderStatus = async (input: UpdateOrderStatusInput): Promise<Order> => {
  try {
    // First check if the order exists
    const existingOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.id))
      .execute();

    if (existingOrder.length === 0) {
      throw new Error(`Order with id ${input.id} not found`);
    }

    // Update the order with new status and optionally estimated_ready_time
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Only update estimated_ready_time if it's provided in the input
    if (input.estimated_ready_time !== undefined) {
      updateData.estimated_ready_time = input.estimated_ready_time;
    }

    const result = await db.update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const updatedOrder = result[0];
    return {
      ...updatedOrder,
      total_amount: parseFloat(updatedOrder.total_amount),
      tax_amount: parseFloat(updatedOrder.tax_amount)
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
};