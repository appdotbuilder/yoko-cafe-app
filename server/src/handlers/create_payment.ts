import { db } from '../db';
import { paymentsTable, ordersTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // First, validate that the order exists and get its total amount
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (orders.length === 0) {
      throw new Error(`Order with ID ${input.order_id} not found`);
    }

    const order = orders[0];
    const orderTotal = parseFloat(order.total_amount);

    // Validate that payment amount matches order total
    if (Math.abs(input.amount - orderTotal) > 0.01) {
      throw new Error(`Payment amount ${input.amount} does not match order total ${orderTotal}`);
    }

    // Simulate payment gateway processing
    let paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';
    let gatewayResponse = null;

    // Simple payment gateway simulation based on payment method
    if (input.payment_method === 'cash') {
      // Cash payments are immediately completed
      paymentStatus = 'completed';
      gatewayResponse = 'Cash payment received';
    } else if (input.payment_method === 'qr_code') {
      // QR code payments are immediately completed
      paymentStatus = 'completed';
      gatewayResponse = 'QR code payment processed successfully';
    } else {
      // Electronic payments start as processing
      paymentStatus = 'processing';
      gatewayResponse = `${input.payment_method} payment initiated`;
    }

    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        order_id: input.order_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_method: input.payment_method,
        payment_status: paymentStatus,
        transaction_id: input.transaction_id,
        payment_gateway_response: gatewayResponse
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};