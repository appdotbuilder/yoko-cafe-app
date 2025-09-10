import { db } from '../db';
import { menuCategoriesTable } from '../db/schema';
import { type CreateMenuCategoryInput, type MenuCategory } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createMenuCategory = async (input: CreateMenuCategoryInput): Promise<MenuCategory> => {
  try {
    // Check for existing category with same name and sort_order to ensure uniqueness
    const existingCategory = await db.select()
      .from(menuCategoriesTable)
      .where(
        and(
          eq(menuCategoriesTable.name, input.name),
          eq(menuCategoriesTable.sort_order, input.sort_order)
        )
      )
      .execute();

    if (existingCategory.length > 0) {
      throw new Error(`Menu category with name "${input.name}" and sort order ${input.sort_order} already exists`);
    }

    // Insert menu category record
    const result = await db.insert(menuCategoriesTable)
      .values({
        name: input.name,
        description: input.description,
        sort_order: input.sort_order,
        is_active: input.is_active // This already has a default from Zod
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Menu category creation failed:', error);
    throw error;
  }
};