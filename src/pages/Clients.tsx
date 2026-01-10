import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search, Building2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '@/lib/utils';
import { clientsApi, type ClientSummary } from '@/lib/clientsApi';

export function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchClients = useCallback(async (searchText?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientsApi.getClientsSummary(searchText);
      setClients(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchClients(searchQuery);
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [fetchClients, searchQuery]);

  const handleClientClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const lastUpdatedLabel = lastUpdated ? lastUpdated.toLocaleString() : '—';

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">
              Clients Database
            </h1>
            <p className="text-muted-foreground">
              Loading client data...
            </p>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">
              Clients Database
            </h1>
            <p className="text-muted-foreground">
              Manage and analyze client relationships
            </p>
          </div>
        </div>

        {/* Error Card */}
        <Card className="border-destructive">
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Failed to Load Clients</h3>
                <p className="text-muted-foreground mt-1">
                  {error || 'An unexpected error occurred while loading client data.'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchClients(searchQuery)}
              >
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">
            Clients Database
          </h1>
          <p className="text-muted-foreground">
            Manage and analyze client relationships across all orders
          </p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdatedLabel}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                id="clients-search"
                name="clientsSearch"
                placeholder="Search clients by company name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {clients.length} clients total
            </p>
          </div>
        </div>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Client Name</TableHead>
                  <TableHead className="text-foreground text-right">Total Orders</TableHead>
                  <TableHead className="text-foreground text-right">Total Tons</TableHead>
                  <TableHead className="text-foreground text-right">Sites</TableHead>
                  <TableHead className="text-foreground">Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length > 0 ? (
                  clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleClientClick(client.id)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {client.name}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {client.total_orders.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {formatNumber(client.total_tons)}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {client.unique_sites}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {client.last_order_date || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      <div className="space-y-3">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <div>
                          <p className="font-medium">No Clients Found</p>
                          <p className="text-sm">
                            {searchQuery
                              ? 'No clients match your search. Try a different term.'
                              : 'Client data will appear here once orders are created.'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
