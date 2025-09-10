import { db } from '../db';
import { sizePricingTable, menuItemsTable } from '../db/schema';
import { type CreateSizePricingInput, type SizePricing } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createSizePricing(input: CreateSizePricingInput): Promise<SizePricing> {
  try {
    // Validate that the menu item exists
    const menuItem = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, input.menu_item_id))
      .execute();

    if (menuItem.length === 0) {
      throw new Error(`Menu item with id ${input.menu_item_id} does not exist`);
    }

    // Check if size pricing already exists for this menu item and size combination
    const existingSizePricing = await db.select()
      .from(sizePricingTable)
      .where(and(
        eq(sizePricingTable.menu_item_id, input.menu_item_id),
        eq(sizePricingTable.size, input.size)
      ))
      .execute();

    if (existingSizePricing.length > 0) {
      throw new Error(`Size pricing for ${input.size} already exists for menu item ${input.menu_item_id}`);
    }

    // Insert size pricing record
    const result = await db.insert(sizePricingTable)
      .values({
        menu_item_id: input.menu_item_id,
        size: input.size,
        price_modifier: input.price_modifier.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const sizePricing = result[0];
    return {
      ...sizePricing,
      price_modifier: parseFloat(sizePricing.price_modifier) // Convert string back to number
    };
  } catch (error) {
    console.error('Size pricing creation failed:', error);
    throw error;
  }
}