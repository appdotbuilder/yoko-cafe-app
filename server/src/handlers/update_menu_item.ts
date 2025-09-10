import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { type UpdateMenuItemInput, type MenuItem } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItem> {
  try {
    // First, check if the menu item exists
    const existingItems = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, input.id))
      .execute();

    if (existingItems.length === 0) {
      throw new Error(`Menu item with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: sql`now()` // Always update the timestamp
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.base_price !== undefined) {
      updateData.base_price = input.base_price.toString(); // Convert number to string for numeric column
    }
    if (input.is_available !== undefined) {
      updateData.is_available = input.is_available;
    }
    if (input.has_size_options !== undefined) {
      updateData.has_size_options = input.has_size_options;
    }
    if (input.has_milk_options !== undefined) {
      updateData.has_milk_options = input.has_milk_options;
    }
    if (input.max_extra_shots !== undefined) {
      updateData.max_extra_shots = input.max_extra_shots;
    }
    if (input.sort_order !== undefined) {
      updateData.sort_order = input.sort_order;
    }
    if (input.image_url !== undefined) {
      updateData.image_url = input.image_url;
    }

    // Perform the update
    const result = await db.update(menuItemsTable)
      .set(updateData)
      .where(eq(menuItemsTable.id, input.id))
      .returning()
      .execute();

    const updatedItem = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...updatedItem,
      base_price: parseFloat(updatedItem.base_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Menu item update failed:', error);
    throw error;
  }
}