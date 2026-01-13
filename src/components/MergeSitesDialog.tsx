import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { mergeClientSites, type ClientSitePerformanceRow } from '@/lib/clientsApi';

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
  const [confirmationText, setConfirmationText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryFilter, setPrimaryFilter] = useState('');
  const [duplicateFilter, setDuplicateFilter] = useState('');
  const { toast } = useToast();

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
      setConfirmationText('');
      setPrimaryFilter('');
      setDuplicateFilter('');
      return;
    }

    if (suggestions.length > 0) {
      const [first] = suggestions;
      setPrimarySiteId(first.sites[0]?.site_id ?? null);
      setDuplicateSiteId(first.sites[1]?.site_id ?? null);
    }
  }, [open, suggestions]);

  const handleMerge = async () => {
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

    try {
      await mergeClientSites(
        clientId,
        primarySiteId,
        duplicateSiteId,
        newPrimaryName.trim() || null
      );
      toast({
        title: 'Sites merged',
        description: 'Orders and site history moved to the primary site.'
      });
      onMerged();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to merge sites.';
      setError(message);
      toast({
        title: 'Merge failed',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canMerge) {
    return null;
  }

  const filteredPrimarySites = sites.filter((site) =>
    site.site_name?.toLowerCase().includes(primaryFilter.trim().toLowerCase())
  );
  const filteredDuplicateSites = sites.filter((site) => {
    if (site.site_id === primarySiteId) return false;
    return site.site_name?.toLowerCase().includes(duplicateFilter.trim().toLowerCase());
  });

  const primarySiteName = sites.find((site) => site.site_id === primarySiteId)?.site_name ?? '';
  const normalizedConfirmation = confirmationText.trim().toLowerCase();
  const confirmationMatch =
    normalizedConfirmation === 'merge' ||
    (primarySiteName && normalizedConfirmation === primarySiteName.toLowerCase());

  const disableMerge =
    saving ||
    !primarySiteId ||
    !duplicateSiteId ||
    primarySiteId === duplicateSiteId ||
    !confirmationMatch;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Merge Sites</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge Duplicate Sites</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            This will move all orders and history orders from the duplicate site into the primary
            site, merge the records, and delete the duplicate.
          </div>
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
            <Input
              id="primary-site-search"
              value={primaryFilter}
              onChange={(event) => setPrimaryFilter(event.target.value)}
              placeholder="Search sites..."
            />
            <Select value={primarySiteId ?? ''} onValueChange={setPrimarySiteId}>
              <SelectTrigger id="primary-site">
                <SelectValue placeholder="Select primary site" />
              </SelectTrigger>
              <SelectContent>
                {filteredPrimarySites.map((site) => (
                  <SelectItem key={site.site_id} value={site.site_id}>
                    {site.site_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duplicate-site">Duplicate site</Label>
            <Input
              id="duplicate-site-search"
              value={duplicateFilter}
              onChange={(event) => setDuplicateFilter(event.target.value)}
              placeholder="Search sites..."
            />
            <Select value={duplicateSiteId ?? ''} onValueChange={setDuplicateSiteId}>
              <SelectTrigger id="duplicate-site">
                <SelectValue placeholder="Select duplicate site" />
              </SelectTrigger>
              <SelectContent>
                {filteredDuplicateSites.map((site) => (
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

          <div className="space-y-2">
            <Label htmlFor="merge-confirmation">
              Type MERGE or the primary site name to confirm
            </Label>
            <Input
              id="merge-confirmation"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder="MERGE"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleMerge} disabled={disableMerge}>
            {saving ? 'Merging...' : 'Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
