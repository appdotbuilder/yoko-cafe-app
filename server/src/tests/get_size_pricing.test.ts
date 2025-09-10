import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuCategoriesTable, menuItemsTable, sizePricingTable } from '../db/schema';
import { getSizePricing } from '../handlers/get_size_pricing';

describe('getSizePricing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return size pricing for a menu item', async () => {
    // Create prerequisite data
    const [category] = await db.insert(menuCategoriesTable)
      .values({
        name: 'Coffee',
        description: 'Coffee drinks',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const [menuItem] = await db.insert(menuItemsTable)
      .values({
        category_id: category.id,
        name: 'Latte',
        description: 'Milk coffee drink',
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

    // Create size pricing records
    await db.insert(sizePricingTable)
      .values([
        {
          menu_item_id: menuItem.id,
          size: 'small',
          price_modifier: '-0.50'
        },
        {
          menu_item_id: menuItem.id,
          size: 'medium',
          price_modifier: '0.00'
        },
        {
          menu_item_id: menuItem.id,
          size: 'large',
          price_modifier: '0.75'
        }
      ])
      .execute();

    const result = await getSizePricing(menuItem.id);

    expect(result).toHaveLength(3);
    expect(result[0].menu_item_id).toBe(menuItem.id);
    expect(result[0].size).toBe('small');
    expect(result[0].price_modifier).toBe(-0.50);
    expect(typeof result[0].price_modifier).toBe('number');

    expect(result[1].size).toBe('medium');
    expect(result[1].price_modifier).toBe(0.00);
    expect(typeof result[1].price_modifier).toBe('number');

    expect(result[2].size).toBe('large');
    expect(result[2].price_modifier).toBe(0.75);
    expect(typeof result[2].price_modifier).toBe('number');

    // Verify all results have required fields
    result.forEach(pricing => {
      expect(pricing.id).toBeDefined();
      expect(pricing.menu_item_id).toBe(menuItem.id);
      expect(pricing.size).toBeDefined();
      expect(pricing.price_modifier).toBeDefined();
      expect(pricing.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for menu item with no size options', async () => {
    // Create prerequisite data
    const [category] = await db.insert(menuCategoriesTable)
      .values({
        name: 'Pastries',
        description: 'Baked goods',
        sort_order: 2,
        is_active: true
      })
      .returning()
      .execute();

    const [menuItem] = await db.insert(menuItemsTable)
      .values({
        category_id: category.id,
        name: 'Croissant',
        description: 'Buttery pastry',
        base_price: '3.25',
        is_available: true,
        has_size_options: false,
        has_milk_options: false,
        max_extra_shots: 0,
        sort_order: 1,
        image_url: null
      })
      .returning()
      .execute();

    const result = await getSizePricing(menuItem.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent menu item', async () => {
    const result = await getSizePricing(99999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle partial size options', async () => {
    // Create prerequisite data
    const [category] = await db.insert(menuCategoriesTable)
      .values({
        name: 'Tea',
        description: 'Tea drinks',
        sort_order: 3,
        is_active: true
      })
      .returning()
      .execute();

    const [menuItem] = await db.insert(menuItemsTable)
      .values({
        category_id: category.id,
        name: 'Green Tea',
        description: 'Fresh green tea',
        base_price: '2.75',
        is_available: true,
        has_size_options: true,
        has_milk_options: false,
        max_extra_shots: 0,
        sort_order: 1,
        image_url: null
      })
      .returning()
      .execute();

    // Create only small and large size options (no medium)
    await db.insert(sizePricingTable)
      .values([
        {
          menu_item_id: menuItem.id,
          size: 'small',
          price_modifier: '-0.25'
        },
        {
          menu_item_id: menuItem.id,
          size: 'large',
          price_modifier: '0.50'
        }
      ])
      .execute();

    const result = await getSizePricing(menuItem.id);

    expect(result).toHaveLength(2);
    
    const sizes = result.map(p => p.size).sort();
    expect(sizes).toEqual(['large', 'small']);
    
    const smallPricing = result.find(p => p.size === 'small');
    const largePricing = result.find(p => p.size === 'large');
    
    expect(smallPricing?.price_modifier).toBe(-0.25);
    expect(largePricing?.price_modifier).toBe(0.50);
  });

  it('should handle different price modifier ranges', async () => {
    // Create prerequisite data
    const [category] = await db.insert(menuCategoriesTable)
      .values({
        name: 'Specialty',
        description: 'Specialty drinks',
        sort_order: 4,
        is_active: true
      })
      .returning()
      .execute();

    const [menuItem] = await db.insert(menuItemsTable)
      .values({
        category_id: category.id,
        name: 'Premium Blend',
        description: 'Expensive coffee',
        base_price: '6.00',
        is_available: true,
        has_size_options: true,
        has_milk_options: true,
        max_extra_shots: 5,
        sort_order: 1,
        image_url: null
      })
      .returning()
      .execute();

    // Test various price modifier values including negative and positive
    await db.insert(sizePricingTable)
      .values([
        {
          menu_item_id: menuItem.id,
          size: 'small',
          price_modifier: '-1.50'
        },
        {
          menu_item_id: menuItem.id,
          size: 'medium',
          price_modifier: '0.00'
        },
        {
          menu_item_id: menuItem.id,
          size: 'large',
          price_modifier: '2.25'
        }
      ])
      .execute();

    const result = await getSizePricing(menuItem.id);

    expect(result).toHaveLength(3);
    
    const smallPricing = result.find(p => p.size === 'small');
    const mediumPricing = result.find(p => p.size === 'medium');
    const largePricing = result.find(p => p.size === 'large');
    
    expect(smallPricing?.price_modifier).toBe(-1.50);
    expect(mediumPricing?.price_modifier).toBe(0.00);
    expect(largePricing?.price_modifier).toBe(2.25);
    
    // Verify all are numbers
    expect(typeof smallPricing?.price_modifier).toBe('number');
    expect(typeof mediumPricing?.price_modifier).toBe('number');
    expect(typeof largePricing?.price_modifier).toBe('number');
  });
});