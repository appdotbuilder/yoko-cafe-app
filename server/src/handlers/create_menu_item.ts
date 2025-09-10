import { db } from '../db';
import { menuItemsTable, menuCategoriesTable } from '../db/schema';
import { type CreateMenuItemInput, type MenuItem } from '../schema';
import { eq } from 'drizzle-orm';

export const createMenuItem = async (input: CreateMenuItemInput): Promise<MenuItem> => {
  try {
    // Verify that the category exists
    const category = await db.select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.id, input.category_id))
      .execute();

    if (category.length === 0) {
      throw new Error(`Menu category with id ${input.category_id} does not exist`);
    }

    // Insert menu item record
    const result = await db.insert(menuItemsTable)
      .values({
        category_id: input.category_id,
        name: input.name,
        description: input.description,
        base_price: input.base_price.toString(), // Convert number to string for numeric column
        is_available: input.is_available ?? true, // Apply Zod default
        has_size_options: input.has_size_options ?? false, // Apply Zod default
        has_milk_options: input.has_milk_options ?? false, // Apply Zod default
        max_extra_shots: input.max_extra_shots ?? 0, // Apply Zod default
        sort_order: input.sort_order,
        image_url: input.image_url
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const menuItem = result[0];
    return {
      ...menuItem,
      base_price: parseFloat(menuItem.base_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Menu item creation failed:', error);
    throw error;
  }
};