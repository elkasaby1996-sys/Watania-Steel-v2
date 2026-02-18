import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Calendar, Filter, Trophy, Plus, Edit, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { offcutUsageService, OffcutUsageEntry, DiameterTotal } from '../lib/supabase';
import { AddOffcutEntriesModal } from '@/components/AddOffcutEntriesModal';
import { EditOffcutEntryModal } from '@/components/EditOffcutEntryModal';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  buildExecutiveOffcutReportData,
  ProductionRow
} from '@/reports/offcut/buildExecutiveOffcutReportData';
import { ROUTES } from '@/routes/routes';

type ViewMode = 'daily' | 'monthly' | 'range';

// Generate month options for selector
const getMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
  }
  return months;
};

export function OffcutUsage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Check if user can edit/delete (Admin or Editor)
  const canEditDelete = hasPermission(user?.profile?.role, 'edit');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  // Filter state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Data state - filtered dataset stored in state for later calculations
  const [filteredEntries, setFilteredEntries] = useState<OffcutUsageEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openingExecutiveReport, setOpeningExecutiveReport] = useState<boolean>(false);
  const canExportExecutive =
    user?.profile?.role === 'admin';

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<OffcutUsageEntry | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deletingEntry, setDeletingEntry] = useState<OffcutUsageEntry | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Month options for selector
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Calculate diameter totals from the filtered dataset
  const diameterTotals = useMemo<DiameterTotal[]>(() => {
    return offcutUsageService.calculateDiameterTotals(filteredEntries);
  }, [filteredEntries]);

  // Calculate summary stats from the filtered dataset
  const summaryStats = useMemo(() => {
    const totalPieces = filteredEntries.reduce((sum, e) => sum + e.pieces_used, 0);
    const totalWeightTons = filteredEntries.reduce((sum, e) => sum + e.weight_tons, 0);
    const entryCount = filteredEntries.length;
    const averageTonsPerEntry = entryCount > 0 ? totalWeightTons / entryCount : 0;

    return {
      totalPieces,
      totalWeightTons: totalWeightTons.toFixed(3),
      averageTonsPerEntry: averageTonsPerEntry.toFixed(3),
      entryCount
    };
  }, [filteredEntries]);

  // Calculate Top 3 Most Used Diameters by weight (tons)
  const topDiameters = useMemo(() => {
    const totalTons = filteredEntries.reduce((sum, e) => sum + e.weight_tons, 0);
    // Sort diameterTotals by total_tons descending and take top 3
    return diameterTotals
      .slice()
      .sort((a, b) => b.total_tons - a.total_tons)
      .slice(0, 3)
      .map((d, index) => ({
        ...d,
        rank: index + 1,
        percentage: totalTons > 0 ? ((d.total_tons / totalTons) * 100).toFixed(1) : '0.0'
      }));
  }, [diameterTotals, filteredEntries]);

  // Fetch data based on view mode
  const fetchData = async () => {
    setLoading(true);
    try {
      let data: OffcutUsageEntry[] = [];

      switch (viewMode) {
        case 'daily':
          data = await offcutUsageService.getByDate(selectedDate);
          break;
        case 'monthly': {
          const [year, month] = selectedMonth.split('-').map(Number);
          data = await offcutUsageService.getByMonth(year, month);
          break;
        }
        case 'range':
          data = await offcutUsageService.getByDateRange(startDate, endDate);
          break;
      }

      setFilteredEntries(data);
    } catch (error) {
      console.error('Failed to fetch offcut usage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load offcut usage data. Please try again.',
        variant: 'destructive'
      });
      setFilteredEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [viewMode, selectedDate, selectedMonth, startDate, endDate]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateRange = () => {
    switch (viewMode) {
      case 'daily':
        return { start: selectedDate, end: selectedDate };
      case 'monthly': {
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { start, end };
      }
      case 'range':
        return { start: startDate, end: endDate };
    }
  };

  const fetchProductionRows = async (dateRange: { start: string; end: string }) => {
    const selectFields =
      'date,tons,order_type,company,breakdown_8mm,breakdown_10mm,breakdown_12mm,breakdown_14mm,breakdown_16mm,breakdown_18mm,breakdown_20mm,breakdown_25mm,breakdown_32mm';

    const [ordersResponse, historyResponse] = await Promise.all([
      supabase
        .from('orders')
        .select(selectFields)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .eq('order_type', 'cut-and-bend'),
      supabase
        .from('history_orders')
        .select(selectFields)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .eq('order_type', 'cut-and-bend')
    ]);

    if (ordersResponse.error) {
      throw ordersResponse.error;
    }
    if (historyResponse.error) {
      throw historyResponse.error;
    }

    return [
      ...(ordersResponse.data || []),
      ...(historyResponse.data || [])
    ] as ProductionRow[];
  };

  const handleExportExecutivePdf = async () => {
    if (filteredEntries.length === 0) {
      toast({
        title: 'No data in selected range',
        description: 'Adjust the filters to include offcut usage records.',
      });
      return;
    }
    setOpeningExecutiveReport(true);
    try {
      const dateRange = getDateRange();
      const ytdStart = `${new Date(dateRange.end).getFullYear()}-01-01`;
      let ytdRows = filteredEntries;
      if (dateRange.start > ytdStart) {
        try {
          ytdRows = await offcutUsageService.getByDateRange(ytdStart, dateRange.end);
        } catch (error) {
          console.error('Failed to fetch YTD offcut usage:', error);
          ytdRows = filteredEntries;
        }
      }

      let productionRows: ProductionRow[] = [];
      try {
        productionRows = await fetchProductionRows(dateRange);
      } catch (error) {
        console.error('Failed to fetch production data:', error);
        toast({
          title: 'Production data unavailable',
          description: 'The report will note production data as unavailable.',
        });
      }

      const reportData = buildExecutiveOffcutReportData({
        startDate: dateRange.start,
        endDate: dateRange.end,
        offcutRows: filteredEntries,
        productionRows,
        ytdOffcutRows: ytdRows,
        now: new Date()
      });

      sessionStorage.setItem('offcutExecutiveReport', JSON.stringify(reportData));
      const reportUrl = `${window.location.origin}${ROUTES.offcutExecutiveReport}`;
      const reportWindow = window.open(reportUrl, '_blank', 'noopener,noreferrer');
      if (!reportWindow) {
        navigate(ROUTES.offcutExecutiveReport);
      }
    } catch (error) {
      console.error('Failed to generate executive report:', error);
      toast({
        title: 'Failed to generate report',
        description: 'Please try again in a moment.',
        variant: 'destructive'
      });
    } finally {
      setOpeningExecutiveReport(false);
    }
  };

  // Handle edit action
  const handleEdit = (entry: OffcutUsageEntry) => {
    setEditingEntry(entry);
    setEditModalOpen(true);
  };

  // Handle delete action - show confirmation
  const handleDeleteClick = (entry: OffcutUsageEntry) => {
    setDeletingEntry(entry);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;

    setDeleting(true);
    try {
      await offcutUsageService.delete(deletingEntry.id);
      toast({
        title: 'Success',
        description: 'Offcut entry deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setDeletingEntry(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete offcut entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete offcut entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Get filter description text
  const getFilterDescription = () => {
    switch (viewMode) {
      case 'daily':
        return `Showing entries for ${formatDate(selectedDate)}`;
      case 'monthly': {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        return `Showing entries for ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      }
      case 'range':
        return `Showing entries from ${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.dashboard)}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">
              Offcut Usage
            </h1>
            <p className="text-muted-foreground">
              Track and analyze offcut steel usage across operations
            </p>
          </div>
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
        >
          <Plus size={20} className="mr-2" />
          Add Entries
        </Button>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Options
            </CardTitle>
            {canExportExecutive && (
              <div
                className="flex"
                onClick={() => {
                  if (filteredEntries.length === 0) {
                    toast({
                      title: 'No data in selected range',
                      description: 'Adjust the filters to include offcut usage records.',
                    });
                  }
                }}
                title={
                  filteredEntries.length === 0
                    ? 'No data in selected range'
                    : undefined
                }
              >
                <Button
                  onClick={handleExportExecutivePdf}
                  disabled={filteredEntries.length === 0 || openingExecutiveReport}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  <FileDown size={18} className="mr-2" />
                  {openingExecutiveReport ? 'Opening…' : 'Open Executive Report'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily View</TabsTrigger>
              <TabsTrigger value="monthly">Monthly View</TabsTrigger>
              <TabsTrigger value="range">Date Range</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter Inputs based on view mode */}
          <div className="flex flex-wrap gap-4 items-end">
            {viewMode === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="date-picker" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Select Date
                </Label>
                <Input
                  id="date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            )}

            {viewMode === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="month-picker" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Select Month
                </Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-picker" className="w-[200px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewMode === 'range' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </>
            )}
          </div>

          {/* Filter Description */}
          <p className="text-sm text-muted-foreground">{getFilterDescription()}</p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading offcut usage data...</p>
          </div>
        </div>
      )}

      {/* Content when not loading */}
      {!loading && (
        <>
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pieces Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.totalPieces.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tons Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {summaryStats.totalWeightTons}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average per Entry (Tons)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.averageTonsPerEntry}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {summaryStats.entryCount} {summaryStats.entryCount === 1 ? 'entry' : 'entries'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Most Used Diameters */}
          {topDiameters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top 3 Most Used Diameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topDiameters.map((diameter) => (
                    <Card
                      key={diameter.bar_diameter}
                      className={`border-2 ${
                        diameter.rank === 1
                          ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20'
                          : diameter.rank === 2
                          ? 'border-gray-400 bg-gray-50/50 dark:bg-gray-950/20'
                          : 'border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                      }`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={`text-lg px-3 py-1 ${
                              diameter.rank === 1
                                ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                                : diameter.rank === 2
                                ? 'border-gray-400 text-gray-600 dark:text-gray-300'
                                : 'border-amber-700 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {diameter.bar_diameter}
                          </Badge>
                          <span
                            className={`text-sm font-semibold ${
                              diameter.rank === 1
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : diameter.rank === 2
                                ? 'text-gray-500 dark:text-gray-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            #{diameter.rank}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">
                            {diameter.total_tons.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">tons</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {diameter.percentage}% of total
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diameter Totals */}
          {diameterTotals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per-Diameter Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bar Diameter</TableHead>
                        <TableHead className="text-right">Total Pieces</TableHead>
                        <TableHead className="text-right">Total Weight (tons)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diameterTotals.map((total) => (
                        <TableRow key={total.bar_diameter}>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {total.bar_diameter}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {total.total_pieces.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {total.total_tons.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Grand Total Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Grand Total</TableCell>
                        <TableCell className="text-right">
                          {summaryStats.totalPieces.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {summaryStats.totalWeightTons}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Offcut Usage Entries
                {filteredEntries.length > 0 && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    ({filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No offcut entries found for the selected period.</p>
                  <p className="text-sm mt-2">
                    Try adjusting the filter criteria or selecting a different date range.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Bar Diameter</TableHead>
                        <TableHead className="text-right">Pieces Used</TableHead>
                        <TableHead className="text-right">Weight (kg)</TableHead>
                        <TableHead className="text-right">Weight (tons)</TableHead>
                        <TableHead>Notes</TableHead>
                        {canEditDelete && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell className="font-medium">{entry.company}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.bar_diameter}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.pieces_used.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.weight_kg.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.weight_tons.toFixed(3)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {entry.notes || '-'}
                          </TableCell>
                          {canEditDelete && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(entry)}
                                  title="Edit entry"
                                  className="h-8 w-8 p-0 hover:bg-accent"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(entry)}
                                  title="Delete entry"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Offcut Entries Modal */}
      <AddOffcutEntriesModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        selectedDate={selectedDate}
        onSuccess={fetchData}
      />

      {/* Edit Offcut Entry Modal */}
      <EditOffcutEntryModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        entry={editingEntry}
        onSuccess={fetchData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offcut Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this offcut entry?
              {deletingEntry && (
                <span className="block mt-2 text-foreground">
                  <strong>{deletingEntry.company}</strong> - {deletingEntry.bar_diameter} ({deletingEntry.weight_tons.toFixed(3)} tons)
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
