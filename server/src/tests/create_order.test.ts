import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, orderItemsTable, menuCategoriesTable, menuItemsTable, sizePricingTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let categoryId: number;
  let menuItemId: number;
  let menuItemWithSizesId: number;

  beforeEach(async () => {
    // Create test menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();
    
    categoryId = categoryResult[0].id;

    // Create basic menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Test Coffee',
        description: 'A test coffee item',
        base_price: '5.00',
        is_available: true,
        has_size_options: false,
        has_milk_options: true,
        max_extra_shots: 3,
        sort_order: 1
      })
      .returning()
      .execute();

    menuItemId = menuItemResult[0].id;

    // Create menu item with size options
    const menuItemWithSizesResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Test Latte',
        description: 'A test latte with sizes',
        base_price: '4.50',
        is_available: true,
        has_size_options: true,
        has_milk_options: true,
        max_extra_shots: 2,
        sort_order: 2
      })
      .returning()
      .execute();

    menuItemWithSizesId = menuItemWithSizesResult[0].id;

    // Create size pricing for the latte
    await db.insert(sizePricingTable)
      .values([
        {
          menu_item_id: menuItemWithSizesId,
          size: 'small',
          price_modifier: '0.00'
        },
        {
          menu_item_id: menuItemWithSizesId,
          size: 'medium',
          price_modifier: '1.00'
        },
        {
          menu_item_id: menuItemWithSizesId,
          size: 'large',
          price_modifier: '2.00'
        }
      ])
      .execute();
  });

  const basicOrderInput: CreateOrderInput = {
    customer_name: 'John Doe',
    customer_phone: '+1234567890',
    items: [
      {
        menu_item_id: 0, // Will be set in tests
        quantity: 1,
        size: null,
        milk_type: 'oat',
        extra_shots: 0,
        special_instructions: null
      }
    ],
    special_instructions: 'Please make it hot',
    payment_method: 'credit_card'
  };

  it('should create a simple order successfully', async () => {
    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemId
        }
      ]
    };

    const result = await createOrder(input);

    // Verify order fields
    expect(result.id).toBeDefined();
    expect(result.order_number).toMatch(/^YC\d+$/);
    expect(result.status).toEqual('pending');
    expect(result.customer_name).toEqual('John Doe');
    expect(result.customer_phone).toEqual('+1234567890');
    expect(result.special_instructions).toEqual('Please make it hot');
    expect(result.customer_id).toBeNull();
    expect(result.estimated_ready_time).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify price calculations (5.00 base price, 10% tax)
    expect(result.total_amount).toEqual(5.50); // 5.00 + 0.50 tax
    expect(result.tax_amount).toEqual(0.50);
    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.tax_amount).toBe('number');
  });

  it('should save order and order items to database', async () => {
    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemId,
          quantity: 2
        }
      ]
    };

    const result = await createOrder(input);

    // Verify order was saved
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].order_number).toEqual(result.order_number);
    expect(parseFloat(orders[0].total_amount)).toEqual(11.00); // (5.00 * 2) + (1.00 tax)

    // Verify order items were saved
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].menu_item_id).toEqual(menuItemId);
    expect(orderItems[0].quantity).toEqual(2);
    expect(orderItems[0].milk_type).toEqual('oat');
    expect(parseFloat(orderItems[0].unit_price)).toEqual(5.00);
    expect(parseFloat(orderItems[0].total_price)).toEqual(10.00);
  });

  it('should handle multiple items correctly', async () => {
    const input: CreateOrderInput = {
      ...basicOrderInput,
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 1,
          size: null,
          milk_type: 'oat',
          extra_shots: 0,
          special_instructions: null
        },
        {
          menu_item_id: menuItemWithSizesId,
          quantity: 2,
          size: 'large',
          milk_type: 'almond',
          extra_shots: 1,
          special_instructions: 'Extra hot'
        }
      ]
    };

    const result = await createOrder(input);

    // Calculate expected total:
    // Item 1: 5.00 * 1 = 5.00
    // Item 2: (4.50 + 2.00 size + 0.75 extra shot) * 2 = 7.25 * 2 = 14.50
    // Subtotal: 19.50, Tax: 1.95, Total: 21.45
    expect(result.total_amount).toEqual(21.45);
    expect(result.tax_amount).toEqual(1.95);

    // Verify both order items were saved
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);
    
    const item1 = orderItems.find(item => item.menu_item_id === menuItemId);
    const item2 = orderItems.find(item => item.menu_item_id === menuItemWithSizesId);

    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(1);
    expect(parseFloat(item1!.unit_price)).toEqual(5.00);
    
    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(2);
    expect(item2!.size).toEqual('large');
    expect(item2!.extra_shots).toEqual(1);
    expect(parseFloat(item2!.unit_price)).toEqual(7.25); // 4.50 + 2.00 + 0.75
    expect(parseFloat(item2!.total_price)).toEqual(14.50);
  });

  it('should calculate size modifiers correctly', async () => {
    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemWithSizesId,
          size: 'medium' as const,
          quantity: 1
        }
      ]
    };

    const result = await createOrder(input);

    // Expected: 4.50 base + 1.00 medium modifier = 5.50, tax = 0.55, total = 6.05
    expect(result.total_amount).toEqual(6.05);
    expect(result.tax_amount).toEqual(0.55);
  });

  it('should calculate extra shots pricing correctly', async () => {
    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemId,
          extra_shots: 2,
          quantity: 1
        }
      ]
    };

    const result = await createOrder(input);

    // Expected: 5.00 base + (2 * 0.75) extra shots = 6.50, tax = 0.65, total = 7.15
    expect(result.total_amount).toEqual(7.15);
    expect(result.tax_amount).toEqual(0.65);
  });

  it('should handle guest orders with minimal customer info', async () => {
    const input: CreateOrderInput = {
      customer_name: null,
      customer_phone: null,
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 1,
          size: null,
          milk_type: null,
          extra_shots: 0,
          special_instructions: null
        }
      ],
      special_instructions: null,
      payment_method: 'cash'
    };

    const result = await createOrder(input);

    expect(result.customer_name).toBeNull();
    expect(result.customer_phone).toBeNull();
    expect(result.special_instructions).toBeNull();
    expect(result.total_amount).toEqual(5.50); // 5.00 + 0.50 tax
  });

  it('should reject order for non-existent menu item', async () => {
    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: 99999 // Non-existent ID
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/Menu item with id 99999 not found/i);
  });

  it('should reject order for unavailable menu item', async () => {
    // Create unavailable menu item
    const unavailableItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Unavailable Item',
        base_price: '3.00',
        is_available: false,
        sort_order: 3
      })
      .returning()
      .execute();

    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: unavailableItemResult[0].id
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/not available/i);
  });

  it('should reject order with too many extra shots', async () => {
    const input = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemId,
          extra_shots: 5 // Max is 3
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/Maximum 3 extra shots allowed/i);
  });

  it('should generate unique order numbers', async () => {
    const input1 = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemId
        }
      ]
    };

    const input2 = {
      ...basicOrderInput,
      items: [
        {
          ...basicOrderInput.items[0],
          menu_item_id: menuItemId
        }
      ]
    };

    const result1 = await createOrder(input1);
    const result2 = await createOrder(input2);

    expect(result1.order_number).not.toEqual(result2.order_number);
    expect(result1.order_number).toMatch(/^YC\d+$/);
    expect(result2.order_number).toMatch(/^YC\d+$/);
  });
});