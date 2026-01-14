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
import { mergeClients, type ClientSummary } from '@/lib/clientsApi';

type MergeClientsDialogProps = {
  clients: ClientSummary[];
  canMerge: boolean;
  defaultPrimaryId?: string;
  triggerLabel?: string;
  loadingClients?: boolean;
  loadError?: string | null;
  onMerged: (primaryId: string, duplicateId: string) => void;
};

export function MergeClientsDialog({
  clients,
  canMerge,
  defaultPrimaryId,
  triggerLabel = 'Merge Clients',
  loadingClients = false,
  loadError = null,
  onMerged
}: MergeClientsDialogProps) {
  const [open, setOpen] = useState(false);
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null);
  const [duplicateClientId, setDuplicateClientId] = useState<string | null>(null);
  const [primaryFilter, setPrimaryFilter] = useState('');
  const [duplicateFilter, setDuplicateFilter] = useState('');
  const [newPrimaryName, setNewPrimaryName] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setPrimaryClientId(null);
      setDuplicateClientId(null);
      setPrimaryFilter('');
      setDuplicateFilter('');
      setNewPrimaryName('');
      setConfirmationText('');
      setSaving(false);
      setError(null);
      return;
    }

    if (clients.length > 0) {
      const primaryId = defaultPrimaryId ?? clients[0]?.id ?? null;
      setPrimaryClientId(primaryId);
      const firstDuplicate = clients.find((client) => client.id !== primaryId)?.id ?? null;
      setDuplicateClientId(firstDuplicate);
    }
  }, [clients, defaultPrimaryId, open]);

  const filteredPrimaryClients = useMemo(() => {
    const search = primaryFilter.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(search));
  }, [clients, primaryFilter]);

  const filteredDuplicateClients = useMemo(() => {
    const search = duplicateFilter.trim().toLowerCase();
    return clients.filter((client) => {
      if (client.id === primaryClientId) return false;
      if (!search) return true;
      return client.name.toLowerCase().includes(search);
    });
  }, [clients, duplicateFilter, primaryClientId]);

  const primaryClientName = useMemo(
    () => clients.find((client) => client.id === primaryClientId)?.name ?? '',
    [clients, primaryClientId]
  );

  const confirmationMatch = useMemo(() => {
    const normalized = confirmationText.trim().toLowerCase();
    return (
      normalized === 'merge' ||
      (primaryClientName && normalized === primaryClientName.toLowerCase())
    );
  }, [confirmationText, primaryClientName]);

  const disableMerge =
    saving ||
    !primaryClientId ||
    !duplicateClientId ||
    primaryClientId === duplicateClientId ||
    !confirmationMatch;

  const handleMerge = async () => {
    if (!canMerge) {
      const message = 'Only admins can merge clients.';
      setError(message);
      toast({
        title: 'Merge blocked',
        description: message,
        variant: 'destructive'
      });
      return;
    }
    if (!primaryClientId || !duplicateClientId) {
      setError('Select both a primary and duplicate client.');
      return;
    }
    if (primaryClientId === duplicateClientId) {
      setError('Primary and duplicate clients must be different.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await mergeClients(
        primaryClientId,
        duplicateClientId,
        newPrimaryName.trim() || null
      );
      toast({
        title: 'Clients merged',
        description: 'Orders and sites were moved to the primary client.'
      });
      onMerged(primaryClientId, duplicateClientId);
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to merge clients.';
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge Duplicate Clients</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            This will move all orders and history orders from the duplicate client to the
            primary client, merge sites, and delete the duplicate.
          </div>

          {loadingClients && (
            <p className="text-sm text-muted-foreground">Loading client list...</p>
          )}

          {loadError && (
            <p className="text-sm text-destructive">{loadError}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="primary-client">Primary client</Label>
            <Input
              id="primary-client-search"
              value={primaryFilter}
              onChange={(event) => setPrimaryFilter(event.target.value)}
              placeholder="Search clients..."
            />
            <Select value={primaryClientId ?? ''} onValueChange={setPrimaryClientId}>
              <SelectTrigger id="primary-client">
                <SelectValue placeholder="Select primary client" />
              </SelectTrigger>
              <SelectContent>
                {filteredPrimaryClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duplicate-client">Duplicate client</Label>
            <Input
              id="duplicate-client-search"
              value={duplicateFilter}
              onChange={(event) => setDuplicateFilter(event.target.value)}
              placeholder="Search clients..."
            />
            <Select value={duplicateClientId ?? ''} onValueChange={setDuplicateClientId}>
              <SelectTrigger id="duplicate-client">
                <SelectValue placeholder="Select duplicate client" />
              </SelectTrigger>
              <SelectContent>
                {filteredDuplicateClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rename-primary">Rename primary client (optional)</Label>
            <Input
              id="rename-primary"
              value={newPrimaryName}
              onChange={(event) => setNewPrimaryName(event.target.value)}
              placeholder="Leave blank to keep existing name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merge-confirmation">
              Type MERGE or the primary client name to confirm
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
