import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { type GetMenuItemsInput, type MenuItem } from '../schema';
import { eq, and, asc, SQL } from 'drizzle-orm';

export async function getMenuItems(input: GetMenuItemsInput): Promise<MenuItem[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.category_id !== undefined) {
      conditions.push(eq(menuItemsTable.category_id, input.category_id));
    }

    if (input.is_available !== undefined) {
      conditions.push(eq(menuItemsTable.is_available, input.is_available));
    }

    // Build the complete query
    const baseQuery = db.select().from(menuItemsTable);
    
    const finalQuery = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery
      .orderBy(asc(menuItemsTable.sort_order))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields from string to number
    return results.map(item => ({
      ...item,
      base_price: parseFloat(item.base_price)
    }));
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
    throw error;
  }
}