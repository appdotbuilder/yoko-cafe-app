import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sizePricingTable, menuItemsTable, menuCategoriesTable } from '../db/schema';
import { type CreateSizePricingInput } from '../schema';
import { createSizePricing } from '../handlers/create_size_pricing';
import { eq, and } from 'drizzle-orm';

describe('createSizePricing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create size pricing for a menu item', async () => {
    // Create prerequisite menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Beverages',
        description: 'Hot and cold drinks',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create prerequisite menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Latte',
        description: 'Espresso with steamed milk',
        base_price: '4.50',
        is_available: true,
        has_size_options: true,
        has_milk_options: true,
        max_extra_shots: 3,
        sort_order: 1,
        image_url: null
      })
      .returning()
      .execute();

    const menuItemId = menuItemResult[0].id;

    const testInput: CreateSizePricingInput = {
      menu_item_id: menuItemId,
      size: 'large',
      price_modifier: 1.50
    };

    const result = await createSizePricing(testInput);

    // Basic field validation
    expect(result.menu_item_id).toEqual(menuItemId);
    expect(result.size).toEqual('large');
    expect(result.price_modifier).toEqual(1.50);
    expect(typeof result.price_modifier).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save size pricing to database', async () => {
    // Create prerequisite menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Beverages',
        description: 'Hot and cold drinks',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create prerequisite menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Cappuccino',
        description: 'Espresso with foamed milk',
        base_price: '4.25',
        is_available: true,
        has_size_options: true,
        has_milk_options: true,
        max_extra_shots: 2,
        sort_order: 2,
        image_url: null
      })
      .returning()
      .execute();

    const menuItemId = menuItemResult[0].id;

    const testInput: CreateSizePricingInput = {
      menu_item_id: menuItemId,
      size: 'medium',
      price_modifier: 0.75
    };

    const result = await createSizePricing(testInput);

    // Query database to verify size pricing was saved
    const sizePricings = await db.select()
      .from(sizePricingTable)
      .where(eq(sizePricingTable.id, result.id))
      .execute();

    expect(sizePricings).toHaveLength(1);
    expect(sizePricings[0].menu_item_id).toEqual(menuItemId);
    expect(sizePricings[0].size).toEqual('medium');
    expect(parseFloat(sizePricings[0].price_modifier)).toEqual(0.75);
    expect(sizePricings[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when menu item does not exist', async () => {
    const testInput: CreateSizePricingInput = {
      menu_item_id: 99999, // Non-existent menu item ID
      size: 'small',
      price_modifier: -0.50
    };

    await expect(createSizePricing(testInput)).rejects.toThrow(/menu item with id 99999 does not exist/i);
  });

  it('should throw error when size pricing already exists for menu item and size combination', async () => {
    // Create prerequisite menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Beverages',
        description: 'Hot and cold drinks',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create prerequisite menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Americano',
        description: 'Espresso with hot water',
        base_price: '3.75',
        is_available: true,
        has_size_options: true,
        has_milk_options: false,
        max_extra_shots: 2,
        sort_order: 3,
        image_url: null
      })
      .returning()
      .execute();

    const menuItemId = menuItemResult[0].id;

    // Create initial size pricing
    await db.insert(sizePricingTable)
      .values({
        menu_item_id: menuItemId,
        size: 'large',
        price_modifier: '1.25'
      })
      .execute();

    const testInput: CreateSizePricingInput = {
      menu_item_id: menuItemId,
      size: 'large', // Same size as existing record
      price_modifier: 1.00
    };

    await expect(createSizePricing(testInput)).rejects.toThrow(/size pricing for large already exists for menu item/i);
  });

  it('should handle negative price modifiers correctly', async () => {
    // Create prerequisite menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Beverages',
        description: 'Hot and cold drinks',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create prerequisite menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Espresso',
        description: 'Strong coffee shot',
        base_price: '2.50',
        is_available: true,
        has_size_options: true,
        has_milk_options: false,
        max_extra_shots: 1,
        sort_order: 4,
        image_url: null
      })
      .returning()
      .execute();

    const menuItemId = menuItemResult[0].id;

    const testInput: CreateSizePricingInput = {
      menu_item_id: menuItemId,
      size: 'small',
      price_modifier: -0.25 // Discount for smaller size
    };

    const result = await createSizePricing(testInput);

    expect(result.price_modifier).toEqual(-0.25);
    expect(typeof result.price_modifier).toBe('number');

    // Verify in database
    const sizePricings = await db.select()
      .from(sizePricingTable)
      .where(eq(sizePricingTable.id, result.id))
      .execute();

    expect(parseFloat(sizePricings[0].price_modifier)).toEqual(-0.25);
  });

  it('should create multiple size pricings for the same menu item with different sizes', async () => {
    // Create prerequisite menu category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values({
        name: 'Beverages',
        description: 'Hot and cold drinks',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create prerequisite menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name: 'Mocha',
        description: 'Chocolate espresso drink',
        base_price: '5.00',
        is_available: true,
        has_size_options: true,
        has_milk_options: true,
        max_extra_shots: 3,
        sort_order: 5,
        image_url: null
      })
      .returning()
      .execute();

    const menuItemId = menuItemResult[0].id;

    // Create small size pricing
    const smallSizePricing = await createSizePricing({
      menu_item_id: menuItemId,
      size: 'small',
      price_modifier: -0.50
    });

    // Create large size pricing
    const largeSizePricing = await createSizePricing({
      menu_item_id: menuItemId,
      size: 'large',
      price_modifier: 1.25
    });

    expect(smallSizePricing.size).toEqual('small');
    expect(smallSizePricing.price_modifier).toEqual(-0.50);
    expect(largeSizePricing.size).toEqual('large');
    expect(largeSizePricing.price_modifier).toEqual(1.25);

    // Verify both records exist in database
    const allSizePricings = await db.select()
      .from(sizePricingTable)
      .where(eq(sizePricingTable.menu_item_id, menuItemId))
      .execute();

    expect(allSizePricings).toHaveLength(2);
  });
});