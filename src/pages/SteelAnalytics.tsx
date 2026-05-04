import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Calculator,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '@/lib/utils';
import {
  fetchAnalyticsSummary,
  fetchMaxDateAcrossTables,
  type AnalyticsSummary,
  type FilterMode,
} from '@/lib/steelAnalytics';
import { ROUTES } from '@/routes/routes';

const RANGE_OPTIONS = [30, 60, 90, 180, 365] as const;

const COLORS = [
  '#8B5CF6',
  '#14B8A6',
  '#F59E0B',
  '#EC4899',
  '#10B981',
  '#F97316',
  '#06B6D4',
  '#EF4444',
  '#6366F1',
];

const formatDateLabel = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateValue = (date: Date) => date.toISOString().split('T')[0];

const formatMaxThreeDecimals = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';

  return number.toLocaleString('en-US', {
    maximumFractionDigits: 3,
  });
};

const formatTonsLabel = (value: unknown) => `${formatMaxThreeDecimals(value)}t`;

const formatPercentLabel = (value: unknown) => `${formatMaxThreeDecimals(value)}%`;

const subtractDays = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return formatDateValue(date);
};

export function SteelAnalytics() {
  const navigate = useNavigate();
  const [selectedRangeDays, setSelectedRangeDays] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [range, setRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const maxDate = await fetchMaxDateAcrossTables(filterMode, controller.signal);

        if (!maxDate) {
          if (!isMounted) return;
          setRange(null);
          setAnalytics(null);
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }

        const endDate = maxDate;
        const startDate = subtractDays(endDate, selectedRangeDays - 1);

        const summary = await fetchAnalyticsSummary({
          startDate,
          endDate,
          mode: filterMode,
          signal: controller.signal,
        });

        if (!isMounted) return;

        setRange({ startDate, endDate });
        setAnalytics(summary);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;

        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
        setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedRangeDays, filterMode, reloadToken]);

  const lineChartData = useMemo(() => (
    (analytics?.timeSeries ?? []).map((entry) => ({
      date: formatDateLabel(entry.date),
      tons: entry.tons,
      fullDate: entry.date,
    }))
  ), [analytics?.timeSeries]);

  const pieChartData = useMemo(() => {
    const totals = (analytics?.diameterTotals ?? []).filter((entry) => entry.tons > 0);
    const totalBreakdown = totals.reduce((sum, entry) => sum + entry.tons, 0);
    return totals.map((entry) => ({
      name: entry.label,
      value: entry.tons,
      percentage: totalBreakdown > 0 ? Math.round((entry.tons / totalBreakdown) * 1000) / 10 : 0,
    }));
  }, [analytics?.diameterTotals]);

  const handleReset = () => {
    setSelectedRangeDays(30);
    setReloadToken((prev) => prev + 1);
  };

  const handleRetry = () => setReloadToken((prev) => prev + 1);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-4">
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
            Steel Analytics
          </h1>
          <p className="text-muted-foreground">
            Performance overview based on delivered steel usage
          </p>
        </div>
        {lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </div>

      {/* Time Range Selector */}
      <section className="rounded-xl border border-border/80 bg-card/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Analytics Range
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,320px)_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="time-range" className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    Time Range
                  </Label>
                  <Select
                    value={selectedRangeDays.toString()}
                    onValueChange={(value) => setSelectedRangeDays(Number(value) as (typeof RANGE_OPTIONS)[number])}
                  >
                    <SelectTrigger id="time-range" className="h-10 bg-background text-foreground border-border">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      {RANGE_OPTIONS.map((days) => (
                        <SelectItem key={days} value={days.toString()}>
                          Last {days} Days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Analyzing
                  </p>
                  <p className="mt-1 whitespace-nowrap font-mono text-sm text-foreground">
                    {range ? `${range.startDate} to ${range.endDate}` : 'No data'}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleReset}
              variant="outline"
              className="h-10 w-full shrink-0 lg:w-36"
            >
              Reset
            </Button>
          </div>

          <Tabs value={filterMode} onValueChange={(value) => setFilterMode(value as FilterMode)}>
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 bg-muted/35 p-1 sm:grid-cols-3">
              <TabsTrigger value="all" className="min-h-9 whitespace-normal px-3 text-xs sm:text-sm">
                Total
              </TabsTrigger>
              <TabsTrigger value="straight-bar" className="min-h-9 whitespace-normal px-3 text-xs sm:text-sm">
                Straight Bar
              </TabsTrigger>
              <TabsTrigger value="cut-and-bend" className="min-h-9 whitespace-normal px-3 text-xs sm:text-sm">
                Cut-and-Bend
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Failed to Load Analytics</h3>
                <p className="text-muted-foreground mt-1">
                  {error}
                </p>
              </div>
              <Button variant="outline" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actual Totals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actual Totals
          </CardTitle>
          <CardDescription>
            Summary metrics derived from actual tons in the selected range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4">
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((key) => (
                  <div key={key} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Calculator className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatNumber(analytics?.totalTons ?? 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tons (Actual in Range)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-muted-foreground">Daily Average (Range)</p>
                  <p className="font-semibold text-foreground">
                    {formatNumber(analytics?.dailyAverage ?? 0)} tons
                  </p>
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-muted-foreground">Active Days</p>
                  <p className="font-semibold text-foreground">{analytics?.activeDays ?? 0} days</p>
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-muted-foreground">Rows Analyzed</p>
                  <p className="font-semibold text-foreground">{analytics?.rowsAnalyzed ?? 0} rows</p>
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-muted-foreground">Total Tons (Actual)</p>
                  <p className="font-semibold text-foreground">
                    {formatNumber(analytics?.totalTons ?? 0)} tons
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tons vs Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tons vs Time
            </CardTitle>
            <CardDescription>Steel delivery trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 bg-muted animate-pulse rounded" />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--chart-axis)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="var(--chart-axis)"
                      fontSize={12}
                      label={{ value: 'Tons', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--chart-tooltip-bg)',
                        border: '1px solid var(--chart-tooltip-border)',
                        borderRadius: '8px',
                        color: 'var(--chart-tooltip-text)',
                      }}
                      formatter={(value) => [`${formatMaxThreeDecimals(value)} tons`, 'Total Delivered']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                    />
                    <Line
                      type="monotone"
                      dataKey="tons"
                      stroke="hsl(340, 80%, 60%)"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(340, 80%, 60%)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(340, 80%, 60%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Steel Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Steel Size Distribution</CardTitle>
            <CardDescription>Breakdown by steel bar diameter</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 bg-muted animate-pulse rounded" />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={140}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--chart-tooltip-bg)',
                          border: '1px solid var(--chart-tooltip-border)',
                          borderRadius: '8px',
                          color: 'var(--chart-tooltip-text)',
                        }}
                        formatter={(value, _, props) => [
                          `${formatTonsLabel(value)} (${formatPercentLabel(props?.payload?.percentage ?? 0)})`,
                          props?.payload?.name ?? '',
                        ]}
                        labelFormatter={() => ''}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {pieChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-foreground">
                        {item.name}: {formatTonsLabel(item.value)} ({formatPercentLabel(item.percentage)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analytics...
        </div>
      )}
    </div>
  );
}
