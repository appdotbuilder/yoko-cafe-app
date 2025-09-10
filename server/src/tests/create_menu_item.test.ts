import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuItemsTable, menuCategoriesTable } from '../db/schema';
import { type CreateMenuItemInput, type CreateMenuCategoryInput } from '../schema';
import { createMenuItem } from '../handlers/create_menu_item';
import { eq } from 'drizzle-orm';

// Test data
const testCategory: CreateMenuCategoryInput = {
  name: 'Coffee',
  description: 'Hot coffee beverages',
  sort_order: 1,
  is_active: true
};

const testInput: CreateMenuItemInput = {
  category_id: 1, // Will be set after category creation
  name: 'Espresso',
  description: 'Strong coffee shot',
  base_price: 2.50,
  is_available: true,
  has_size_options: false,
  has_milk_options: false,
  max_extra_shots: 2,
  sort_order: 1,
  image_url: 'https://example.com/espresso.jpg'
};

describe('createMenuItem', () => {
  let categoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test category first
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    categoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  it('should create a menu item with all fields', async () => {
    const input = { ...testInput, category_id: categoryId };
    const result = await createMenuItem(input);

    // Verify all fields are set correctly
    expect(result.id).toBeDefined();
    expect(result.category_id).toEqual(categoryId);
    expect(result.name).toEqual('Espresso');
    expect(result.description).toEqual('Strong coffee shot');
    expect(result.base_price).toEqual(2.50);
    expect(typeof result.base_price).toBe('number');
    expect(result.is_available).toBe(true);
    expect(result.has_size_options).toBe(false);
    expect(result.has_milk_options).toBe(false);
    expect(result.max_extra_shots).toEqual(2);
    expect(result.sort_order).toEqual(1);
    expect(result.image_url).toEqual('https://example.com/espresso.jpg');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save menu item to database', async () => {
    const input = { ...testInput, category_id: categoryId };
    const result = await createMenuItem(input);

    // Query the database to verify the menu item was saved
    const menuItems = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, result.id))
      .execute();

    expect(menuItems).toHaveLength(1);
    const savedItem = menuItems[0];
    expect(savedItem.name).toEqual('Espresso');
    expect(savedItem.category_id).toEqual(categoryId);
    expect(parseFloat(savedItem.base_price)).toEqual(2.50);
    expect(savedItem.is_available).toBe(true);
    expect(savedItem.created_at).toBeInstanceOf(Date);
    expect(savedItem.updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    const inputWithNulls: CreateMenuItemInput = {
      category_id: categoryId,
      name: 'Simple Coffee',
      description: null,
      base_price: 3.00,
      is_available: true,
      has_size_options: false,
      has_milk_options: false,
      max_extra_shots: 0,
      sort_order: 2,
      image_url: null
    };

    const result = await createMenuItem(inputWithNulls);

    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
    expect(result.name).toEqual('Simple Coffee');
    expect(result.base_price).toEqual(3.00);
  });

  it('should apply default values from Zod schema', async () => {
    const minimalInput = {
      category_id: categoryId,
      name: 'Basic Item',
      description: null,
      base_price: 1.50,
      sort_order: 0,
      image_url: null
    } as CreateMenuItemInput;

    const result = await createMenuItem(minimalInput);

    // Check that defaults were applied
    expect(result.is_available).toBe(true);
    expect(result.has_size_options).toBe(false);
    expect(result.has_milk_options).toBe(false);
    expect(result.max_extra_shots).toEqual(0);
  });

  it('should handle decimal prices correctly', async () => {
    const input = {
      ...testInput,
      category_id: categoryId,
      base_price: 4.99
    };

    const result = await createMenuItem(input);

    expect(result.base_price).toEqual(4.99);
    expect(typeof result.base_price).toBe('number');

    // Verify in database
    const menuItems = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, result.id))
      .execute();

    expect(parseFloat(menuItems[0].base_price)).toEqual(4.99);
  });

  it('should throw error when category does not exist', async () => {
    const input = { ...testInput, category_id: 99999 };

    await expect(createMenuItem(input)).rejects.toThrow(/Menu category with id 99999 does not exist/i);
  });

  it('should create items with size and milk options enabled', async () => {
    const input: CreateMenuItemInput = {
      category_id: categoryId,
      name: 'Customizable Latte',
      description: 'Latte with size and milk options',
      base_price: 4.50,
      is_available: true,
      has_size_options: true,
      has_milk_options: true,
      max_extra_shots: 3,
      sort_order: 5,
      image_url: null
    };

    const result = await createMenuItem(input);

    expect(result.has_size_options).toBe(true);
    expect(result.has_milk_options).toBe(true);
    expect(result.max_extra_shots).toEqual(3);
    expect(result.name).toEqual('Customizable Latte');
  });

  it('should handle zero values correctly', async () => {
    const input: CreateMenuItemInput = {
      category_id: categoryId,
      name: 'Free Sample',
      description: 'Free coffee sample',
      base_price: 0.01, // Minimum positive price
      is_available: true,
      has_size_options: false,
      has_milk_options: false,
      max_extra_shots: 0,
      sort_order: 0,
      image_url: null
    };

    const result = await createMenuItem(input);

    expect(result.base_price).toEqual(0.01);
    expect(result.max_extra_shots).toEqual(0);
    expect(result.sort_order).toEqual(0);
  });
});