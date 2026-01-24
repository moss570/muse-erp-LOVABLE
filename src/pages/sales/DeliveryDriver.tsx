import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Truck, CheckCircle, MapPin, Package } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export default function DeliveryDriver() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const signatureRef = useRef<any>(null);

  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [signerName, setSignerName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch pending deliveries
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['pending-deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_deliveries')
        .select('*')
        .order('ship_date')
        .order('shipment_number');

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get GPS location
  const captureLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast({
            title: 'Location Captured',
            description: 'GPS coordinates recorded',
          });
        },
        (error) => {
          toast({
            title: 'Location Error',
            description: 'Could not get GPS location',
            variant: 'destructive',
          });
        }
      );
    }
  };

  // Record signature mutation
  const recordSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!signatureRef.current || signatureRef.current.isEmpty()) {
        throw new Error('Please provide a signature');
      }

      if (!signerName.trim()) {
        throw new Error('Please enter the name of the person signing');
      }

      const signatureData = signatureRef.current.toDataURL();

      const { error } = await supabase.rpc('record_delivery_signature', {
        p_shipment_id: selectedShipment.shipment_id,
        p_signature_data: signatureData,
        p_signature_name: signerName,
        p_latitude: gpsCoords?.lat || null,
        p_longitude: gpsCoords?.lng || null,
        p_delivery_notes: deliveryNotes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      toast({
        title: 'Delivery Confirmed',
        description: `Shipment ${selectedShipment.shipment_number} marked as delivered`,
      });
      // Reset form
      setSelectedShipment(null);
      setSignerName('');
      setDeliveryNotes('');
      setGpsCoords(null);
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p>Loading deliveries...</p>
        </div>
      </div>
    );
  }

  // Signature capture view
  if (selectedShipment) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Delivery Confirmation</h1>
            <Button variant="outline" onClick={() => setSelectedShipment(null)}>
              Back to List
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Shipment #</Label>
                  <p className="font-medium">{selectedShipment.shipment_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order #</Label>
                  <p className="font-medium">{selectedShipment.order_number}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{selectedShipment.customer_name}</p>
                <p className="text-sm">
                  {selectedShipment.ship_to_address}<br />
                  {selectedShipment.ship_to_city}, {selectedShipment.ship_to_state} {selectedShipment.ship_to_zip}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cases</Label>
                  <p className="font-medium">{selectedShipment.total_cases || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pallets</Label>
                  <p className="font-medium">{selectedShipment.total_pallets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signer_name">Receiver Name *</Label>
                <Input
                  id="signer_name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Name of person receiving delivery"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_notes">Delivery Notes (optional)</Label>
                <Textarea
                  id="delivery_notes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any notes about the delivery..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>GPS Location</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={captureLocation}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Capture Location
                  </Button>
                </div>
                {gpsCoords && (
                  <p className="text-sm text-muted-foreground">
                    Location: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Signature *</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => signatureRef.current?.clear()}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg bg-muted/30">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-64 cursor-crosshair',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sign above to confirm delivery
              </p>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full"
            onClick={() => recordSignatureMutation.mutate()}
            disabled={recordSignatureMutation.isPending}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {recordSignatureMutation.isPending ? 'Confirming...' : 'Confirm Delivery'}
          </Button>
        </div>
      </div>
    );
  }

  // Delivery list view
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Today's Deliveries</h1>
            <p className="text-muted-foreground">
              {deliveries?.length || 0} pending deliveries
            </p>
          </div>
        </div>

        {deliveries?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No pending deliveries at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries?.map((delivery) => (
              <Card
                key={delivery.shipment_id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedShipment(delivery)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{delivery.customer_name}</h3>
                        <Badge variant="secondary">{delivery.customer_code}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delivery.ship_to_address}<br />
                        {delivery.ship_to_city}, {delivery.ship_to_state} {delivery.ship_to_zip}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {delivery.total_cases || 0} cases
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Shipment #</Label>
                      <p className="font-medium">{delivery.shipment_number}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Order #</Label>
                      <p className="font-medium">{delivery.order_number}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">BOL #</Label>
                      <p className="font-medium">{delivery.bol_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tracking #</Label>
                      <p className="font-medium">{delivery.tracking_number || '-'}</p>
                    </div>
                  </div>

                  {delivery.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <Label className="text-muted-foreground text-xs">Notes:</Label>
                      <p className="text-sm">{delivery.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
