import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { MenuItemCustomizer } from '@/components/MenuItemCustomizer';
import { Cart } from '@/components/Cart';
import { trpc } from '@/utils/trpc';
import type { MenuCategory, MenuItem, Order } from '../../../server/src/schema';
import type { CartItem } from '../App';
import { Coffee, Leaf, Cookie, Plus, ShoppingCart } from 'lucide-react';

interface CustomerMenuProps {
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateCartItem: (index: number, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (index: number) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: Order) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Coffee': <Coffee className="h-5 w-5" />,
  'Tea & Beverages': <Leaf className="h-5 w-5" />,
  'Pastries & Snacks': <Cookie className="h-5 w-5" />
};

export function CustomerMenu({
  cart,
  onAddToCart,
  onUpdateCartItem,
  onRemoveFromCart,
  onClearCart,
  onOrderPlaced
}: CustomerMenuProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getActiveMenuCategories.query();
      setCategories(result);
      if (result.length > 0 && !selectedCategory) {
        setSelectedCategory(result[0].id);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [selectedCategory]);

  // Load menu items for selected category
  const loadMenuItems = useCallback(async () => {
    if (!selectedCategory) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getAvailableMenuItems.query({ 
        categoryId: selectedCategory 
      });
      setMenuItems(result);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const handleItemClick = (item: MenuItem) => {
    if (item.has_size_options || item.has_milk_options || item.max_extra_shots > 0) {
      setSelectedItem(item);
      setShowCustomizer(true);
    } else {
      // Add simple item directly to cart
      const cartItem: CartItem = {
        menuItemId: item.id,
        menuItemName: item.name,
        basePrice: item.base_price,
        quantity: 1,
        size: null,
        milkType: null,
        extraShots: 0,
        specialInstructions: null,
        unitPrice: item.base_price,
        totalPrice: item.base_price
      };
      onAddToCart(cartItem);
    }
  };

  const handleCustomizerConfirm = (customizedItem: CartItem) => {
    onAddToCart(customizedItem);
    setShowCustomizer(false);
    setSelectedItem(null);
  };

  const cartTotal = cart.reduce((total, item) => total + item.totalPrice, 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome to Yoko Café! ☕
        </h2>
        {cartItemCount > 0 && (
          <Button 
            onClick={() => setShowCart(true)} 
            className="relative bg-amber-600 hover:bg-amber-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart ({cartItemCount})
            <Badge variant="secondary" className="ml-2 bg-white text-amber-800">
              ${cartTotal.toFixed(2)}
            </Badge>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "secondary" : "ghost"}
                    className={`w-full justify-start ${
                      selectedCategory === category.id 
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' 
                        : ''
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {categoryIcons[category.name] || <Coffee className="h-4 w-4" />}
                    <span className="ml-2">{category.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {categories.find(c => c.id === selectedCategory)?.name || 'Menu Items'}
              </CardTitle>
              {categories.find(c => c.id === selectedCategory)?.description && (
                <p className="text-sm text-gray-600">
                  {categories.find(c => c.id === selectedCategory)?.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading delicious items...</p>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8">
                  <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No items available in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-amber-200"
                      onClick={() => handleItemClick(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <div className="text-right">
                            <p className="font-bold text-amber-600">
                              ${item.base_price.toFixed(2)}
                            </p>
                            {item.has_size_options && (
                              <p className="text-xs text-gray-500">+ size options</p>
                            )}
                          </div>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.has_size_options && (
                            <Badge variant="outline" className="text-xs">
                              Size Options
                            </Badge>
                          )}
                          {item.has_milk_options && (
                            <Badge variant="outline" className="text-xs">
                              Milk Options
                            </Badge>
                          )}
                          {item.max_extra_shots > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Extra Shots
                            </Badge>
                          )}
                        </div>
                        
                        <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Menu Item Customizer Dialog */}
      {showCustomizer && selectedItem && (
        <MenuItemCustomizer
          item={selectedItem}
          open={showCustomizer}
          onOpenChange={setShowCustomizer}
          onConfirm={handleCustomizerConfirm}
        />
      )}

      {/* Cart Dialog */}
      {showCart && (
        <Cart
          cart={cart}
          open={showCart}
          onOpenChange={setShowCart}
          onUpdateCartItem={onUpdateCartItem}
          onRemoveFromCart={onRemoveFromCart}
          onClearCart={onClearCart}
          onOrderPlaced={onOrderPlaced}
        />
      )}
    </div>
  );
}