import { db } from '../db';
import { ordersTable, orderItemsTable, menuItemsTable, sizePricingTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

const TAX_RATE = 0.1; // 10% tax rate
const EXTRA_SHOT_PRICE = 0.75; // Price per extra shot

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  try {
    // Generate unique order number (timestamp-based for simplicity)
    const orderNumber = `YC${Date.now()}`;
    
    let subtotal = 0;
    const orderItemsData = [];

    // Calculate totals for each item
    for (const item of input.items) {
      // Get menu item details
      const menuItems = await db.select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.id, item.menu_item_id))
        .execute();

      if (menuItems.length === 0) {
        throw new Error(`Menu item with id ${item.menu_item_id} not found`);
      }

      const menuItem = menuItems[0];
      if (!menuItem.is_available) {
        throw new Error(`Menu item "${menuItem.name}" is not available`);
      }

      let unitPrice = parseFloat(menuItem.base_price);

      // Add size modifier if applicable
      if (item.size && menuItem.has_size_options) {
        const sizePricingResults = await db.select()
          .from(sizePricingTable)
          .where(eq(sizePricingTable.menu_item_id, item.menu_item_id))
          .execute();

        const sizeModifier = sizePricingResults.find(sp => sp.size === item.size);
        if (sizeModifier) {
          unitPrice += parseFloat(sizeModifier.price_modifier);
        }
      }

      // Add extra shots pricing
      if (item.extra_shots > 0) {
        if (item.extra_shots > menuItem.max_extra_shots) {
          throw new Error(`Maximum ${menuItem.max_extra_shots} extra shots allowed for "${menuItem.name}"`);
        }
        unitPrice += (item.extra_shots * EXTRA_SHOT_PRICE);
      }

      const totalItemPrice = unitPrice * item.quantity;
      subtotal += totalItemPrice;

      orderItemsData.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        size: item.size,
        milk_type: item.milk_type,
        extra_shots: item.extra_shots,
        unit_price: unitPrice.toString(), // Convert to string for numeric column
        total_price: totalItemPrice.toString(), // Convert to string for numeric column
        special_instructions: item.special_instructions
      });
    }

    const taxAmount = subtotal * TAX_RATE;
    const totalAmount = subtotal + taxAmount;

    // Create the order
    const orderResult = await db.insert(ordersTable)
      .values({
        order_number: orderNumber,
        status: 'pending',
        total_amount: totalAmount.toString(), // Convert to string for numeric column
        tax_amount: taxAmount.toString(), // Convert to string for numeric column
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        special_instructions: input.special_instructions
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    const orderItemsWithOrderId = orderItemsData.map(item => ({
      ...item,
      order_id: order.id
    }));

    await db.insert(orderItemsTable)
      .values(orderItemsWithOrderId)
      .execute();

    // Return order with converted numeric fields
    return {
      ...order,
      total_amount: parseFloat(order.total_amount), // Convert string back to number
      tax_amount: parseFloat(order.tax_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};