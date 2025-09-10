import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuCategoriesTable, menuItemsTable } from '../db/schema';
import { type GetMenuItemsInput } from '../schema';
import { getMenuItems } from '../handlers/get_menu_items';

describe('getMenuItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test categories
  const createTestCategory = async (name: string, sortOrder: number = 0) => {
    const result = await db.insert(menuCategoriesTable)
      .values({
        name,
        description: `${name} description`,
        sort_order: sortOrder,
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test menu items
  const createTestMenuItem = async (categoryId: number, name: string, options: {
    basePrice?: number;
    isAvailable?: boolean;
    sortOrder?: number;
    hasSizeOptions?: boolean;
    hasMilkOptions?: boolean;
    maxExtraShots?: number;
  } = {}) => {
    const result = await db.insert(menuItemsTable)
      .values({
        category_id: categoryId,
        name,
        description: `${name} description`,
        base_price: (options.basePrice || 5.00).toString(),
        is_available: options.isAvailable ?? true,
        sort_order: options.sortOrder || 0,
        has_size_options: options.hasSizeOptions || false,
        has_milk_options: options.hasMilkOptions || false,
        max_extra_shots: options.maxExtraShots || 0
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return all menu items with default pagination', async () => {
    const category = await createTestCategory('Coffee');
    await createTestMenuItem(category.id, 'Americano', { basePrice: 4.50 });
    await createTestMenuItem(category.id, 'Latte', { basePrice: 5.25 });

    const input: GetMenuItemsInput = { limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Americano');
    expect(result[0].base_price).toEqual(4.50);
    expect(typeof result[0].base_price).toEqual('number');
    expect(result[1].name).toEqual('Latte');
    expect(result[1].base_price).toEqual(5.25);
    expect(typeof result[1].base_price).toEqual('number');
  });

  it('should filter by category_id', async () => {
    const coffeeCategory = await createTestCategory('Coffee');
    const teaCategory = await createTestCategory('Tea');
    
    await createTestMenuItem(coffeeCategory.id, 'Americano');
    await createTestMenuItem(coffeeCategory.id, 'Latte');
    await createTestMenuItem(teaCategory.id, 'Green Tea');

    const input: GetMenuItemsInput = { category_id: coffeeCategory.id, limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(2);
    expect(result.every(item => item.category_id === coffeeCategory.id)).toBe(true);
    expect(result.map(item => item.name)).toEqual(['Americano', 'Latte']);
  });

  it('should filter by is_available', async () => {
    const category = await createTestCategory('Coffee');
    await createTestMenuItem(category.id, 'Available Item', { isAvailable: true });
    await createTestMenuItem(category.id, 'Unavailable Item', { isAvailable: false });

    const input: GetMenuItemsInput = { is_available: true, limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Available Item');
    expect(result[0].is_available).toBe(true);
  });

  it('should filter by both category_id and is_available', async () => {
    const coffeeCategory = await createTestCategory('Coffee');
    const teaCategory = await createTestCategory('Tea');
    
    await createTestMenuItem(coffeeCategory.id, 'Available Coffee', { isAvailable: true });
    await createTestMenuItem(coffeeCategory.id, 'Unavailable Coffee', { isAvailable: false });
    await createTestMenuItem(teaCategory.id, 'Available Tea', { isAvailable: true });

    const input: GetMenuItemsInput = { 
      category_id: coffeeCategory.id, 
      is_available: true,
      limit: 100,
      offset: 0
    };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Available Coffee');
    expect(result[0].category_id).toEqual(coffeeCategory.id);
    expect(result[0].is_available).toBe(true);
  });

  it('should respect sort_order for consistent ordering', async () => {
    const category = await createTestCategory('Coffee');
    await createTestMenuItem(category.id, 'Third Item', { sortOrder: 3 });
    await createTestMenuItem(category.id, 'First Item', { sortOrder: 1 });
    await createTestMenuItem(category.id, 'Second Item', { sortOrder: 2 });

    const input: GetMenuItemsInput = { limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('First Item');
    expect(result[1].name).toEqual('Second Item');
    expect(result[2].name).toEqual('Third Item');
  });

  it('should apply pagination with limit and offset', async () => {
    const category = await createTestCategory('Coffee');
    await createTestMenuItem(category.id, 'Item 1', { sortOrder: 1 });
    await createTestMenuItem(category.id, 'Item 2', { sortOrder: 2 });
    await createTestMenuItem(category.id, 'Item 3', { sortOrder: 3 });
    await createTestMenuItem(category.id, 'Item 4', { sortOrder: 4 });

    const input: GetMenuItemsInput = { limit: 2, offset: 1 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Item 2');
    expect(result[1].name).toEqual('Item 3');
  });

  it('should handle all menu item properties correctly', async () => {
    const category = await createTestCategory('Coffee');
    const menuItem = await createTestMenuItem(category.id, 'Complex Latte', {
      basePrice: 6.75,
      isAvailable: true,
      sortOrder: 5,
      hasSizeOptions: true,
      hasMilkOptions: true,
      maxExtraShots: 3
    });

    const input: GetMenuItemsInput = { limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(1);
    const item = result[0];
    
    expect(item.id).toEqual(menuItem.id);
    expect(item.category_id).toEqual(category.id);
    expect(item.name).toEqual('Complex Latte');
    expect(item.description).toEqual('Complex Latte description');
    expect(item.base_price).toEqual(6.75);
    expect(typeof item.base_price).toEqual('number');
    expect(item.is_available).toBe(true);
    expect(item.has_size_options).toBe(true);
    expect(item.has_milk_options).toBe(true);
    expect(item.max_extra_shots).toEqual(3);
    expect(item.sort_order).toEqual(5);
    expect(item.created_at).toBeInstanceOf(Date);
    expect(item.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no items match filters', async () => {
    const category = await createTestCategory('Coffee');
    await createTestMenuItem(category.id, 'Available Item', { isAvailable: true });

    const input: GetMenuItemsInput = { is_available: false, limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when category has no items', async () => {
    const category = await createTestCategory('Empty Category');
    
    const input: GetMenuItemsInput = { category_id: category.id, limit: 100, offset: 0 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(0);
  });

  it('should handle large offset correctly', async () => {
    const category = await createTestCategory('Coffee');
    await createTestMenuItem(category.id, 'Only Item');

    const input: GetMenuItemsInput = { limit: 10, offset: 100 };
    const result = await getMenuItems(input);

    expect(result).toHaveLength(0);
  });
});