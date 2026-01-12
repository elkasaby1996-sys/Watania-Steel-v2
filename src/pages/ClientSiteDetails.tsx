import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber } from '@/lib/utils';
import { hasPermission } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchClientSiteSummary,
  updateClientSite,
  type ClientSiteDetails,
  type ClientSitePatch
} from '@/lib/clientsApi';

export function ClientSiteDetailsPage() {
  const { clientId, siteId } = useParams<{ clientId: string; siteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = hasPermission(user?.profile?.role, 'edit');

  const [siteSummary, setSiteSummary] = useState<ClientSiteDetails | null>(null);
  const [formState, setFormState] = useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    location_text: '',
    address: '',
    google_maps_url: '',
    notes: '',
    location_lat: '',
    location_lng: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!clientId || !siteId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    const loadSite = async () => {
      try {
        const data = await fetchClientSiteSummary(clientId, siteId, signal);
        if (signal.aborted) return;
        setSiteSummary(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load site details');
        setSiteSummary(null);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSite();

    return () => controller.abort();
  }, [clientId, siteId]);

  useEffect(() => {
    if (!siteSummary) return;
    setFormState({
      contact_name: siteSummary.contact_name ?? '',
      contact_phone: siteSummary.contact_phone ?? '',
      contact_email: siteSummary.contact_email ?? '',
      location_text: siteSummary.location_text ?? '',
      address: siteSummary.address ?? '',
      google_maps_url: siteSummary.google_maps_url ?? '',
      notes: siteSummary.notes ?? '',
      location_lat: siteSummary.location_lat?.toString() ?? '',
      location_lng: siteSummary.location_lng?.toString() ?? ''
    });
  }, [siteSummary]);

  const handleSave = async () => {
    if (!siteId) return;
    setSaving(true);
    setSaveError(null);

    const parseNumber = (value: string) => {
      if (!value.trim()) return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    try {
      const payload: ClientSitePatch = {
        contact_name: formState.contact_name?.toString() ?? null,
        contact_phone: formState.contact_phone?.toString() ?? null,
        contact_email: formState.contact_email?.toString() ?? null,
        location_text: formState.location_text?.toString() ?? null,
        address: formState.address?.toString() ?? null,
        google_maps_url: formState.google_maps_url?.toString() ?? null,
        notes: formState.notes?.toString() ?? null,
        location_lat: parseNumber(formState.location_lat),
        location_lng: parseNumber(formState.location_lng)
      };

      const updated = await updateClientSite(siteId, payload);
      setSiteSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          contact_name: updated.contact_name,
          contact_phone: updated.contact_phone,
          contact_email: updated.contact_email,
          location_text: updated.location_text,
          address: updated.address,
          google_maps_url: updated.google_maps_url,
          notes: updated.notes,
          location_lat: updated.location_lat,
          location_lng: updated.location_lng
        };
      });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save site details');
    } finally {
      setSaving(false);
    }
  };

  const contactRows = useMemo(() => (
    [
      { label: 'Contact Name', value: siteSummary?.contact_name },
      { label: 'Contact Phone', value: siteSummary?.contact_phone },
      { label: 'Contact Email', value: siteSummary?.contact_email },
      { label: 'Location Text', value: siteSummary?.location_text },
      { label: 'Address', value: siteSummary?.address },
      { label: 'Latitude', value: siteSummary?.location_lat?.toString() },
      { label: 'Longitude', value: siteSummary?.location_lng?.toString() }
    ]
  ), [siteSummary]);

  if (!clientId || !siteId) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/clients')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Clients
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Missing client or site information.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
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
          <h1 className="text-3xl font-headline font-bold text-foreground">
            {siteSummary?.site_name || 'Site Details'}
          </h1>
          <p className="text-muted-foreground">Site profile and delivery metrics</p>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading site details...</CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {siteSummary && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{siteSummary.total_orders.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{formatNumber(siteSummary.total_tons)}</p>
                  <p className="text-xs text-muted-foreground">Total Tons</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{siteSummary.last_order_date || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Last Order</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Site Contact & Location
                </CardTitle>
                <CardDescription>Contact and location information</CardDescription>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Contact Name</Label>
                    <Input
                      id="contact-name"
                      value={formState.contact_name ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contact_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input
                      id="contact-phone"
                      value={formState.contact_phone ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={formState.contact_email ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contact_email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-text">Location Text</Label>
                    <Input
                      id="location-text"
                      value={formState.location_text ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, location_text: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formState.address ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-maps">Google Maps URL</Label>
                    <Input
                      id="google-maps"
                      value={formState.google_maps_url ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, google_maps_url: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-lat">Latitude</Label>
                    <Input
                      id="location-lat"
                      type="number"
                      step="0.000001"
                      value={formState.location_lat ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, location_lat: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-lng">Longitude</Label>
                    <Input
                      id="location-lng"
                      type="number"
                      step="0.000001"
                      value={formState.location_lng ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, location_lng: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formState.notes ?? ''}
                      onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactRows.map((row) => (
                    <div key={row.label} className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-foreground">{row.value || '—'}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium text-foreground">{siteSummary.notes || '—'}</span>
                  </div>
                  {siteSummary.google_maps_url && (
                    <Button asChild variant="outline">
                      <a href={siteSummary.google_maps_url} target="_blank" rel="noreferrer">
                        Open in Maps
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
