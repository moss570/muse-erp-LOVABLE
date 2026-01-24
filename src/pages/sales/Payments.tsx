import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Upload, FileText, Plus, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Payments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'check',
    reference_number: '',
    notes: '',
    early_pay_discount: '',
    remittance_file: null as File | null
  });

  // Fetch payment receipts
  const { data: payments } = useQuery({
    queryKey: ['payment-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select(`
          *,
          customer:customers(id, name, code),
          applications:payment_applications(
            *,
            invoice:sales_invoices(invoice_number, total_amount)
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  // Fetch customers with outstanding balances
  const { data: customers } = useQuery({
    queryKey: ['customers-with-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get balance for each customer
      const customersWithBalance = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: balance } = await supabase
            .rpc('get_customer_balance', { p_customer_id: customer.id });
          return { ...customer, balance: balance || 0 };
        })
      );

      return customersWithBalance.filter(c => c.balance > 0);
    }
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Generate receipt number
      const { data: receiptNumber } = await supabase
        .rpc('generate_payment_receipt_number');

      // Upload remittance file if provided
      let remittanceUrl = null;
      if (paymentDetails.remittance_file) {
        const fileName = `${receiptNumber}_${paymentDetails.remittance_file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-remittances')
          .upload(fileName, paymentDetails.remittance_file);

        if (uploadError) throw uploadError;
        remittanceUrl = uploadData.path;
      }

      const amount = parseFloat(paymentDetails.amount);
      const earlyPayDiscount = paymentDetails.early_pay_discount ? parseFloat(paymentDetails.early_pay_discount) : 0;

      // Create payment receipt
      const { data: payment, error: paymentError } = await supabase
        .from('payment_receipts')
        .insert({
          receipt_number: receiptNumber,
          customer_id: selectedCustomerId,
          payment_date: paymentDetails.payment_date,
          amount: amount,
          payment_method: paymentDetails.payment_method,
          reference_number: paymentDetails.reference_number || null,
          early_pay_discount: earlyPayDiscount,
          notes: paymentDetails.notes || null,
          remittance_file_url: remittanceUrl,
          ai_processed: false, // Will be processed by edge function
          created_by: userId
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Apply payment to outstanding invoices
      const { error: applyError } = await supabase
        .rpc('apply_payment_to_invoices', {
          p_receipt_id: payment.id,
          p_applications: JSON.stringify([])
        });

      if (applyError) throw applyError;

      // If remittance file uploaded, trigger AI processing
      if (remittanceUrl) {
        await supabase.functions.invoke('process-payment-remittance', {
          body: { payment_receipt_id: payment.id }
        }).catch(err => {
          console.error('AI processing will run async:', err);
        });
      }

      return payment;
    },
    onSuccess: () => {
      toast({
        title: 'Payment recorded',
        description: 'Payment applied to outstanding invoices'
      });
      setIsRecordPaymentOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['payment-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-balances'] });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording payment',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setPaymentDetails({
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: 'check',
      reference_number: '',
      notes: '',
      early_pay_discount: '',
      remittance_file: null
    });
    setSelectedCustomerId('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentDetails(prev => ({ ...prev, remittance_file: e.target.files![0] }));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Receipts</h1>
          <p className="text-muted-foreground">Record customer payments and process remittances</p>
        </div>
        <Button onClick={() => setIsRecordPaymentOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payments Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${payments?.filter(p =>
                new Date(p.payment_date).toDateString() === new Date().toDateString()
              ).reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Outstanding Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${customers?.reduce((sum, c) => sum + c.balance, 0).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Payment receipts and applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Early Pay Disc.</TableHead>
                <TableHead className="text-center">AI Processed</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                  <TableCell>{format(new Date(payment.payment_date), 'PP')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{payment.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{payment.customer.code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${payment.amount?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.early_pay_discount ? `$${payment.early_pay_discount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {payment.ai_processed ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                    ) : payment.remittance_file_url ? (
                      <Badge variant="secondary">Pending</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{payment.reference_number || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment Receipt</DialogTitle>
            <DialogDescription>
              Record a customer payment and apply to outstanding invoices
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.code}) - Balance: ${customer.balance.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentDetails.payment_date}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentDetails.amount}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={paymentDetails.payment_method}
                  onValueChange={(v) => setPaymentDetails(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="ach">ACH</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  placeholder="Check #, confirmation #, etc."
                  value={paymentDetails.reference_number}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, reference_number: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Early Pay Discount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentDetails.early_pay_discount}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, early_pay_discount: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remittance File (AI Processing)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload remittance advice for AI processing to auto-match invoices
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Payment notes..."
                value={paymentDetails.notes}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRecordPaymentOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => recordPaymentMutation.mutate()}
              disabled={
                !selectedCustomerId ||
                !paymentDetails.amount ||
                recordPaymentMutation.isPending
              }
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
