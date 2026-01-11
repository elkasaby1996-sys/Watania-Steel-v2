import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchClientSiteSummary, type ClientSiteSummary } from '@/lib/clientsApi';
import { formatNumber } from '@/lib/utils';

export function ClientSiteDetailsPage() {
  const { clientId, siteId } = useParams<{ clientId: string; siteId: string }>();
  const navigate = useNavigate();

  const [siteSummary, setSiteSummary] = useState<ClientSiteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !siteId) return;

    const controller = new AbortController();
    const { signal } = controller;

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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Site Details
              </CardTitle>
              <CardDescription>Contact and location information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-muted-foreground">Site Name</span>
                <span className="font-medium text-foreground">{siteSummary.site_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-muted-foreground">Contact Name</span>
                <span className="font-medium text-foreground">{siteSummary.contact_name || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-muted-foreground">Contact Phone</span>
                <span className="font-medium text-foreground">{siteSummary.contact_phone || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium text-foreground">{siteSummary.location_text || '—'}</span>
              </div>
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
