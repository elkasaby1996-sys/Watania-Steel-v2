import { WorkspaceHeading } from '@/components/WorkspaceHeading';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  RotateCcw,
  Layers,
  Activity,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,

} from 'recharts';
import { formatNumber } from '@/lib/utils';
import {
  fetchAnalyticsSummary,
  fetchMaxDateAcrossTables,
  type AnalyticsSummary,
  type FilterMode,
} from '@/lib/steelAnalytics';
import { ROUTES } from '@/routes/routes';
import { useAuthStore } from '@/stores/authStore';
import './steel-analytics.css';

const RANGE_OPTIONS = [30, 60, 90, 180, 365] as const;

const formatDateLabel = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
  const userId = useAuthStore(state => state.user?.id);
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

        if (controller.signal.aborted) {
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
  }, [selectedRangeDays, filterMode, reloadToken, userId]);

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
    return totals.sort((a, b) => b.tons - a.tons).map((entry) => ({
      name: entry.label,
      value: entry.tons,
      percentage: totalBreakdown > 0 ? Math.round((entry.tons / totalBreakdown) * 1000) / 10 : 0,
    }));
  }, [analytics?.diameterTotals]);

  const handleReset = () => {
    setSelectedRangeDays(30);
    setFilterMode('all');
    setReloadToken((prev) => prev + 1);
  };

  const handleRetry = () => setReloadToken((prev) => prev + 1);

  const peakDay = lineChartData.reduce<(typeof lineChartData)[number] | null>(
    (peak, day) => !peak || day.tons > peak.tons ? day : peak, null,
  );
  const hasData = (analytics?.rowsAnalyzed ?? 0) > 0;
  const scopeLabel = filterMode === 'all' ? 'All steel' : filterMode === 'straight-bar' ? 'Straight bar' : 'Cut-and-bend';

  return (
    <div className="steel-analytics" aria-busy={loading}>
      <WorkspaceHeading
        eyebrow="Delivery intelligence"
        title="Steel analytics"
        description="A closer look at delivered steel, daily output, and diameter mix."
        backTo={ROUTES.dashboard}
      >
        <div className="analytics-update">
          <span><span className="analytics-status-dot" />Delivered steel only</span>
          {lastUpdated && <small>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}
        </div>
      </WorkspaceHeading>

      <section className="analytics-controls" aria-label="Analytics filters">
        <Tabs value={filterMode} onValueChange={(value) => setFilterMode(value as FilterMode)}>
          <TabsList className="analytics-tabs">
            <TabsTrigger value="all">All steel</TabsTrigger>
            <TabsTrigger value="straight-bar">Straight bar</TabsTrigger>
            <TabsTrigger value="cut-and-bend">Cut-and-bend</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="analytics-range-controls">
          <Calendar size={16} aria-hidden="true" />
          <Label htmlFor="time-range" className="sr-only">Time range</Label>
          <Select value={selectedRangeDays.toString()} onValueChange={(value) => setSelectedRangeDays(Number(value) as (typeof RANGE_OPTIONS)[number])}>
            <SelectTrigger id="time-range"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGE_OPTIONS.map(days => <SelectItem key={days} value={days.toString()}>Last {days} days</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleReset}><RotateCcw size={14} /> Reset</Button>
        </div>
      </section>
      <div className="analytics-period">
        <span>{scopeLabel} <span aria-hidden="true">/</span> {loading ? 'Updating period...' : range ? `${formatDateLabel(range.startDate)}, ${range.startDate.slice(0, 4)} to ${formatDateLabel(range.endDate)}, ${range.endDate.slice(0, 4)}` : 'No delivery period'}</span>
        <span>Range ends on the latest recorded delivery</span>
      </div>

      {error ? (
        <Card role="alert"><CardContent className="py-10 text-center space-y-4">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
          <h2 className="text-lg font-semibold">Unable to load analytics</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={handleRetry}>Try again</Button>
        </CardContent></Card>
      ) : loading ? (
        <div role="status" className="analytics-loading">
          <span className="sr-only">Loading analytics</span>
          <div className="analytics-skeleton analytics-skeleton-metrics" />
          <div className="analytics-skeleton analytics-skeleton-chart" />
        </div>
      ) : !hasData ? (
        <section className="analytics-empty">
          <BarChart3 size={32} /><h2>No delivered steel in this range</h2>
          <p>Choose another time range or steel type to explore your delivery data.</p>
          <Button variant="outline" onClick={handleReset}>Reset filters</Button>
        </section>
      ) : (<>
        <section className="analytics-metrics" aria-label="Delivery summary">
          <div className="analytics-metric analytics-metric-main">
            <span className="analytics-metric-label"><Layers size={15} />Total delivered</span>
            <p>{formatNumber(analytics?.totalTons ?? 0)}<small>t</small></p>
            <span>Actual tonnage in selected range</span>
          </div>
          <div className="analytics-metric">
            <span className="analytics-metric-label"><TrendingUp size={15} />Daily average</span>
            <p>{formatNumber(analytics?.dailyAverage ?? 0)}<small>t</small></p>
            <span>Across {selectedRangeDays} calendar days</span>
          </div>
          <div className="analytics-metric">
            <span className="analytics-metric-label"><Activity size={15} />Active days</span>
            <p>{analytics?.activeDays ?? 0}<small>/ {selectedRangeDays}</small></p>
            <span>Days with recorded deliveries</span>
          </div>
          <div className="analytics-metric">
            <span className="analytics-metric-label"><BarChart3 size={15} />Records analyzed</span>
            <p>{(analytics?.rowsAnalyzed ?? 0).toLocaleString()}</p>
            <span>Delivered records in this range</span>
          </div>
        </section>

        <div className="analytics-chart-grid">
          <Card className="analytics-chart-panel">
            <CardHeader className="analytics-panel-heading">
              <div><p className="eyebrow">01 / Delivery performance</p><h2>Daily delivered tonnage</h2><CardDescription>Actual steel deliveries across the selected period</CardDescription></div>
              <span className="analytics-unit">Metric tons</span>
            </CardHeader>
            <CardContent>
              <div className="analytics-chart-legend"><span><i />Delivered tons</span><span><i className="average-key" />Period average</span></div>
              <div className="analytics-trend-chart" role="img" aria-label={`Daily delivered tonnage. Average ${formatTonsLabel(analytics?.dailyAverage)}. Peak ${formatTonsLabel(peakDay?.tons)} on ${peakDay?.date}.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ top: 20, right: 18, left: -20, bottom: 8 }}>
                    <defs><linearGradient id="steelDeliveryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.01} /></linearGradient></defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--chart-grid)" />
                    <XAxis dataKey="date" stroke="var(--chart-axis)" fontSize={11} axisLine={false} tickLine={false} minTickGap={36} tickMargin={14} />
                    <YAxis stroke="var(--chart-axis)" fontSize={11} axisLine={false} tickLine={false} tickMargin={8} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: '8px', color: 'var(--chart-tooltip-text)' }} formatter={(value) => [`${formatMaxThreeDecimals(value)} tons`, 'Delivered']} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''} />
                    <ReferenceLine y={analytics?.dailyAverage ?? 0} stroke="var(--chart-axis)" strokeDasharray="5 5" />
                    <Area type="linear" dataKey="tons" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#steelDeliveryFill)" activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--color-card)' }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-chart-note"><TrendingUp size={16} /><span>Peak delivery <strong>{formatTonsLabel(peakDay?.tons)}</strong> on <strong>{peakDay?.date}</strong></span></div>
            </CardContent>
          </Card>
          <Card className="analytics-chart-panel">
            <CardHeader className="analytics-panel-heading"><div><p className="eyebrow">02 / Material mix</p><h2>Steel by diameter</h2><CardDescription>Share of recorded diameter tonnage</CardDescription></div></CardHeader>
            <CardContent>
              {pieChartData.length === 0 ? <p className="analytics-no-breakdown">No diameter breakdown recorded for these deliveries.</p> : <>
                <div className="analytics-mix-summary"><strong>{pieChartData[0].name}</strong><span>Most delivered diameter<br /><b>{formatPercentLabel(pieChartData[0].percentage)} of recorded mix</b></span></div>
                <div className="analytics-distribution-head"><span>Diameter</span><span>Tons / share</span></div>
                <ul className="analytics-distribution">{pieChartData.map((item, index) => (
                  <li key={item.name}>
                    <div><strong>{item.name}</strong><span>{formatMaxThreeDecimals(item.value)} <small>{formatPercentLabel(item.percentage)}</small></span></div>
                    <div className="analytics-bar-track"><div className={index === 0 ? 'analytics-bar-fill leading' : 'analytics-bar-fill'} style={{ width: `${item.percentage}%` }} /></div>
                  </li>
                ))}</ul>
              </>}
            </CardContent>
          </Card>
        </div>
        <footer className="analytics-footer"><span>Based on actual delivered steel. Undelivered orders are excluded.</span><span>Watania Steel / Operations</span></footer>
      </>)}
    </div>
  );
}
