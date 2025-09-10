import { type CreateMenuCategoryInput, type MenuCategory } from '../schema';

export async function createMenuCategory(input: CreateMenuCategoryInput): Promise<MenuCategory> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new menu category and persisting it in the database.
    // Should validate category name uniqueness within the same sort order.
    return Promise.resolve({
        id: 1, // Placeholder ID
        name: input.name,
        description: input.description,
        sort_order: input.sort_order,
        is_active: input.is_active,
        created_at: new Date()
    } as MenuCategory);
}