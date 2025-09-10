import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuCategoriesTable, menuItemsTable } from '../db/schema';
import { type UpdateMenuItemInput, type CreateMenuCategoryInput } from '../schema';
import { updateMenuItem } from '../handlers/update_menu_item';
import { eq } from 'drizzle-orm';

// Test data
const testCategory: CreateMenuCategoryInput = {
  name: 'Coffee',
  description: 'Hot coffee beverages',
  sort_order: 1,
  is_active: true
};

const createTestMenuItem = async (categoryId: number) => {
  const result = await db.insert(menuItemsTable)
    .values({
      category_id: categoryId,
      name: 'Americano',
      description: 'Rich espresso with hot water',
      base_price: '4.50',
      is_available: true,
      has_size_options: true,
      has_milk_options: false,
      max_extra_shots: 3,
      sort_order: 1,
      image_url: 'americano.jpg'
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    base_price: parseFloat(result[0].base_price)
  };
};

describe('updateMenuItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update menu item with all fields', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);

    // Update input with all possible fields
    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'Premium Americano',
      description: 'Premium espresso with filtered hot water',
      base_price: 5.25,
      is_available: false,
      has_size_options: false,
      has_milk_options: true,
      max_extra_shots: 5,
      sort_order: 2,
      image_url: 'premium-americano.jpg'
    };

    const result = await updateMenuItem(updateInput);

    // Verify all fields are updated
    expect(result.id).toBe(menuItem.id);
    expect(result.category_id).toBe(category.id);
    expect(result.name).toBe('Premium Americano');
    expect(result.description).toBe('Premium espresso with filtered hot water');
    expect(result.base_price).toBe(5.25);
    expect(typeof result.base_price).toBe('number');
    expect(result.is_available).toBe(false);
    expect(result.has_size_options).toBe(false);
    expect(result.has_milk_options).toBe(true);
    expect(result.max_extra_shots).toBe(5);
    expect(result.sort_order).toBe(2);
    expect(result.image_url).toBe('premium-americano.jpg');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update only specified fields', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);

    // Update only name and price
    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'Updated Americano',
      base_price: 4.75
    };

    const result = await updateMenuItem(updateInput);

    // Verify only specified fields are updated, others remain unchanged
    expect(result.name).toBe('Updated Americano');
    expect(result.base_price).toBe(4.75);
    expect(result.description).toBe('Rich espresso with hot water'); // Unchanged
    expect(result.is_available).toBe(true); // Unchanged
    expect(result.has_size_options).toBe(true); // Unchanged
    expect(result.has_milk_options).toBe(false); // Unchanged
    expect(result.max_extra_shots).toBe(3); // Unchanged
    expect(result.sort_order).toBe(1); // Unchanged
    expect(result.image_url).toBe('americano.jpg'); // Unchanged
  });

  it('should update nullable fields to null', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);

    // Update nullable fields to null
    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      description: null,
      image_url: null
    };

    const result = await updateMenuItem(updateInput);

    // Verify nullable fields are set to null
    expect(result.description).toBe(null);
    expect(result.image_url).toBe(null);
    expect(result.name).toBe('Americano'); // Unchanged
  });

  it('should save updated data to database', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'Database Test Americano',
      base_price: 6.00
    };

    await updateMenuItem(updateInput);

    // Query database directly to verify changes
    const dbResult = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItem.id))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(dbResult[0].name).toBe('Database Test Americano');
    expect(parseFloat(dbResult[0].base_price)).toBe(6.00);
  });

  it('should update updated_at timestamp', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);
    const originalUpdatedAt = menuItem.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'Timestamp Test'
    };

    const result = await updateMenuItem(updateInput);

    // Verify updated_at is newer than original
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent menu item', async () => {
    const updateInput: UpdateMenuItemInput = {
      id: 99999,
      name: 'Non-existent Item'
    };

    await expect(updateMenuItem(updateInput))
      .rejects.toThrow(/Menu item with id 99999 not found/i);
  });

  it('should handle boolean fields correctly', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);

    // Update boolean fields
    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      is_available: false,
      has_size_options: false,
      has_milk_options: true
    };

    const result = await updateMenuItem(updateInput);

    // Verify boolean fields
    expect(result.is_available).toBe(false);
    expect(result.has_size_options).toBe(false);
    expect(result.has_milk_options).toBe(true);
  });

  it('should handle integer fields correctly', async () => {
    // Create test category
    const categoryResult = await db.insert(menuCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test menu item
    const menuItem = await createTestMenuItem(category.id);

    // Update integer fields
    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      max_extra_shots: 0,
      sort_order: 10
    };

    const result = await updateMenuItem(updateInput);

    // Verify integer fields
    expect(result.max_extra_shots).toBe(0);
    expect(result.sort_order).toBe(10);
  });
});