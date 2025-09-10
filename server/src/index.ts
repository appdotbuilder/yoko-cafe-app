import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createUserInputSchema,
  createMenuCategoryInputSchema,
  createMenuItemInputSchema,
  createSizePricingInputSchema,
  createOrderInputSchema,
  createPaymentInputSchema,
  updateOrderStatusInputSchema,
  updateMenuItemInputSchema,
  updatePaymentStatusInputSchema,
  getOrdersInputSchema,
  getMenuItemsInputSchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { createMenuCategory } from './handlers/create_menu_category';
import { createMenuItem } from './handlers/create_menu_item';
import { createSizePricing } from './handlers/create_size_pricing';
import { createOrder } from './handlers/create_order';
import { createPayment } from './handlers/create_payment';
import { getMenuCategories } from './handlers/get_menu_categories';
import { getMenuItems } from './handlers/get_menu_items';
import { getOrders } from './handlers/get_orders';
import { updateOrderStatus } from './handlers/update_order_status';
import { updateMenuItem } from './handlers/update_menu_item';
import { updatePaymentStatus } from './handlers/update_payment_status';
import { getOrderById } from './handlers/get_order_by_id';
import { getSizePricing } from './handlers/get_size_pricing';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Menu category management
  createMenuCategory: publicProcedure
    .input(createMenuCategoryInputSchema)
    .mutation(({ input }) => createMenuCategory(input)),

  getMenuCategories: publicProcedure
    .query(() => getMenuCategories()),

  // Menu item management
  createMenuItem: publicProcedure
    .input(createMenuItemInputSchema)
    .mutation(({ input }) => createMenuItem(input)),

  getMenuItems: publicProcedure
    .input(getMenuItemsInputSchema)
    .query(({ input }) => getMenuItems(input)),

  updateMenuItem: publicProcedure
    .input(updateMenuItemInputSchema)
    .mutation(({ input }) => updateMenuItem(input)),

  // Size pricing management
  createSizePricing: publicProcedure
    .input(createSizePricingInputSchema)
    .mutation(({ input }) => createSizePricing(input)),

  getSizePricing: publicProcedure
    .input(z.object({ menuItemId: z.number() }))
    .query(({ input }) => getSizePricing(input.menuItemId)),

  // Order management
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  getOrders: publicProcedure
    .input(getOrdersInputSchema)
    .query(({ input }) => getOrders(input)),

  getOrderById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrderById(input.id)),

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),

  // Payment management
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),

  updatePaymentStatus: publicProcedure
    .input(updatePaymentStatusInputSchema)
    .mutation(({ input }) => updatePaymentStatus(input)),

  // Customer-facing endpoints for menu browsing
  getActiveMenuCategories: publicProcedure
    .query(() => getMenuCategories()),

  getAvailableMenuItems: publicProcedure
    .input(z.object({ categoryId: z.number().optional() }))
    .query(({ input }) => getMenuItems({ 
      category_id: input.categoryId, 
      is_available: true,
      limit: 100,
      offset: 0
    })),

  // Staff dashboard endpoints
  getAllOrders: publicProcedure
    .query(() => getOrders({ limit: 50, offset: 0 })),

  getPendingOrders: publicProcedure
    .query(() => getOrders({ status: 'pending', limit: 50, offset: 0 })),

  getPreparingOrders: publicProcedure
    .query(() => getOrders({ status: 'preparing', limit: 50, offset: 0 })),

  getReadyOrders: publicProcedure
    .query(() => getOrders({ status: 'ready', limit: 50, offset: 0 })),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🚀 Yoko Café TRPC server listening at port: ${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - Menu browsing: getActiveMenuCategories, getAvailableMenuItems`);
  console.log(`   - Customer ordering: createOrder, getOrderById`);
  console.log(`   - Payment processing: createPayment, updatePaymentStatus`);
  console.log(`   - Staff dashboard: getAllOrders, updateOrderStatus`);
  console.log(`   - Admin management: createMenuItem, updateMenuItem, createMenuCategory`);
}

start();