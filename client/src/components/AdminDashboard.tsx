import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { MenuCategory, MenuItem, CreateMenuCategoryInput, CreateMenuItemInput } from '../../../server/src/schema';
import { 
  Plus, 
  Edit, 
  Settings, 
  Coffee, 
  Leaf, 
  Cookie,

  DollarSign
} from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  'Coffee': <Coffee className="h-4 w-4" />,
  'Tea & Beverages': <Leaf className="h-4 w-4" />,
  'Pastries & Snacks': <Cookie className="h-4 w-4" />
};

export function AdminDashboard() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category form state
  const [categoryForm, setCategoryForm] = useState<CreateMenuCategoryInput>({
    name: '',
    description: null,
    sort_order: 1,
    is_active: true
  });

  // Menu item form state
  const [itemForm, setItemForm] = useState<CreateMenuItemInput>({
    category_id: 0,
    name: '',
    description: null,
    base_price: 0,
    is_available: true,
    has_size_options: false,
    has_milk_options: false,
    max_extra_shots: 0,
    sort_order: 1,
    image_url: null
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [categoriesData, itemsData] = await Promise.all([
        trpc.getMenuCategories.query(),
        trpc.getMenuItems.query({ limit: 100, offset: 0 })
      ]);
      setCategories(categoriesData);
      setMenuItems(itemsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    setIsSubmitting(true);
    try {
      await trpc.createMenuCategory.mutate({
        ...categoryForm,
        name: categoryForm.name.trim(),
        description: categoryForm.description?.trim() || null
      });
      
      // Reset form and close dialog
      setCategoryForm({
        name: '',
        description: null,
        sort_order: 1,
        is_active: true
      });
      setShowCategoryDialog(false);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMenuItem = async () => {
    if (!itemForm.name.trim() || !itemForm.category_id || itemForm.base_price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await trpc.createMenuItem.mutate({
        ...itemForm,
        name: itemForm.name.trim(),
        description: itemForm.description?.trim() || null,
        image_url: itemForm.image_url?.trim() || null
      });
      
      // Reset form and close dialog
      setItemForm({
        category_id: 0,
        name: '',
        description: null,
        base_price: 0,
        is_available: true,
        has_size_options: false,
        has_milk_options: false,
        max_extra_shots: 0,
        sort_order: 1,
        image_url: null
      });
      setShowItemDialog(false);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to create menu item:', error);
      alert('Failed to create menu item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMenuItem = async () => {
    if (!editingItem || !itemForm.name.trim() || itemForm.base_price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await trpc.updateMenuItem.mutate({
        id: editingItem.id,
        name: itemForm.name.trim(),
        description: itemForm.description?.trim() || null,
        base_price: itemForm.base_price,
        is_available: itemForm.is_available,
        has_size_options: itemForm.has_size_options,
        has_milk_options: itemForm.has_milk_options,
        max_extra_shots: itemForm.max_extra_shots,
        sort_order: itemForm.sort_order,
        image_url: itemForm.image_url?.trim() || null
      });
      
      // Reset form and close dialog
      setEditingItem(null);
      setItemForm({
        category_id: 0,
        name: '',
        description: null,
        base_price: 0,
        is_available: true,
        has_size_options: false,
        has_milk_options: false,
        max_extra_shots: 0,
        sort_order: 1,
        image_url: null
      });
      setShowItemDialog(false);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to update menu item:', error);
      alert('Failed to update menu item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      base_price: item.base_price,
      is_available: item.is_available,
      has_size_options: item.has_size_options,
      has_milk_options: item.has_milk_options,
      max_extra_shots: item.max_extra_shots,
      sort_order: item.sort_order,
      image_url: item.image_url
    });
    setShowItemDialog(true);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Administrative Management</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowCategoryDialog(true)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button
            onClick={() => setShowItemDialog(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="menu-items" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="menu-items">Menu Items ({menuItems.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="menu-items" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Card key={item.id} className={`${!item.is_available ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <p className="text-sm text-gray-600">{getCategoryName(item.category_id)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Badge variant={item.is_available ? "default" : "secondary"}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">${item.base_price.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Sort: {item.sort_order}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {item.has_size_options && (
                      <Badge variant="outline" className="text-xs">Sizes</Badge>
                    )}
                    {item.has_milk_options && (
                      <Badge variant="outline" className="text-xs">Milk</Badge>
                    )}
                    {item.max_extra_shots > 0 && (
                      <Badge variant="outline" className="text-xs">+{item.max_extra_shots} Shots</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {categoryIcons[category.name] || <Settings className="h-4 w-4" />}
                    <span>{category.name}</span>
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Sort Order: {category.sort_order}</span>
                    <span>
                      Items: {menuItems.filter(item => item.category_id === category.id).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Coffee, Tea, Pastries"
              />
            </div>
            
            <div>
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description || ''}
                onChange={(e) => setCategoryForm(prev => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm(prev => ({ 
                    ...prev, 
                    sort_order: parseInt(e.target.value) || 1 
                  }))}
                  min="1"
                />
              </div>
              
              <div className="flex items-center space-x-2 mt-6">
                <Switch
                  id="isActive"
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) => setCategoryForm(prev => ({ 
                    ...prev, 
                    is_active: checked 
                  }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCategory}
              disabled={isSubmitting || !categoryForm.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Menu Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={(open) => {
        setShowItemDialog(open);
        if (!open) {
          setEditingItem(null);
          setItemForm({
            category_id: 0,
            name: '',
            description: null,
            base_price: 0,
            is_available: true,
            has_size_options: false,
            has_milk_options: false,
            max_extra_shots: 0,
            sort_order: 1,
            image_url: null
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Edit ${editingItem.name}` : 'Add New Menu Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemName">Item Name *</Label>
                <Input
                  id="itemName"
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Americano, Latte"
                />
              </div>
              
              <div>
                <Label htmlFor="itemCategory">Category *</Label>
                <Select
                  value={itemForm.category_id.toString()}
                  onValueChange={(value) => setItemForm(prev => ({ 
                    ...prev, 
                    category_id: parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                value={itemForm.description || ''}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))}
                placeholder="Describe this menu item"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice">Base Price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.base_price}
                  onChange={(e) => setItemForm(prev => ({ 
                    ...prev, 
                    base_price: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="1"
                  value={itemForm.sort_order}
                  onChange={(e) => setItemForm(prev => ({ 
                    ...prev, 
                    sort_order: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={itemForm.image_url || ''}
                onChange={(e) => setItemForm(prev => ({ 
                  ...prev, 
                  image_url: e.target.value || null 
                }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-semibold">Options & Customizations</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAvailable"
                    checked={itemForm.is_available}
                    onCheckedChange={(checked) => setItemForm(prev => ({ 
                      ...prev, 
                      is_available: checked 
                    }))}
                  />
                  <Label htmlFor="isAvailable">Available</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hasSizeOptions"
                    checked={itemForm.has_size_options}
                    onCheckedChange={(checked) => setItemForm(prev => ({ 
                      ...prev, 
                      has_size_options: checked 
                    }))}
                  />
                  <Label htmlFor="hasSizeOptions">Size Options</Label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hasMilkOptions"
                    checked={itemForm.has_milk_options}
                    onCheckedChange={(checked) => setItemForm(prev => ({ 
                      ...prev, 
                      has_milk_options: checked 
                    }))}
                  />
                  <Label htmlFor="hasMilkOptions">Milk Options</Label>
                </div>
                
                <div>
                  <Label htmlFor="maxExtraShots">Max Extra Shots</Label>
                  <Input
                    id="maxExtraShots"
                    type="number"
                    min="0"
                    max="5"
                    value={itemForm.max_extra_shots}
                    onChange={(e) => setItemForm(prev => ({ 
                      ...prev, 
                      max_extra_shots: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editingItem ? handleUpdateMenuItem : handleCreateMenuItem}
              disabled={isSubmitting || !itemForm.name.trim() || !itemForm.category_id || itemForm.base_price <= 0}
            >
              {isSubmitting 
                ? (editingItem ? 'Updating...' : 'Creating...')
                : (editingItem ? 'Update Item' : 'Create Item')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}