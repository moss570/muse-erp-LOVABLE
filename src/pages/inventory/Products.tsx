import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, IceCream } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { usePermissions } from '@/hooks/usePermission';
import { ProductFormDialog, type ProductFormData } from '@/components/products/ProductFormDialog';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Unit = Tables<'units_of_measure'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Products() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission, isAdmin } = usePermissions();

  const canCreate = isAdmin || checkPermission('products.create', 'full');
  const canEdit = isAdmin || checkPermission('products.edit', 'full');
  const canDelete = isAdmin || checkPermission('products.delete', 'full');

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          units_of_measure:unit_id(*),
          product_category:product_categories(id, name, code)
        `)
        .order('name');
      if (error) throw error;
      return data as (Product & { 
        units_of_measure: Unit | null;
        product_category: { id: string; name: string; code: string } | null;
      })[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { data: newProduct, error } = await supabase.from('products').insert([{
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        product_category_id: data.product_category_id || null,
        unit_id: data.unit_id || null,
        is_base_product: data.is_base_product,
        is_active: data.is_active,
        requires_upc: data.requires_upc,
        shelf_life_days: data.shelf_life_days || null,
        storage_requirements: data.storage_requirements || null,
        handling_instructions: data.handling_instructions || null,
      }]).select().single();
      if (error) throw error;
      return newProduct;
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product created successfully' });
      // Keep dialog open and switch to editing the new product
      if (newProduct) {
        setEditingProduct(newProduct as Product);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating product', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData & { id: string }) => {
      const { id, ...rest } = data;
      const { data: updatedProduct, error } = await supabase
        .from('products')
        .update({
          sku: rest.sku,
          name: rest.name,
          description: rest.description || null,
          product_category_id: rest.product_category_id || null,
          unit_id: rest.unit_id || null,
          is_base_product: rest.is_base_product,
          is_active: rest.is_active,
          requires_upc: rest.requires_upc,
          shelf_life_days: rest.shelf_life_days || null,
          storage_requirements: rest.storage_requirements || null,
          handling_instructions: rest.handling_instructions || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updatedProduct;
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product updated successfully' });
      // Update the editing product with new data so tabs reflect changes
      if (updatedProduct) {
        setEditingProduct(updatedProduct as Product);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating product', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting product', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ ...data, id: editingProduct.id });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter and paginate
  const filteredProducts = products?.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredProducts?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProducts = filteredProducts?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <DataTableHeader
        title="Products"
        subtitle="Manage finished goods and products"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search products..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={canCreate ? () => handleOpenDialog() : undefined}
        addLabel="Add Product"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={products?.length}
        filteredCount={filteredProducts?.length}
      />

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Base Product</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <IceCream className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No products found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts?.map((product) => (
                    <TableRow 
                      key={product.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(product)}
                    >
                      <TableCell>
                        <StatusIndicator 
                          status={product.is_active ? 'active' : 'inactive'} 
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {product.product_category ? (
                          <Badge variant="outline" className="font-normal">
                            {product.product_category.name}
                          </Badge>
                        ) : product.category ? (
                          <Badge variant="secondary" className="font-normal">
                            {product.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{product.units_of_measure?.code || '-'}</TableCell>
                      <TableCell>
                        {product.is_base_product ? (
                          <Badge className="bg-blue-100 text-blue-800">Base</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(product);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(product.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalItems > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      <ProductFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={editingProduct}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
