import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomerMenu } from '@/components/CustomerMenu';
import { OrderStatus } from '@/components/OrderStatus';
import { StaffDashboard } from '@/components/StaffDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { trpc } from '@/utils/trpc';
import type { Order } from '../../server/src/schema';
import { Coffee, ShoppingCart, Users, Settings } from 'lucide-react';

export interface CartItem {
  menuItemId: number;
  menuItemName: string;
  basePrice: number;
  quantity: number;
  size?: 'small' | 'medium' | 'large' | null;
  milkType?: 'none' | 'whole' | 'skim' | '2percent' | 'oat' | 'almond' | 'soy' | 'coconut' | null;
  extraShots: number;
  specialInstructions?: string | null;
  unitPrice: number;
  totalPrice: number;
}

function App() {
  const [activeTab, setActiveTab] = useState('customer');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Load health check to ensure server is running
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await trpc.healthcheck.query();
        console.log('☕ Connected to Yoko Café server');
      } catch (error) {
        console.error('Failed to connect to server:', error);
      }
    };
    checkHealth();
  }, []);

  const addToCart = (item: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => 
        cartItem.menuItemId === item.menuItemId &&
        cartItem.size === item.size &&
        cartItem.milkType === item.milkType &&
        cartItem.extraShots === item.extraShots &&
        cartItem.specialInstructions === item.specialInstructions
      );

      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem === existingItem
            ? {
                ...cartItem,
                quantity: cartItem.quantity + item.quantity,
                totalPrice: (cartItem.quantity + item.quantity) * cartItem.unitPrice
              }
            : cartItem
        );
      }

      return [...prevCart, item];
    });
  };

  const updateCartItem = (index: number, updates: Partial<CartItem>) => {
    setCart(prevCart => 
      prevCart.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              ...updates,
              totalPrice: updates.quantity 
                ? updates.quantity * item.unitPrice 
                : item.totalPrice
            }
          : item
      )
    );
  };

  const removeFromCart = (index: number) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((total, item) => total + item.totalPrice, 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Coffee className="h-8 w-8 text-amber-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yoko Café ☕</h1>
                <p className="text-sm text-gray-600">Digital Ordering System</p>
              </div>
            </div>
            
            {activeTab === 'customer' && (
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {cartItemCount} items · ${cartTotal.toFixed(2)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="customer" className="flex items-center space-x-2">
              <Coffee className="h-4 w-4" />
              <span>Order Menu</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Order Status</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Staff Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Admin Panel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Coffee className="h-5 w-5 text-amber-600" />
                  <span>Browse Our Menu</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerMenu
                  cart={cart}
                  onAddToCart={addToCart}
                  onUpdateCartItem={updateCartItem}
                  onRemoveFromCart={removeFromCart}
                  onClearCart={clearCart}
                  onOrderPlaced={setCurrentOrder}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                  <span>Track Your Order</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderStatus currentOrder={currentOrder} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  <span>Staff Operations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StaffDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-amber-600" />
                  <span>Administrative Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdminDashboard />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-amber-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-gray-600">
            <p>© 2024 Yoko Café Digital Ordering System</p>
            <p className="text-sm">Made with ☕ and 💖</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;