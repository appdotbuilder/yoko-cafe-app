import { z } from 'zod';

// Enums for various system states and types
export const orderStatusEnum = z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']);
export const paymentStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']);
export const paymentMethodEnum = z.enum(['credit_card', 'debit_card', 'mobile_wallet', 'qr_code', 'cash']);
export const userRoleEnum = z.enum(['customer', 'staff', 'admin']);
export const menuItemSizeEnum = z.enum(['small', 'medium', 'large']);
export const milkTypeEnum = z.enum(['none', 'whole', 'skim', '2percent', 'oat', 'almond', 'soy', 'coconut']);

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  role: userRoleEnum,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Menu Category schema
export const menuCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type MenuCategory = z.infer<typeof menuCategorySchema>;

// Menu Item schema
export const menuItemSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  base_price: z.number(),
  is_available: z.boolean(),
  has_size_options: z.boolean(),
  has_milk_options: z.boolean(),
  max_extra_shots: z.number().int(),
  sort_order: z.number().int(),
  image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MenuItem = z.infer<typeof menuItemSchema>;

// Size pricing schema
export const sizePricingSchema = z.object({
  id: z.number(),
  menu_item_id: z.number(),
  size: menuItemSizeEnum,
  price_modifier: z.number(),
  created_at: z.coerce.date()
});

export type SizePricing = z.infer<typeof sizePricingSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  order_number: z.string(),
  status: orderStatusEnum,
  total_amount: z.number(),
  tax_amount: z.number(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  special_instructions: z.string().nullable(),
  estimated_ready_time: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order Item schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  menu_item_id: z.number(),
  quantity: z.number().int(),
  size: menuItemSizeEnum.nullable(),
  milk_type: milkTypeEnum.nullable(),
  extra_shots: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  special_instructions: z.string().nullable(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  amount: z.number(),
  payment_method: paymentMethodEnum,
  payment_status: paymentStatusEnum,
  transaction_id: z.string().nullable(),
  payment_gateway_response: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

// Input schemas for creating records

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().nullable(),
  role: userRoleEnum.default('customer')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createMenuCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().nonnegative(),
  is_active: z.boolean().default(true)
});

export type CreateMenuCategoryInput = z.infer<typeof createMenuCategoryInputSchema>;

export const createMenuItemInputSchema = z.object({
  category_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable(),
  base_price: z.number().positive(),
  is_available: z.boolean().default(true),
  has_size_options: z.boolean().default(false),
  has_milk_options: z.boolean().default(false),
  max_extra_shots: z.number().int().nonnegative().default(0),
  sort_order: z.number().int().nonnegative(),
  image_url: z.string().nullable()
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;

export const createSizePricingInputSchema = z.object({
  menu_item_id: z.number(),
  size: menuItemSizeEnum,
  price_modifier: z.number()
});

export type CreateSizePricingInput = z.infer<typeof createSizePricingInputSchema>;

export const createOrderItemInputSchema = z.object({
  menu_item_id: z.number(),
  quantity: z.number().int().positive(),
  size: menuItemSizeEnum.nullable(),
  milk_type: milkTypeEnum.nullable(),
  extra_shots: z.number().int().nonnegative().default(0),
  special_instructions: z.string().nullable()
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;

export const createOrderInputSchema = z.object({
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  items: z.array(createOrderItemInputSchema).min(1),
  special_instructions: z.string().nullable(),
  payment_method: paymentMethodEnum
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const createPaymentInputSchema = z.object({
  order_id: z.number(),
  amount: z.number().positive(),
  payment_method: paymentMethodEnum,
  transaction_id: z.string().nullable()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Update schemas

export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: orderStatusEnum,
  estimated_ready_time: z.coerce.date().nullable().optional()
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

export const updateMenuItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  base_price: z.number().positive().optional(),
  is_available: z.boolean().optional(),
  has_size_options: z.boolean().optional(),
  has_milk_options: z.boolean().optional(),
  max_extra_shots: z.number().int().nonnegative().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  image_url: z.string().nullable().optional()
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;

export const updatePaymentStatusInputSchema = z.object({
  id: z.number(),
  payment_status: paymentStatusEnum,
  transaction_id: z.string().nullable().optional(),
  payment_gateway_response: z.string().nullable().optional()
});

export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusInputSchema>;

// Query schemas for filtering and pagination

export const getOrdersInputSchema = z.object({
  status: orderStatusEnum.optional(),
  customer_id: z.number().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetOrdersInput = z.infer<typeof getOrdersInputSchema>;

export const getMenuItemsInputSchema = z.object({
  category_id: z.number().optional(),
  is_available: z.boolean().optional(),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().nonnegative().default(0)
});

export type GetMenuItemsInput = z.infer<typeof getMenuItemsInputSchema>;