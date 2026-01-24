import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle2, Plus, AlertCircle, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface CustomerMatchStepProps {
  extractedCustomerName: string | null;
  extractedCustomerAddress: string | null;
  matchedCustomerId: string | null;
  matchedCustomer: { id: string; name: string; code: string } | null;
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
}

export function CustomerMatchStep({
  extractedCustomerName,
  extractedCustomerAddress,
  matchedCustomerId,
  matchedCustomer,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerMatchStepProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all customers for matching
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-for-matching', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('id, name, code, address, city, state, zip, is_active')
        .eq('is_active', true)
        .order('name')
        .limit(20);

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`);
      } else if (extractedCustomerName) {
        // Try to find matches based on extracted name
        query = query.or(`name.ilike.%${extractedCustomerName.split(' ')[0]}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Highlight the AI-matched customer at the top
  const sortedCustomers = customers
    ? [...customers].sort((a, b) => {
        if (a.id === matchedCustomerId) return -1;
        if (b.id === matchedCustomerId) return 1;
        return 0;
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Extracted Customer Info */}
      {extractedCustomerName && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Extracted from PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Name:</strong> {extractedCustomerName}</p>
            {extractedCustomerAddress && (
              <p><strong>Address:</strong> {extractedCustomerAddress}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Customer
        </Button>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Select Customer</CardTitle>
          <CardDescription>
            Match this order to an existing customer or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2" />
              <p>No customers found</p>
              <Button variant="link" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Create New Customer
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={selectedCustomerId || ''}
              onValueChange={onSelectCustomer}
              className="space-y-2"
            >
              {sortedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                    selectedCustomerId === customer.id
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                  onClick={() => onSelectCustomer(customer.id)}
                >
                  <RadioGroupItem value={customer.id} id={customer.id} />
                  <Label
                    htmlFor={customer.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.code}
                          {customer.city && customer.state && (
                            <> • {customer.city}, {customer.state}</>
                          )}
                        </p>
                      </div>
                      {customer.id === matchedCustomerId && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          AI Match
                        </Badge>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {selectedCustomerId && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Customer selected
        </div>
      )}
    </div>
  );
}
