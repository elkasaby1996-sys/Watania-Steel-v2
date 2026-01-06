import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, Building2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { slugifyCompany, formatNumber } from '@/lib/utils';
import { useClientsStore } from '@/stores/clientsStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function Clients() {
  const navigate = useNavigate();
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    loadClients,
    getFilteredClients,
  } = useClientsStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebouncedValue(localSearch, 300);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const filteredClients = getFilteredClients();

  const handleClientClick = (company: string) => {
    const slug = slugifyCompany(company);
    navigate(`/clients/${slug}`);
  };

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
                onClick={() => loadClients()}
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
            Manage and analyze client relationships derived from order history (last 180 days)
          </p>
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
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredClients.length} clients total
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
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow
                      key={client.company}
                      className="border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleClientClick(client.company)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {client.company}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {client.totalOrders.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {formatNumber(client.totalTons)}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {client.uniqueSitesCount}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {client.lastOrderDate || 'N/A'}
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
