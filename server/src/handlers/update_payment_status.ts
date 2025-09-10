import { db } from '../db';
import { paymentsTable, ordersTable } from '../db/schema';
import { type UpdatePaymentStatusInput, type Payment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updatePaymentStatus = async (input: UpdatePaymentStatusInput): Promise<Payment> => {
  try {
    // First, verify the payment exists and get current data
    const existingPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, input.id))
      .execute();

    if (existingPayments.length === 0) {
      throw new Error(`Payment with ID ${input.id} not found`);
    }

    const existingPayment = existingPayments[0];

    // Build update object with only provided fields
    const updateData: any = {
      payment_status: input.payment_status,
      updated_at: new Date()
    };

    if (input.transaction_id !== undefined) {
      updateData.transaction_id = input.transaction_id;
    }

    if (input.payment_gateway_response !== undefined) {
      updateData.payment_gateway_response = input.payment_gateway_response;
    }

    // Update the payment record
    const result = await db.update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, input.id))
      .returning()
      .execute();

    const updatedPayment = result[0];

    // If payment is completed successfully, update order status to confirmed
    if (input.payment_status === 'completed') {
      await db.update(ordersTable)
        .set({
          status: 'confirmed',
          updated_at: new Date()
        })
        .where(eq(ordersTable.id, existingPayment.order_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedPayment,
      amount: parseFloat(updatedPayment.amount)
    };
  } catch (error) {
    console.error('Payment status update failed:', error);
    throw error;
  }
};