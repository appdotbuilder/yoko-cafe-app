import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, ordersTable, usersTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test order
  const createTestOrder = async (totalAmount: number = 25.50) => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '555-0123',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create a test order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: userResult[0].id,
        order_number: 'ORD-001',
        status: 'confirmed',
        total_amount: totalAmount.toString(),
        tax_amount: '2.50',
        customer_name: 'Test User',
        customer_phone: '555-0123'
      })
      .returning()
      .execute();

    return orderResult[0];
  };

  it('should create a payment for cash method', async () => {
    const order = await createTestOrder(25.50);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 25.50,
      payment_method: 'cash',
      transaction_id: 'CASH-001'
    };

    const result = await createPayment(testInput);

    // Basic field validation
    expect(result.order_id).toEqual(order.id);
    expect(result.amount).toEqual(25.50);
    expect(typeof result.amount).toBe('number');
    expect(result.payment_method).toEqual('cash');
    expect(result.payment_status).toEqual('completed'); // Cash payments are completed immediately
    expect(result.transaction_id).toEqual('CASH-001');
    expect(result.payment_gateway_response).toEqual('Cash payment received');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a payment for QR code method', async () => {
    const order = await createTestOrder(30.75);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 30.75,
      payment_method: 'qr_code',
      transaction_id: 'QR-123456'
    };

    const result = await createPayment(testInput);

    expect(result.order_id).toEqual(order.id);
    expect(result.amount).toEqual(30.75);
    expect(result.payment_method).toEqual('qr_code');
    expect(result.payment_status).toEqual('completed'); // QR payments are completed immediately
    expect(result.transaction_id).toEqual('QR-123456');
    expect(result.payment_gateway_response).toEqual('QR code payment processed successfully');
  });

  it('should create a payment for electronic payment method', async () => {
    const order = await createTestOrder(15.25);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 15.25,
      payment_method: 'credit_card',
      transaction_id: 'CC-789012'
    };

    const result = await createPayment(testInput);

    expect(result.order_id).toEqual(order.id);
    expect(result.amount).toEqual(15.25);
    expect(result.payment_method).toEqual('credit_card');
    expect(result.payment_status).toEqual('processing'); // Electronic payments start as processing
    expect(result.transaction_id).toEqual('CC-789012');
    expect(result.payment_gateway_response).toEqual('credit_card payment initiated');
  });

  it('should save payment to database', async () => {
    const order = await createTestOrder(42.99);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 42.99,
      payment_method: 'mobile_wallet',
      transaction_id: 'MW-555777'
    };

    const result = await createPayment(testInput);

    // Query the database to verify the payment was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    const savedPayment = payments[0];
    expect(savedPayment.order_id).toEqual(order.id);
    expect(parseFloat(savedPayment.amount)).toEqual(42.99);
    expect(savedPayment.payment_method).toEqual('mobile_wallet');
    expect(savedPayment.payment_status).toEqual('processing');
    expect(savedPayment.transaction_id).toEqual('MW-555777');
    expect(savedPayment.created_at).toBeInstanceOf(Date);
    expect(savedPayment.updated_at).toBeInstanceOf(Date);
  });

  it('should handle payment with null transaction_id', async () => {
    const order = await createTestOrder(18.00);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 18.00,
      payment_method: 'debit_card',
      transaction_id: null
    };

    const result = await createPayment(testInput);

    expect(result.order_id).toEqual(order.id);
    expect(result.amount).toEqual(18.00);
    expect(result.payment_method).toEqual('debit_card');
    expect(result.transaction_id).toBeNull();
    expect(result.payment_status).toEqual('processing');
  });

  it('should throw error when order does not exist', async () => {
    const testInput: CreatePaymentInput = {
      order_id: 99999, // Non-existent order ID
      amount: 25.50,
      payment_method: 'cash',
      transaction_id: 'CASH-001'
    };

    await expect(createPayment(testInput)).rejects.toThrow(/Order with ID 99999 not found/i);
  });

  it('should throw error when payment amount does not match order total', async () => {
    const order = await createTestOrder(25.50);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 30.00, // Different from order total
      payment_method: 'cash',
      transaction_id: 'CASH-001'
    };

    await expect(createPayment(testInput)).rejects.toThrow(/Payment amount 30 does not match order total 25.5/i);
  });

  it('should allow small rounding differences in amount validation', async () => {
    const order = await createTestOrder(25.50);

    const testInput: CreatePaymentInput = {
      order_id: order.id,
      amount: 25.505, // Small rounding difference (within 0.01 tolerance)
      payment_method: 'cash',
      transaction_id: 'CASH-001'
    };

    // Should not throw error due to small rounding difference
    const result = await createPayment(testInput);
    expect(result.amount).toBeCloseTo(25.505, 1); // Database rounds to 2 decimal places, so precision 1
    expect(result.payment_status).toEqual('completed');
  });

  it('should handle different payment methods correctly', async () => {
    const order = await createTestOrder(50.00);

    const paymentMethods = ['credit_card', 'debit_card', 'mobile_wallet'] as const;

    for (const method of paymentMethods) {
      const testInput: CreatePaymentInput = {
        order_id: order.id,
        amount: 50.00,
        payment_method: method,
        transaction_id: `${method.toUpperCase()}-123`
      };

      const result = await createPayment(testInput);

      expect(result.payment_method).toEqual(method);
      expect(result.payment_status).toEqual('processing');
      expect(result.payment_gateway_response).toEqual(`${method} payment initiated`);
    }
  });
});