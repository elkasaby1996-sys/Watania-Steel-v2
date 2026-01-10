import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, Loader2, MapPin, Package, Weight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatNumber } from '@/lib/utils';
import { clientsService, type ClientSiteSummary, type ClientSiteUpdate } from '@/services/clientsService';

export function ClientSiteDetailsPage() {
  const { clientId, siteId } = useParams<{ clientId: string; siteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [siteSummary, setSiteSummary] = useState<ClientSiteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formState, setFormState] = useState<ClientSiteUpdate>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEdit = user?.profile?.role === 'admin' || user?.profile?.role === 'editor';
  const displayValue = (value?: string | null) => (value && value.trim() ? value : '—');

  const fetchSiteSummary = useCallback(async () => {
    if (!clientId || !siteId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await clientsService.getClientSiteSummary(clientId, siteId);
      setSiteSummary(data);
      setFormState({
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        location_text: data.location_text,
        google_maps_url: data.google_maps_url,
        notes: data.notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site details');
      setSiteSummary(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, siteId]);

  useEffect(() => {
    fetchSiteSummary();
  }, [fetchSiteSummary]);

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (open && siteSummary) {
      setFormState({
        contact_name: siteSummary.contact_name,
        contact_phone: siteSummary.contact_phone,
        location_text: siteSummary.location_text,
        google_maps_url: siteSummary.google_maps_url,
        notes: siteSummary.notes,
      });
      setSaveError(null);
    }
  };

  const handleInputChange = (field: keyof ClientSiteUpdate) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!siteId) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const updated = await clientsService.updateClientSite(siteId, formState);
      setSiteSummary((prev) => (prev ? { ...prev, ...updated } : prev));
      setDetailsOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save updates');
    } finally {
      setSaveLoading(false);
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
            <CardDescription>Contact and delivery details for this site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Contact Name</span>
              <span className="font-medium text-foreground">{displayValue(siteSummary.contact_name)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Contact Phone</span>
              <span className="font-medium text-foreground">{displayValue(siteSummary.contact_phone)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-foreground text-right max-w-[60%]">
                {displayValue(siteSummary.location_text)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Google Maps</span>
              {siteSummary.google_maps_url ? (
                <a
                  href={siteSummary.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Open map
                </a>
              ) : (
                <span className="font-medium text-foreground">{displayValue(siteSummary.google_maps_url)}</span>
              )}
            </div>
            <div className="flex justify-between items-start py-2">
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium text-foreground text-right max-w-[60%] whitespace-pre-wrap">
                {displayValue(siteSummary.notes)}
              </span>
            </div>
            {canEdit && (
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => handleDetailsOpenChange(true)}>Edit Details</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Site Details</DialogTitle>
            <DialogDescription>Update contact and location information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {saveError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Contact Name</label>
              <Input
                value={formState.contact_name ?? ''}
                onChange={handleInputChange('contact_name')}
                disabled={!canEdit}
                placeholder="Site contact"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Contact Phone</label>
              <Input
                value={formState.contact_phone ?? ''}
                onChange={handleInputChange('contact_phone')}
                disabled={!canEdit}
                placeholder="+974 ..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Location</label>
              <Input
                value={formState.location_text ?? ''}
                onChange={handleInputChange('location_text')}
                disabled={!canEdit}
                placeholder="Site address or notes"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Google Maps URL</label>
              <Input
                value={formState.google_maps_url ?? ''}
                onChange={handleInputChange('google_maps_url')}
                disabled={!canEdit}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Notes</label>
              <textarea
                value={formState.notes ?? ''}
                onChange={handleInputChange('notes')}
                disabled={!canEdit}
                placeholder="Additional notes"
                className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
