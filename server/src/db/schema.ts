import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['credit_card', 'debit_card', 'mobile_wallet', 'qr_code', 'cash']);
export const userRoleEnum = pgEnum('user_role', ['customer', 'staff', 'admin']);
export const menuItemSizeEnum = pgEnum('menu_item_size', ['small', 'medium', 'large']);
export const milkTypeEnum = pgEnum('milk_type', ['none', 'whole', 'skim', '2percent', 'oat', 'almond', 'soy', 'coconut']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'), // Nullable by default
  role: userRoleEnum('role').notNull().default('customer'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Menu Categories table
export const menuCategoriesTable = pgTable('menu_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  sort_order: integer('sort_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Menu Items table
export const menuItemsTable = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  category_id: integer('category_id').notNull().references(() => menuCategoriesTable.id),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  base_price: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  is_available: boolean('is_available').notNull().default(true),
  has_size_options: boolean('has_size_options').notNull().default(false),
  has_milk_options: boolean('has_milk_options').notNull().default(false),
  max_extra_shots: integer('max_extra_shots').notNull().default(0),
  sort_order: integer('sort_order').notNull().default(0),
  image_url: text('image_url'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Size pricing table for menu items with size variations
export const sizePricingTable = pgTable('size_pricing', {
  id: serial('id').primaryKey(),
  menu_item_id: integer('menu_item_id').notNull().references(() => menuItemsTable.id),
  size: menuItemSizeEnum('size').notNull(),
  price_modifier: numeric('price_modifier', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => usersTable.id), // Nullable for guest orders
  order_number: text('order_number').notNull().unique(),
  status: orderStatusEnum('status').notNull().default('pending'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  customer_name: text('customer_name'), // Nullable for registered users
  customer_phone: text('customer_phone'), // Nullable
  special_instructions: text('special_instructions'), // Nullable
  estimated_ready_time: timestamp('estimated_ready_time'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order Items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  menu_item_id: integer('menu_item_id').notNull().references(() => menuItemsTable.id),
  quantity: integer('quantity').notNull(),
  size: menuItemSizeEnum('size'), // Nullable
  milk_type: milkTypeEnum('milk_type'), // Nullable
  extra_shots: integer('extra_shots').notNull().default(0),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  special_instructions: text('special_instructions'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull().default('pending'),
  transaction_id: text('transaction_id'), // Nullable
  payment_gateway_response: text('payment_gateway_response'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  orders: many(ordersTable),
}));

export const menuCategoriesRelations = relations(menuCategoriesTable, ({ many }) => ({
  menuItems: many(menuItemsTable),
}));

export const menuItemsRelations = relations(menuItemsTable, ({ one, many }) => ({
  category: one(menuCategoriesTable, {
    fields: [menuItemsTable.category_id],
    references: [menuCategoriesTable.id],
  }),
  sizePricing: many(sizePricingTable),
  orderItems: many(orderItemsTable),
}));

export const sizePricingRelations = relations(sizePricingTable, ({ one }) => ({
  menuItem: one(menuItemsTable, {
    fields: [sizePricingTable.menu_item_id],
    references: [menuItemsTable.id],
  }),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(usersTable, {
    fields: [ordersTable.customer_id],
    references: [usersTable.id],
  }),
  orderItems: many(orderItemsTable),
  payments: many(paymentsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  menuItem: one(menuItemsTable, {
    fields: [orderItemsTable.menu_item_id],
    references: [menuItemsTable.id],
  }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [paymentsTable.order_id],
    references: [ordersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type MenuCategory = typeof menuCategoriesTable.$inferSelect;
export type NewMenuCategory = typeof menuCategoriesTable.$inferInsert;

export type MenuItem = typeof menuItemsTable.$inferSelect;
export type NewMenuItem = typeof menuItemsTable.$inferInsert;

export type SizePricing = typeof sizePricingTable.$inferSelect;
export type NewSizePricing = typeof sizePricingTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  menuCategories: menuCategoriesTable,
  menuItems: menuItemsTable,
  sizePricing: sizePricingTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
  payments: paymentsTable,
};