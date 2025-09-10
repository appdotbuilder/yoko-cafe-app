import { type MenuCategory } from '../schema';

export async function getMenuCategories(): Promise<MenuCategory[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all active menu categories ordered by sort_order.
    // Should only return categories where is_active = true for customer-facing requests.
    return Promise.resolve([
        {
            id: 1,
            name: "Coffee",
            description: "Freshly brewed coffee drinks",
            sort_order: 1,
            is_active: true,
            created_at: new Date()
        },
        {
            id: 2,
            name: "Tea & Beverages",
            description: "Hot and cold teas, smoothies, and other beverages",
            sort_order: 2,
            is_active: true,
            created_at: new Date()
        },
        {
            id: 3,
            name: "Pastries & Snacks",
            description: "Fresh baked goods and light snacks",
            sort_order: 3,
            is_active: true,
            created_at: new Date()
        }
    ] as MenuCategory[]);
}