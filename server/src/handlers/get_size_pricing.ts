import { db } from '../db';
import { sizePricingTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SizePricing } from '../schema';

export const getSizePricing = async (menuItemId: number): Promise<SizePricing[]> => {
  try {
    const results = await db.select()
      .from(sizePricingTable)
      .where(eq(sizePricingTable.menu_item_id, menuItemId))
      .execute();

    // Convert numeric price_modifier fields back to numbers
    return results.map(pricing => ({
      ...pricing,
      price_modifier: parseFloat(pricing.price_modifier)
    }));
  } catch (error) {
    console.error('Failed to fetch size pricing:', error);
    throw error;
  }
};