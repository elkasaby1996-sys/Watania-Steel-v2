import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { mergeClientSites, type ClientSitePerformanceRow } from '@/lib/clientsApi';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

type MergeSitesDialogProps = {
  clientId: string;
  sites: ClientSitePerformanceRow[];
  canMerge: boolean;
  onMerged: () => void;
};

type SuggestedGroup = {
  key: string;
  sites: ClientSitePerformanceRow[];
};

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function MergeSitesDialog({ clientId, sites, canMerge, onMerged }: MergeSitesDialogProps) {
  const [open, setOpen] = useState(false);
  const [primarySiteId, setPrimarySiteId] = useState<string | null>(null);
  const [duplicateSiteId, setDuplicateSiteId] = useState<string | null>(null);
  const [newPrimaryName, setNewPrimaryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { role, isLoading } = useUserRole();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  const suggestions = useMemo<SuggestedGroup[]>(() => {
    const map = new Map<string, ClientSitePerformanceRow[]>();
    sites.forEach((site) => {
      const key = normalizeName(site.site_name || '');
      if (!key) return;
      const list = map.get(key) ?? [];
      list.push(site);
      map.set(key, list);
    });

    return Array.from(map.entries())
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({ key, sites: list }));
  }, [sites]);

  useEffect(() => {
    if (!open) {
      setPrimarySiteId(null);
      setDuplicateSiteId(null);
      setNewPrimaryName('');
      setError(null);
      setResult(null);
      return;
    }

    if (suggestions.length > 0) {
      const [first] = suggestions;
      setPrimarySiteId(first.sites[0]?.site_id ?? null);
      setDuplicateSiteId(first.sites[1]?.site_id ?? null);
    }
  }, [open, suggestions]);

  const handleMerge = async () => {
    if (!isAdmin) {
      toast({
        title: 'Admin access required',
        description: 'Only admins can merge client sites.'
      });
      return;
    }
    if (!clientId || !primarySiteId || !duplicateSiteId) {
      setError('Select a primary and duplicate site.');
      return;
    }
    if (primarySiteId === duplicateSiteId) {
      setError('Primary and duplicate site must be different.');
      return;
    }

    setSaving(true);
    setError(null);
    setResult(null);

    try {
      const response = await mergeClientSites(
        clientId,
        primarySiteId,
        duplicateSiteId,
        newPrimaryName.trim() || null
      );
      const summary = [
        `Orders updated: ${response.orders_updated ?? 0}`,
        `History orders updated: ${response.history_orders_updated ?? 0}`,
        `Duplicate deleted: ${response.duplicate_deleted ? 'Yes' : 'No'}`
      ].join(' · ');
      setResult(summary);
      onMerged();
    } catch (err) {
      const errorMessage = (() => {
        if (!err || typeof err !== 'object') return 'Failed to merge sites.';
        const message = 'message' in err ? String((err as any).message) : '';
        const status = 'status' in err ? Number((err as any).status) : null;
        if (status === 404 || message.toLowerCase().includes('not found') || message.includes('404')) {
          return 'Merge RPC not found. Apply the migration in supabase/migrations/20250927_client_site_management.sql.';
        }
        return message || 'Failed to merge sites.';
      })();
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!canMerge || !isAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Merge Sites</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge Duplicate Sites</DialogTitle>
          <DialogDescription>
            Reassign orders to the primary site and delete the duplicate site permanently.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {suggestions.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">Suggested duplicates</div>
              <ul className="mt-2 space-y-1">
                {suggestions.map((group) => (
                  <li key={group.key}>
                    {group.sites.map((site) => site.site_name).join(' ↔ ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No duplicate site names detected.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="primary-site">Primary site</Label>
            <Select value={primarySiteId ?? ''} onValueChange={setPrimarySiteId}>
              <SelectTrigger id="primary-site">
                <SelectValue placeholder="Select primary site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.site_id} value={site.site_id}>
                    {site.site_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duplicate-site">Duplicate site</Label>
            <Select value={duplicateSiteId ?? ''} onValueChange={setDuplicateSiteId}>
              <SelectTrigger id="duplicate-site">
                <SelectValue placeholder="Select duplicate site" />
              </SelectTrigger>
              <SelectContent>
                {sites
                  .filter((site) => site.site_id !== primarySiteId)
                  .map((site) => (
                    <SelectItem key={site.site_id} value={site.site_id}>
                      {site.site_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-primary-name">Rename primary site (optional)</Label>
            <Input
              id="new-primary-name"
              value={newPrimaryName}
              onChange={(event) => setNewPrimaryName(event.target.value)}
              placeholder="Leave blank to keep existing name"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && <p className="text-sm text-emerald-500">{result}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleMerge} disabled={saving}>
            {saving ? 'Merging...' : 'Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
