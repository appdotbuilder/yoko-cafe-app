import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { MenuItem, SizePricing } from '../../../server/src/schema';
import type { CartItem } from '../App';
import { Plus, Minus, Coffee } from 'lucide-react';

interface MenuItemCustomizerProps {
  item: MenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customizedItem: CartItem) => void;
}

const milkOptions = [
  { value: 'none', label: 'No Milk' },
  { value: 'whole', label: 'Whole Milk' },
  { value: 'skim', label: 'Skim Milk' },
  { value: '2percent', label: '2% Milk' },
  { value: 'oat', label: 'Oat Milk (+$0.60)' },
  { value: 'almond', label: 'Almond Milk (+$0.60)' },
  { value: 'soy', label: 'Soy Milk (+$0.60)' },
  { value: 'coconut', label: 'Coconut Milk (+$0.60)' }
];

const premiumMilks = ['oat', 'almond', 'soy', 'coconut'];

export function MenuItemCustomizer({ item, open, onOpenChange, onConfirm }: MenuItemCustomizerProps) {
  const [sizePricing, setSizePricing] = useState<SizePricing[]>([]);
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large' | null>(null);
  const [selectedMilk, setSelectedMilk] = useState<string>('none');
  const [extraShots, setExtraShots] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load size pricing when item changes
  useEffect(() => {
    if (item.has_size_options) {
      const loadSizePricing = async () => {
        try {
          setIsLoading(true);
          const pricing = await trpc.getSizePricing.query({ menuItemId: item.id });
          setSizePricing(pricing);
          // Set default size to medium if available
          if (pricing.some(p => p.size === 'medium')) {
            setSelectedSize('medium');
          } else if (pricing.length > 0) {
            setSelectedSize(pricing[0].size as 'small' | 'medium' | 'large');
          }
        } catch (error) {
          console.error('Failed to load size pricing:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadSizePricing();
    }
  }, [item]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedMilk(item.has_milk_options ? 'whole' : 'none');
      setExtraShots(0);
      setQuantity(1);
      setSpecialInstructions('');
    }
  }, [open, item]);

  const calculatePrice = () => {
    let price = item.base_price;
    
    // Add size modifier
    if (selectedSize && sizePricing.length > 0) {
      const sizePrice = sizePricing.find(p => p.size === selectedSize);
      if (sizePrice) {
        price += sizePrice.price_modifier;
      }
    }
    
    // Add premium milk upcharge
    if (premiumMilks.includes(selectedMilk)) {
      price += 0.60;
    }
    
    // Add extra shots ($0.75 each)
    price += extraShots * 0.75;
    
    return Math.max(price, 0);
  };

  const handleConfirm = () => {
    const unitPrice = calculatePrice();
    const customizedItem: CartItem = {
      menuItemId: item.id,
      menuItemName: item.name,
      basePrice: item.base_price,
      quantity: quantity,
      size: selectedSize,
      milkType: selectedMilk as 'none' | 'whole' | 'skim' | '2percent' | 'oat' | 'almond' | 'soy' | 'coconut',
      extraShots: extraShots,
      specialInstructions: specialInstructions || null,
      unitPrice: unitPrice,
      totalPrice: unitPrice * quantity
    };
    
    onConfirm(customizedItem);
  };

  const unitPrice = calculatePrice();
  const totalPrice = unitPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coffee className="h-5 w-5 text-amber-600" />
            <span>Customize {item.name}</span>
          </DialogTitle>
          {item.description && (
            <p className="text-sm text-gray-600">{item.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Size Selection */}
          {item.has_size_options && (
            <div>
              <Label className="text-base font-semibold">Size</Label>
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading sizes...</div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {sizePricing.map((pricing) => {
                    const sizePrice = item.base_price + pricing.price_modifier;
                    return (
                      <Card 
                        key={pricing.size}
                        className={`cursor-pointer ${
                          selectedSize === pricing.size 
                            ? 'ring-2 ring-amber-500 bg-amber-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSize(pricing.size as 'small' | 'medium' | 'large')}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="font-medium capitalize">{pricing.size}</div>
                          <div className="text-sm text-gray-600">
                            ${sizePrice.toFixed(2)}
                            {pricing.price_modifier !== 0 && (
                              <span className="text-xs">
                                {pricing.price_modifier > 0 ? ' (+' : ' ('}
                                ${Math.abs(pricing.price_modifier).toFixed(2)})
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Milk Options */}
          {item.has_milk_options && (
            <div>
              <Label className="text-base font-semibold">Milk Type</Label>
              <Select value={selectedMilk} onValueChange={setSelectedMilk}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {milkOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Extra Shots */}
          {item.max_extra_shots > 0 && (
            <div>
              <Label className="text-base font-semibold">Extra Espresso Shots</Label>
              <div className="flex items-center space-x-3 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExtraShots(Math.max(0, extraShots - 1))}
                  disabled={extraShots <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-2">
                  <span className="w-8 text-center">{extraShots}</span>
                  <Badge variant="outline">+${(extraShots * 0.75).toFixed(2)}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExtraShots(Math.min(item.max_extra_shots, extraShots + 1))}
                  disabled={extraShots >= item.max_extra_shots}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                $0.75 per shot (max {item.max_extra_shots})
              </p>
            </div>
          )}

          {/* Special Instructions */}
          <div>
            <Label className="text-base font-semibold">Special Instructions</Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests? (e.g., extra hot, light foam, etc.)"
              className="mt-2"
              rows={2}
            />
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-base font-semibold">Quantity</Label>
            <div className="flex items-center space-x-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min="1"
                max="10"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Price Summary */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Unit Price: ${unitPrice.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Quantity: {quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-amber-700">
                  Total: ${totalPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-amber-600 hover:bg-amber-700">
            Add to Cart - ${totalPrice.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}