import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { Order } from '../../../server/src/schema';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Coffee, 
  Package,
  Search,
  RefreshCw
} from 'lucide-react';

interface OrderStatusProps {
  currentOrder: Order | null;
}

const statusConfig = {
  pending: {
    label: 'Order Received',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-yellow-500',
    progress: 20,
    description: 'Your order has been received and is being processed'
  },
  confirmed: {
    label: 'Order Confirmed',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-blue-500',
    progress: 40,
    description: 'Your order has been confirmed and will be prepared soon'
  },
  preparing: {
    label: 'Preparing',
    icon: <Coffee className="h-5 w-5" />,
    color: 'bg-amber-500',
    progress: 60,
    description: 'Our baristas are carefully preparing your order'
  },
  ready: {
    label: 'Ready for Pickup',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-green-500',
    progress: 80,
    description: 'Your order is ready! Please come to the counter'
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-green-600',
    progress: 100,
    description: 'Order complete! Thank you for choosing Yoko Café'
  },
  cancelled: {
    label: 'Cancelled',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'bg-red-500',
    progress: 0,
    description: 'This order has been cancelled'
  }
};

export function OrderStatus({ currentOrder }: OrderStatusProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayOrder = trackedOrder || currentOrder;

  const searchOrder = async () => {
    if (!trackingNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Extract numeric ID from order number (format: YC1703123456789)
      const numericId = parseInt(trackingNumber.replace(/^YC\d{10}/, '')) || parseInt(trackingNumber);
      
      if (isNaN(numericId)) {
        throw new Error('Invalid order number format');
      }

      const order = await trpc.getOrderById.query({ id: numericId });
      setTrackedOrder(order);
    } catch (error) {
      console.error('Failed to find order:', error);
      setError('Order not found. Please check your order number and try again.');
      setTrackedOrder(null);
    } finally {
      setIsSearching(false);
    }
  };

  const refreshOrder = useCallback(async () => {
    if (!displayOrder) return;

    setIsRefreshing(true);
    try {
      const updatedOrder = await trpc.getOrderById.query({ id: displayOrder.id });
      if (trackedOrder) {
        setTrackedOrder(updatedOrder);
      }
      // If it's the current order, the parent component should handle updates
    } catch (error) {
      console.error('Failed to refresh order:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [displayOrder, trackedOrder]);

  // Auto-refresh every 30 seconds for active orders
  useEffect(() => {
    if (!displayOrder || displayOrder.status === 'completed' || displayOrder.status === 'cancelled') {
      return;
    }

    const interval = setInterval(refreshOrder, 30000);
    return () => clearInterval(interval);
  }, [displayOrder, refreshOrder]);

  const formatEstimatedTime = (estimatedTime: Date | null) => {
    if (!estimatedTime) return 'Calculating...';
    
    const now = new Date();
    const diff = estimatedTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ready now!';
    
    const minutes = Math.ceil(diff / (1000 * 60));
    return `~${minutes} minutes`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'preparing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-amber-600" />
            <span>Track Your Order</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="trackingNumber">Order Number</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter your order number (e.g., YC1703123456789)"
                onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchOrder}
                disabled={isSearching}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSearching ? 'Searching...' : 'Track Order'}
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Status Display */}
      {displayOrder ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Coffee className="h-5 w-5 text-amber-600" />
                <span>Order #{displayOrder.order_number}</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Placed on {displayOrder.created_at.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOrder}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant={getStatusBadgeVariant(displayOrder.status)}>
                {statusConfig[displayOrder.status as keyof typeof statusConfig].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Status Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {statusConfig[displayOrder.status as keyof typeof statusConfig].icon}
                    <span className="font-medium">
                      {statusConfig[displayOrder.status as keyof typeof statusConfig].label}
                    </span>
                  </div>
                  {displayOrder.status !== 'cancelled' && (
                    <span className="text-sm text-gray-600">
                      {statusConfig[displayOrder.status as keyof typeof statusConfig].progress}%
                    </span>
                  )}
                </div>
                
                {displayOrder.status !== 'cancelled' && (
                  <Progress 
                    value={statusConfig[displayOrder.status as keyof typeof statusConfig].progress} 
                    className="h-2"
                  />
                )}
                
                <p className="text-sm text-gray-600 mt-2">
                  {statusConfig[displayOrder.status as keyof typeof statusConfig].description}
                </p>
              </div>

              {/* Estimated Time */}
              {displayOrder.status === 'preparing' && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">
                          Estimated ready time: {formatEstimatedTime(displayOrder.estimated_ready_time)}
                        </p>
                        <p className="text-sm text-amber-700">
                          We'll notify you when your order is ready!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Details */}
              <div>
                <h4 className="font-semibold mb-3">Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Customer:</span> {displayOrder.customer_name || 'Guest'}</p>
                    {displayOrder.customer_phone && (
                      <p><span className="font-medium">Phone:</span> {displayOrder.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <p><span className="font-medium">Total:</span> ${displayOrder.total_amount.toFixed(2)}</p>
                    <p><span className="font-medium">Tax:</span> ${displayOrder.tax_amount.toFixed(2)}</p>
                  </div>
                </div>
                
                {displayOrder.special_instructions && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="font-medium text-sm">Special Instructions:</p>
                    <p className="text-sm text-gray-700">{displayOrder.special_instructions}</p>
                  </div>
                )}
              </div>

              {/* Ready for Pickup Alert */}
              {displayOrder.status === 'ready' && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">
                          🎉 Your order is ready for pickup!
                        </p>
                        <p className="text-sm text-green-700">
                          Please come to the counter with your order number: {displayOrder.order_number}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Track Your Order
              </h3>
              <p className="text-gray-600 mb-4">
                Enter your order number above to track your order status in real-time.
              </p>
              <p className="text-sm text-gray-500">
                Your order number was provided when you placed your order and starts with "YC".
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}