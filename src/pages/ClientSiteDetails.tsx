import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Package,
  Weight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { clientsApi, type ClientOrderRow, type ClientSiteSummary } from '@/lib/clientsApi';
import { hasPermission } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const PAGE_SIZE = 25;

export function ClientSiteDetailsPage() {
  const { clientId, siteId } = useParams<{ clientId: string; siteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const canEdit = hasPermission(user?.profile?.role, 'edit');

  const [siteSummary, setSiteSummary] = useState<ClientSiteSummary | null>(null);
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [locationText, setLocationText] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchSiteSummary = useCallback(async () => {
    if (!clientId || !siteId) return;

    setLoading(true);
    setError(null);

    try {
      const siteData = await clientsApi.getClientSiteSummary(clientId, siteId);
      setSiteSummary(siteData);
      setOrdersTotal(siteData.total_orders);
      setContactName(siteData.contact_name ?? '');
      setContactPhone(siteData.contact_phone ?? '');
      setContactEmail(siteData.contact_email ?? '');
      setAddress(siteData.address ?? '');
      setLocationText(siteData.location_text ?? '');
      setGoogleMapsUrl(siteData.google_maps_url ?? '');
      setNotes(siteData.notes ?? '');
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site details');
      setSiteSummary(null);
      setOrdersTotal(0);
    } finally {
      setLoading(false);
    }
  }, [clientId, siteId]);

  const fetchSiteOrders = useCallback(async () => {
    if (!clientId || !siteSummary) return;

    setOrdersLoading(true);
    setOrdersError(null);

    if (siteSummary.total_orders === 0) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    try {
      const targetOffset = (ordersPage - 1) * PAGE_SIZE;
      const targetEnd = targetOffset + PAGE_SIZE;
      const collected: ClientOrderRow[] = [];
      let offset = 0;
      let totalClientOrders = 0;
      let attempts = 0;
      const maxAttempts = 20;

      while (collected.length < targetEnd && attempts < maxAttempts) {
        const { orders: pageRows, total } = await clientsApi.getClientOrdersPage(clientId, PAGE_SIZE, offset);
        totalClientOrders = total;

        if (pageRows.length === 0) {
          break;
        }

        collected.push(...pageRows.filter((row) => row.site === siteSummary.site_name));
        offset += PAGE_SIZE;
        attempts += 1;

        if (offset >= totalClientOrders) {
          break;
        }
      }

      setOrders(collected.slice(targetOffset, targetEnd));
      setOrdersTotal(siteSummary.total_orders);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Failed to load site orders');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [clientId, ordersPage, siteSummary]);

  useEffect(() => {
    fetchSiteSummary();
  }, [fetchSiteSummary]);

  useEffect(() => {
    fetchSiteOrders();
  }, [fetchSiteOrders]);

  useEffect(() => {
    setOrdersPage(1);
  }, [siteId, clientId]);

  useEffect(() => {
    if (!editDialogOpen || !siteSummary) return;
    setContactName(siteSummary.contact_name ?? '');
    setContactPhone(siteSummary.contact_phone ?? '');
    setContactEmail(siteSummary.contact_email ?? '');
    setAddress(siteSummary.address ?? '');
    setLocationText(siteSummary.location_text ?? '');
    setGoogleMapsUrl(siteSummary.google_maps_url ?? '');
    setNotes(siteSummary.notes ?? '');
  }, [editDialogOpen, siteSummary]);

  const totalPages = Math.ceil(ordersTotal / PAGE_SIZE);
  const startRecord = ordersTotal > 0 ? (ordersPage - 1) * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min(ordersPage * PAGE_SIZE, ordersTotal);

  const lastUpdatedLabel = lastUpdated ? lastUpdated.toLocaleString() : '—';

  const statusBadge = useMemo(() => {
    return (status: string | null) => {
      const statusStyles: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        delayed: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
      return statusStyles[status || ''] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };
  }, []);

  const handlePreviousPage = () => {
    setOrdersPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setOrdersPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleSaveDetails = async () => {
    if (!siteSummary) return;

    if (!canEdit) {
      toast({
        title: 'Permission denied',
        description: 'You need editor or admin access to update site details.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('client_sites')
        .update({
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          address: address.trim() || null,
          location_text: locationText.trim() || null,
          google_maps_url: googleMapsUrl.trim() || null,
          notes: notes.trim() || null,
        })
        .eq('id', siteSummary.site_id)
        .eq('client_id', siteSummary.client_id);

      if (updateError) {
        throw updateError;
      }

      setSiteSummary((prev) =>
        prev
          ? {
              ...prev,
              contact_name: contactName.trim() || null,
              contact_phone: contactPhone.trim() || null,
              contact_email: contactEmail.trim() || null,
              address: address.trim() || null,
              location_text: locationText.trim() || null,
              google_maps_url: googleMapsUrl.trim() || null,
              notes: notes.trim() || null,
            }
          : prev
      );
      setLastUpdated(new Date());
      setEditDialogOpen(false);
      toast({
        title: 'Site details updated',
        description: 'Contact and location information saved successfully.',
      });
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unable to update site details.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${clientId}`)}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Client
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">Loading site...</h1>
            <p className="text-muted-foreground">Fetching site details</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading site details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !siteSummary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${clientId}`)}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Client
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">Site Details</h1>
            <p className="text-muted-foreground">Unable to load this site</p>
          </div>
        </div>

        <Card className="border-destructive">
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Failed to Load Site</h3>
                <p className="text-muted-foreground mt-1">{error || 'An unexpected error occurred.'}</p>
              </div>
              <Button variant="outline" onClick={fetchSiteSummary}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/clients/${siteSummary.client_id}`)}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Client
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">{siteSummary.site_name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {siteSummary.client_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdatedLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Package className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{siteSummary.total_orders.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Weight className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{formatNumber(siteSummary.total_tons)}</p>
              <p className="text-xs text-muted-foreground">Total Tons</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{siteSummary.last_order_date || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Last Order</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Site Details</CardTitle>
              <CardDescription>Contact and location information</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
              disabled={!canEdit}
              title={!canEdit ? 'Editors or admins can edit site details.' : undefined}
            >
              Edit Site Details
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-muted-foreground">Contact Name</p>
              <p className="font-medium text-foreground">{siteSummary.contact_name || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Contact Phone</p>
              <p className="font-medium text-foreground">{siteSummary.contact_phone || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Contact Email</p>
              <p className="font-medium text-foreground">{siteSummary.contact_email || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">{siteSummary.address || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Location Notes</p>
              <p className="font-medium text-foreground">{siteSummary.location_text || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Google Maps</p>
              {siteSummary.google_maps_url ? (
                <Button variant="link" className="h-auto p-0" asChild>
                  <a href={siteSummary.google_maps_url} target="_blank" rel="noreferrer">
                    Open in Google Maps
                  </a>
                </Button>
              ) : (
                <p className="font-medium text-foreground">N/A</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Notes</p>
            <p className="text-sm text-foreground">{siteSummary.notes || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Site Details</DialogTitle>
            <DialogDescription>Update contact and location details for this site.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Site contact name"
                  disabled={!canEdit || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Contact phone number"
                  disabled={!canEdit || saving}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="contact@example.com"
                  disabled={!canEdit || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Street address"
                  disabled={!canEdit || saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationText">Location Description</Label>
              <Input
                id="locationText"
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="Street, landmark, or directions"
                disabled={!canEdit || saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
              <Input
                id="googleMapsUrl"
                value={googleMapsUrl}
                onChange={(event) => setGoogleMapsUrl(event.target.value)}
                placeholder="https://maps.google.com/..."
                disabled={!canEdit || saving}
              />
              {googleMapsUrl && (
                <Button variant="link" className="h-auto p-0" asChild>
                  <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                    Open in Google Maps
                  </a>
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Additional site notes"
                disabled={!canEdit || saving}
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-wrap justify-between gap-2">
            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                You need editor or admin access to update site details.
              </p>
            )}
            <Button onClick={handleSaveDetails} disabled={!canEdit || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Site Orders
          </CardTitle>
          <CardDescription>
            Orders for this site (showing {startRecord}-{endRecord} of {ordersTotal})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground text-sm">Loading site orders...</p>
              </div>
            </div>
          ) : ordersError ? (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <div>
                <p className="font-medium text-foreground">Unable to load site orders</p>
                <p className="text-sm text-muted-foreground">{ordersError}</p>
              </div>
              <Button variant="outline" onClick={fetchSiteOrders}>Retry</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">ID</TableHead>
                      <TableHead className="text-foreground">Date</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Type</TableHead>
                      <TableHead className="text-foreground">Shift</TableHead>
                      <TableHead className="text-foreground text-right">Tons</TableHead>
                      <TableHead className="text-foreground">Driver</TableHead>
                      <TableHead className="text-foreground">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <TableRow key={`${order.source}-${order.id}`} className="border-border">
                          <TableCell className="font-mono text-sm">
                            {order.delivery_number || order.id}
                          </TableCell>
                          <TableCell>{order.date || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={`${statusBadge(order.status)} border`}>
                              {order.status || 'unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {order.order_type?.replace('-', ' ') || 'N/A'}
                          </TableCell>
                          <TableCell className="capitalize">{order.shift || 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatNumber(order.tons || 0)}</TableCell>
                          <TableCell className="max-w-[120px] truncate" title={order.driver_name || ''}>
                            {order.driver_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.source === 'history_orders' ? 'History' : 'Active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                          <div className="space-y-3">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <div>
                              <p className="font-medium">No Orders Found</p>
                              <p className="text-sm">No orders found for this site.</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {ordersPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={ordersPage <= 1 || ordersLoading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={ordersPage >= totalPages || ordersLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
