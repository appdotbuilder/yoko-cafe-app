import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Order } from '../../../server/src/schema';
import { 
  Clock, 
  Coffee, 
  Package, 
  CheckCircle, 
  RefreshCw,
  AlertTriangle,
  Phone,
  User,
  DollarSign
} from 'lucide-react';

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4" /> },
  { value: 'confirmed', label: 'Confirmed', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'preparing', label: 'Preparing', icon: <Coffee className="h-4 w-4" /> },
  { value: 'ready', label: 'Ready', icon: <Package className="h-4 w-4" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <AlertTriangle className="h-4 w-4" /> }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'preparing': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'ready': return 'bg-green-100 text-green-800 border-green-300';
    case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: number, newStatus: string) => void;
  isUpdating: boolean;
}

function OrderCard({ order, onStatusUpdate, isUpdating }: OrderCardProps) {
  const [selectedStatus, setSelectedStatus] = useState<typeof order.status>(order.status);

  const handleStatusChange = async (newStatus: string) => {
    setSelectedStatus(newStatus as typeof order.status);
    await onStatusUpdate(order.id, newStatus);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card className={`${order.status === 'ready' ? 'ring-2 ring-green-400' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">#{order.order_number}</CardTitle>
          <Badge className={getStatusColor(order.status)}>
            {statusOptions.find(s => s.value === order.status)?.label || order.status}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-gray-600 space-x-4">
          <span className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{formatTime(order.created_at)}</span>
          </span>
          <span>•</span>
          <span>{getTimeAgo(order.created_at)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4 text-gray-500" />
              <span>{order.customer_name || 'Guest'}</span>
            </div>
            {order.customer_phone && (
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{order.customer_phone}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-medium">${order.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Special Instructions:</strong> {order.special_instructions}
            </p>
          </div>
        )}

        {/* Estimated Ready Time */}
        {order.estimated_ready_time && order.status === 'preparing' && (
          <div className="flex items-center space-x-2 text-sm text-amber-700">
            <Clock className="h-4 w-4" />
            <span>
              Est. ready: {order.estimated_ready_time.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}

        <Separator />

        {/* Status Update */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Update Status:</span>
          <Select
            value={selectedStatus}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isUpdating && (
            <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StaffDashboard() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load different order views
      const [all, pending, preparing, ready] = await Promise.all([
        trpc.getAllOrders.query(),
        trpc.getPendingOrders.query(),
        trpc.getPreparingOrders.query(),
        trpc.getReadyOrders.query()
      ]);
      
      setAllOrders(all);
      setPendingOrders(pending);
      setPreparingOrders(preparing);
      setReadyOrders(ready);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    await loadOrders();
    setIsRefreshing(false);
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    
    try {
      await trpc.updateOrderStatus.mutate({
        id: orderId,
        status: newStatus as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled',
        estimated_ready_time: newStatus === 'preparing' 
          ? new Date(Date.now() + 15 * 60000) // 15 minutes from now
          : undefined
      });
      
      // Refresh orders to get updated data
      await loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshOrders, 30000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  const getOrderCount = (status?: string) => {
    if (!status) return allOrders.length;
    return allOrders.filter(order => order.status === status).length;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Staff Dashboard</h2>
        <Button
          onClick={refreshOrders}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{getOrderCount('pending')}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{getOrderCount('preparing')}</div>
            <div className="text-sm text-gray-600">Preparing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{getOrderCount('ready')}</div>
            <div className="text-sm text-gray-600">Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{getOrderCount()}</div>
            <div className="text-sm text-gray-600">Total Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="preparing" className="flex items-center space-x-2">
            <Coffee className="h-4 w-4" />
            <span>Preparing ({preparingOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="ready" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Ready ({readyOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>All ({allOrders.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No pending orders</p>
                </div>
              ) : (
                pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={updatingOrderId === order.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preparing" className="mt-6">
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {preparingOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No orders being prepared</p>
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={updatingOrderId === order.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {readyOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No orders ready for pickup</p>
                </div>
              ) : (
                readyOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={updatingOrderId === order.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {allOrders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No orders found</p>
                </div>
              ) : (
                allOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={updatingOrderId === order.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}