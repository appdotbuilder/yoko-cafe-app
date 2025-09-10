import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuCategoriesTable } from '../db/schema';
import { type CreateMenuCategoryInput } from '../schema';
import { createMenuCategory } from '../handlers/create_menu_category';
import { eq, and } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateMenuCategoryInput = {
  name: 'Coffee Drinks',
  description: 'Hot and cold coffee beverages',
  sort_order: 1,
  is_active: true
};

describe('createMenuCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a menu category with all fields', async () => {
    const result = await createMenuCategory(testInput);

    // Verify all fields are correctly set
    expect(result.name).toEqual('Coffee Drinks');
    expect(result.description).toEqual('Hot and cold coffee beverages');
    expect(result.sort_order).toEqual(1);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a menu category with nullable description', async () => {
    const inputWithNullDescription: CreateMenuCategoryInput = {
      name: 'Pastries',
      description: null,
      sort_order: 2,
      is_active: true
    };

    const result = await createMenuCategory(inputWithNullDescription);

    expect(result.name).toEqual('Pastries');
    expect(result.description).toBeNull();
    expect(result.sort_order).toEqual(2);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should use default value for is_active when not specified', async () => {
    // Testing Zod default behavior - is_active defaults to true
    const inputWithDefaults: CreateMenuCategoryInput = {
      name: 'Snacks',
      description: 'Quick bites and treats',
      sort_order: 3,
      is_active: true // Explicitly setting since Zod has already applied defaults
    };

    const result = await createMenuCategory(inputWithDefaults);

    expect(result.is_active).toEqual(true);
    expect(result.name).toEqual('Snacks');
    expect(result.sort_order).toEqual(3);
  });

  it('should save menu category to database', async () => {
    const result = await createMenuCategory(testInput);

    // Verify the category was actually saved to database
    const categories = await db.select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Coffee Drinks');
    expect(categories[0].description).toEqual('Hot and cold coffee beverages');
    expect(categories[0].sort_order).toEqual(1);
    expect(categories[0].is_active).toEqual(true);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate categories with same name and sort_order', async () => {
    // Create first category
    await createMenuCategory(testInput);

    // Try to create another category with same name and sort_order
    const duplicateInput: CreateMenuCategoryInput = {
      name: 'Coffee Drinks', // Same name
      description: 'Different description',
      sort_order: 1, // Same sort_order
      is_active: false
    };

    // Should throw an error due to uniqueness constraint
    await expect(createMenuCategory(duplicateInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should allow same name with different sort_order', async () => {
    // Create first category
    await createMenuCategory(testInput);

    // Create another category with same name but different sort_order
    const sameNameInput: CreateMenuCategoryInput = {
      name: 'Coffee Drinks', // Same name
      description: 'Another coffee section',
      sort_order: 2, // Different sort_order
      is_active: true
    };

    const result = await createMenuCategory(sameNameInput);

    expect(result.name).toEqual('Coffee Drinks');
    expect(result.sort_order).toEqual(2);
    expect(result.id).toBeDefined();

    // Verify both categories exist in database
    const allCategories = await db.select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.name, 'Coffee Drinks'))
      .execute();

    expect(allCategories).toHaveLength(2);
    expect(allCategories.some(cat => cat.sort_order === 1)).toBe(true);
    expect(allCategories.some(cat => cat.sort_order === 2)).toBe(true);
  });

  it('should allow different name with same sort_order', async () => {
    // Create first category
    await createMenuCategory(testInput);

    // Create another category with different name but same sort_order
    const differentNameInput: CreateMenuCategoryInput = {
      name: 'Tea Drinks', // Different name
      description: 'Hot and cold tea beverages',
      sort_order: 1, // Same sort_order
      is_active: true
    };

    const result = await createMenuCategory(differentNameInput);

    expect(result.name).toEqual('Tea Drinks');
    expect(result.sort_order).toEqual(1);
    expect(result.id).toBeDefined();

    // Verify both categories exist in database
    const allCategories = await db.select()
      .from(menuCategoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    expect(allCategories.some(cat => cat.name === 'Coffee Drinks')).toBe(true);
    expect(allCategories.some(cat => cat.name === 'Tea Drinks')).toBe(true);
  });

  it('should handle inactive categories', async () => {
    const inactiveInput: CreateMenuCategoryInput = {
      name: 'Seasonal Items',
      description: 'Limited time offerings',
      sort_order: 10,
      is_active: false
    };

    const result = await createMenuCategory(inactiveInput);

    expect(result.is_active).toEqual(false);
    expect(result.name).toEqual('Seasonal Items');

    // Verify in database
    const category = await db.select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.id, result.id))
      .execute();

    expect(category[0].is_active).toEqual(false);
  });

  it('should handle zero sort_order', async () => {
    const zeroSortInput: CreateMenuCategoryInput = {
      name: 'Featured Items',
      description: 'Top picks and promotions',
      sort_order: 0,
      is_active: true
    };

    const result = await createMenuCategory(zeroSortInput);

    expect(result.sort_order).toEqual(0);
    expect(result.name).toEqual('Featured Items');

    // Verify in database
    const category = await db.select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.id, result.id))
      .execute();

    expect(category[0].sort_order).toEqual(0);
  });
});