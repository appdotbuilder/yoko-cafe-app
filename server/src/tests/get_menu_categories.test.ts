import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuCategoriesTable } from '../db/schema';
import { getMenuCategories } from '../handlers/get_menu_categories';

describe('getMenuCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getMenuCategories();
    expect(result).toEqual([]);
  });

  it('should return only active categories', async () => {
    // Create test categories - both active and inactive
    await db.insert(menuCategoriesTable)
      .values([
        {
          name: 'Coffee',
          description: 'Fresh coffee drinks',
          sort_order: 1,
          is_active: true
        },
        {
          name: 'Inactive Category',
          description: 'This should not appear',
          sort_order: 2,
          is_active: false
        },
        {
          name: 'Tea',
          description: 'Hot and cold teas',
          sort_order: 3,
          is_active: true
        }
      ])
      .execute();

    const result = await getMenuCategories();

    // Should only return active categories
    expect(result).toHaveLength(2);
    expect(result.every(category => category.is_active === true)).toBe(true);
    expect(result.map(cat => cat.name)).toEqual(['Coffee', 'Tea']);
  });

  it('should return categories ordered by sort_order', async () => {
    // Insert categories in reverse sort order to test ordering
    await db.insert(menuCategoriesTable)
      .values([
        {
          name: 'Pastries',
          description: 'Baked goods',
          sort_order: 3,
          is_active: true
        },
        {
          name: 'Coffee',
          description: 'Coffee drinks',
          sort_order: 1,
          is_active: true
        },
        {
          name: 'Tea',
          description: 'Tea beverages',
          sort_order: 2,
          is_active: true
        }
      ])
      .execute();

    const result = await getMenuCategories();

    expect(result).toHaveLength(3);
    // Should be ordered by sort_order (1, 2, 3)
    expect(result[0].name).toEqual('Coffee');
    expect(result[0].sort_order).toEqual(1);
    expect(result[1].name).toEqual('Tea');
    expect(result[1].sort_order).toEqual(2);
    expect(result[2].name).toEqual('Pastries');
    expect(result[2].sort_order).toEqual(3);
  });

  it('should return all required category fields', async () => {
    await db.insert(menuCategoriesTable)
      .values({
        name: 'Coffee',
        description: 'Fresh coffee beverages',
        sort_order: 1,
        is_active: true
      })
      .execute();

    const result = await getMenuCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify all fields are present and correct types
    expect(category.id).toBeDefined();
    expect(typeof category.id).toBe('number');
    expect(category.name).toEqual('Coffee');
    expect(category.description).toEqual('Fresh coffee beverages');
    expect(category.sort_order).toEqual(1);
    expect(category.is_active).toBe(true);
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should handle null descriptions correctly', async () => {
    await db.insert(menuCategoriesTable)
      .values({
        name: 'Simple Category',
        description: null,
        sort_order: 1,
        is_active: true
      })
      .execute();

    const result = await getMenuCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Simple Category');
    expect(result[0].description).toBeNull();
  });

  it('should handle categories with same sort_order', async () => {
    // Create categories with same sort_order to test stable ordering
    await db.insert(menuCategoriesTable)
      .values([
        {
          name: 'Category A',
          description: 'First category',
          sort_order: 1,
          is_active: true
        },
        {
          name: 'Category B',
          description: 'Second category',
          sort_order: 1,
          is_active: true
        }
      ])
      .execute();

    const result = await getMenuCategories();

    expect(result).toHaveLength(2);
    // Both should have sort_order 1
    expect(result.every(cat => cat.sort_order === 1)).toBe(true);
    // Should return both categories
    const names = result.map(cat => cat.name).sort();
    expect(names).toEqual(['Category A', 'Category B']);
  });
});