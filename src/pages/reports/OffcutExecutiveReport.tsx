import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { offcutUsageService, OffcutUsageEntry } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

interface BreakdownItem {
  label: string;
  tons: number;
  share: number;
}

interface RankedItem {
  name: string;
  tons: number;
  share: number;
}

const formatTons = (value: number) => value.toFixed(3);
const formatShare = (value: number) => value.toFixed(1);

const getOptionalField = (entry: OffcutUsageEntry, keys: string[]) => {
  const record = entry as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export const OffcutExecutiveReport = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [entries, setEntries] = useState<OffcutUsageEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const isAuthorized =
    user?.profile?.role === 'admin' || user?.profile?.role === 'executive';

  useEffect(() => {
    const load = async () => {
      if (!from || !to || !isAuthorized) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await offcutUsageService.getByDateRange(from, to);
        setEntries(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [from, to, isAuthorized]);

  const reportData = useMemo(() => {
    let totalTons = 0;
    let totalPieces = 0;
    let exceptions = 0;

    const diameterMap = new Map<string, number>();
    const clientMap = new Map<string, number>();
    const siteMap = new Map<string, number>();

    entries.forEach((entry) => {
      const date = entry.date?.trim();
      const diameter = entry.bar_diameter?.trim();
      const client = entry.company?.trim();
      const site = getOptionalField(entry, ['site', 'site_name', 'location', 'facility']);

      const tons = Number(entry.weight_tons);
      const pieces = Number(entry.pieces_used);

      if (!date || !diameter || !client || !Number.isFinite(tons)) {
        exceptions += 1;
      }

      if (Number.isFinite(tons)) {
        totalTons += tons;
        if (diameter) {
          diameterMap.set(diameter, (diameterMap.get(diameter) || 0) + tons);
        }
        if (client) {
          clientMap.set(client, (clientMap.get(client) || 0) + tons);
        }
        if (site) {
          siteMap.set(site, (siteMap.get(site) || 0) + tons);
        }
      }

      if (Number.isFinite(pieces)) {
        totalPieces += pieces;
      }
    });

    const diameterBreakdown: BreakdownItem[] = Array.from(diameterMap.entries())
      .map(([label, tons]) => ({
        label,
        tons,
        share: totalTons > 0 ? (tons / totalTons) * 100 : 0
      }))
      .sort((a, b) => b.tons - a.tons);

    const topClients: RankedItem[] = Array.from(clientMap.entries())
      .map(([name, tons]) => ({
        name,
        tons,
        share: totalTons > 0 ? (tons / totalTons) * 100 : 0
      }))
      .sort((a, b) => b.tons - a.tons)
      .slice(0, 10);

    const topSites: RankedItem[] = Array.from(siteMap.entries())
      .map(([name, tons]) => ({
        name,
        tons,
        share: totalTons > 0 ? (tons / totalTons) * 100 : 0
      }))
      .sort((a, b) => b.tons - a.tons)
      .slice(0, 10);

    return {
      totalTons,
      totalPieces,
      diameterBreakdown,
      topClients,
      topSites,
      exceptions
    };
  }, [entries]);

  const preparedBy =
    user?.profile?.email || user?.email || 'Executive User';

  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <div className="border border-slate-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Not authorized</h1>
          <p className="text-slate-500 mt-2">
            You do not have permission to access this report.
          </p>
        </div>
      </div>
    );
  }

  if (!from || !to) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <div className="border border-slate-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Missing date range</h1>
          <p className="text-slate-500 mt-2">
            Please open the report from Offcut Usage to include a valid date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-900 min-h-screen print:bg-white">
      <div className="print-page max-w-5xl mx-auto px-8 py-10 space-y-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-semibold">
              Offcut Usage — Executive Report
            </h1>
            <p className="text-slate-500 mt-1">
              Date Range: {from} to {to}
            </p>
            <p className="text-slate-500">Generated at: {generatedAt}</p>
            <p className="text-slate-500">Prepared by: {preparedBy}</p>
          </div>
          <div className="print-hidden">
            <Button onClick={() => window.print()} className="bg-slate-900 text-white">
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500">
            Loading report data...
          </div>
        ) : (
          <>
            <section className="border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Executive KPIs</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Opening', value: formatTons(0) },
                  { label: 'Added', value: formatTons(0) },
                  { label: 'Used', value: formatTons(reportData.totalTons) },
                  { label: 'Closing', value: formatTons(0) }
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                  >
                    <p className="text-xs uppercase text-slate-500">{kpi.label}</p>
                    <p className="text-xl font-semibold mt-2">{kpi.value} tons</p>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-500">
                Total pieces used: {reportData.totalPieces.toLocaleString()} •
                Exceptions: {reportData.exceptions}
              </div>
            </section>

            <section className="border border-slate-200 rounded-lg p-6 space-y-6">
              <h2 className="text-lg font-semibold">Tons by Diameter</h2>
              <div className="space-y-3">
                {reportData.diameterBreakdown.length === 0 && (
                  <div className="text-slate-500">No data available.</div>
                )}
                {reportData.diameterBreakdown.slice(0, 8).map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span>{formatTons(item.tons)} tons</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded">
                      <div
                        className="h-2 bg-slate-700 rounded"
                        style={{ width: `${item.share || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="border border-slate-200 rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Top Clients</h2>
                <div className="space-y-3">
                  {reportData.topClients.slice(0, 6).map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{formatTons(item.tons)} tons</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded">
                        <div
                          className="h-2 bg-slate-700 rounded"
                          style={{ width: `${item.share || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {reportData.topClients.length === 0 && (
                    <div className="text-slate-500">No client data available.</div>
                  )}
                </div>
              </section>

              <section className="border border-slate-200 rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Top Sites</h2>
                <div className="space-y-3">
                  {reportData.topSites.slice(0, 6).map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{formatTons(item.tons)} tons</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded">
                        <div
                          className="h-2 bg-slate-700 rounded"
                          style={{ width: `${item.share || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {reportData.topSites.length === 0 && (
                    <div className="text-slate-500">No site data available.</div>
                  )}
                </div>
              </section>
            </div>

            <section className="border border-slate-200 rounded-lg p-6 space-y-6 print-section">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Top Clients Table</h2>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px_1fr_90px_70px] bg-slate-100 text-xs font-semibold px-3 py-2">
                      <span>Rank</span>
                      <span>Client</span>
                      <span className="text-right">Tons</span>
                      <span className="text-right">Share</span>
                    </div>
                    {reportData.topClients.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="grid grid-cols-[40px_1fr_90px_70px] px-3 py-2 text-sm border-t border-slate-200"
                      >
                        <span>{index + 1}</span>
                        <span>{item.name}</span>
                        <span className="text-right">{formatTons(item.tons)}</span>
                        <span className="text-right">{formatShare(item.share)}%</span>
                      </div>
                    ))}
                    {reportData.topClients.length === 0 && (
                      <div className="px-3 py-3 text-sm text-slate-500">
                        No client data available.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Top Sites Table</h2>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px_1fr_90px_70px] bg-slate-100 text-xs font-semibold px-3 py-2">
                      <span>Rank</span>
                      <span>Site</span>
                      <span className="text-right">Tons</span>
                      <span className="text-right">Share</span>
                    </div>
                    {reportData.topSites.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="grid grid-cols-[40px_1fr_90px_70px] px-3 py-2 text-sm border-t border-slate-200"
                      >
                        <span>{index + 1}</span>
                        <span>{item.name}</span>
                        <span className="text-right">{formatTons(item.tons)}</span>
                        <span className="text-right">{formatShare(item.share)}%</span>
                      </div>
                    ))}
                    {reportData.topSites.length === 0 && (
                      <div className="px-3 py-3 text-sm text-slate-500">
                        No site data available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h2 className="text-lg font-semibold mb-2">Anomalies / Notes</h2>
                {reportData.exceptions === 0 ? (
                  <p className="text-slate-500">None detected.</p>
                ) : (
                  <p className="text-slate-700">
                    {reportData.exceptions} entries have missing or incomplete fields
                    (date, diameter, client, or weight).
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
