import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import type { CartItem } from '../App';
import type { Order } from '../../../server/src/schema';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Smartphone } from 'lucide-react';

interface CartProps {
  cart: CartItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCartItem: (index: number, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (index: number) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: Order) => void;
}

const paymentMethods = [
  { value: 'credit_card', label: 'Credit Card', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'debit_card', label: 'Debit Card', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'mobile_wallet', label: 'Mobile Wallet', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'qr_code', label: 'QR Code Payment', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'cash', label: 'Cash (Pay at Counter)', icon: <CreditCard className="h-4 w-4" /> }
];

export function Cart({
  cart,
  open,
  onOpenChange,
  onUpdateCartItem,
  onRemoveFromCart,
  onClearCart,
  onOrderPlaced
}: CartProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((total, item) => total + item.totalPrice, 0);
  const taxRate = 0.08; // 8% tax
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveFromCart(index);
    } else {
      onUpdateCartItem(index, { 
        quantity: newQuantity,
        totalPrice: newQuantity * cart[index].unitPrice
      });
    }
  };

  const formatCustomizations = (item: CartItem) => {
    const customizations = [];
    
    if (item.size) {
      customizations.push(`${item.size} size`);
    }
    if (item.milkType && item.milkType !== 'none') {
      const milkName = item.milkType.replace('2percent', '2%').replace('_', ' ');
      customizations.push(`${milkName} milk`);
    }
    if (item.extraShots > 0) {
      customizations.push(`+${item.extraShots} shot${item.extraShots > 1 ? 's' : ''}`);
    }
    if (item.specialInstructions) {
      customizations.push(item.specialInstructions);
    }
    
    return customizations;
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare order items
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        size: item.size || null,
        milk_type: item.milkType || null,
        extra_shots: item.extraShots,
        special_instructions: item.specialInstructions || null
      }));

      // Create order
      const order = await trpc.createOrder.mutate({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        items: orderItems,
        special_instructions: specialInstructions.trim() || null,
        payment_method: paymentMethod as 'credit_card' | 'debit_card' | 'mobile_wallet' | 'qr_code' | 'cash'
      });

      // Clear form and cart
      setCustomerName('');
      setCustomerPhone('');
      setSpecialInstructions('');
      setPaymentMethod('');
      onClearCart();
      onOrderPlaced(order);
      onOpenChange(false);

      alert(`Order placed successfully! Order number: ${order.order_number}`);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
            <span>Your Cart ({cart.length} items)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Your cart is empty</p>
              <p className="text-sm text-gray-500">Add some delicious items to get started!</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <ScrollArea className="max-h-60">
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.menuItemName}</h4>
                          
                          {formatCustomizations(item).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {formatCustomizations(item).map((custom, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {custom}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-600 mt-1">
                            ${item.unitPrice.toFixed(2)} each
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(index, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(index, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="text-right min-w-[60px]">
                            <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveFromCart(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              {/* Order Summary */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-amber-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Customer Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Name *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone (Optional)</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      type="tel"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialInstructions">Order Notes (Optional)</Label>
                  <Textarea
                    id="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special requests for the entire order?"
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Payment Method */}
              <div>
                <Label className="text-base font-semibold">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center space-x-2">
                          {method.icon}
                          <span>{method.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {cart.length > 0 && (
            <>
              <Button variant="outline" onClick={onClearCart}>
                Clear Cart
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isSubmitting || !customerName.trim() || !paymentMethod}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? 'Placing Order...' : `Place Order - $${total.toFixed(2)}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}