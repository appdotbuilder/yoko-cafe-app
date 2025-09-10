import { db } from '../db';
import { menuCategoriesTable } from '../db/schema';
import { type MenuCategory } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getMenuCategories = async (): Promise<MenuCategory[]> => {
  try {
    // Fetch only active menu categories ordered by sort_order
    const results = await db.select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.is_active, true))
      .orderBy(asc(menuCategoriesTable.sort_order))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch menu categories:', error);
    throw error;
  }
};