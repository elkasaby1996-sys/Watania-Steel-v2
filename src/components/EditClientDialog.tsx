import { type FormEvent, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateClient, type ClientPatch, type ClientTopSummary } from '@/lib/clientsApi';

type EditClientDialogProps = {
  client: ClientTopSummary | null;
  canEdit: boolean;
  onUpdated: (client: ClientTopSummary) => void;
};

type ClientFormValues = {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  notes: string;
};

const emptyClientFormValues: ClientFormValues = {
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  notes: ''
};

const getClientFormValues = (client: ClientTopSummary | null): ClientFormValues => ({
  contact_name: client?.contact_name ?? '',
  contact_phone: client?.contact_phone ?? '',
  contact_email: client?.contact_email ?? '',
  address: client?.address ?? '',
  notes: client?.notes ?? ''
});

export function EditClientDialog({ client, canEdit, onUpdated }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ClientFormValues>(emptyClientFormValues);

  useEffect(() => {
    setValues(getClientFormValues(client));
  }, [client]);

  const handleFieldChange = (field: keyof ClientFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client?.client_id) return;
    setSaving(true);
    setError(null);

    try {
      const patch: ClientPatch = {
        contact_name: values.contact_name?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null
      };

      const updated = await updateClient(client.client_id, patch);
      onUpdated({
        ...client,
        ...updated
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client details.');
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Client Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-contact-name">Contact Name</Label>
              <Input
                id="client-contact-name"
                value={values.contact_name}
                onChange={(event) => handleFieldChange('contact_name', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-contact-phone">Contact Phone</Label>
              <Input
                id="client-contact-phone"
                value={values.contact_phone}
                onChange={(event) => handleFieldChange('contact_phone', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-contact-email">Contact Email</Label>
              <Input
                id="client-contact-email"
                type="email"
                value={values.contact_email}
                onChange={(event) => handleFieldChange('contact_email', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-address">Address</Label>
              <Input
                id="client-address"
                value={values.address}
                onChange={(event) => handleFieldChange('address', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-notes">Notes</Label>
              <textarea
                id="client-notes"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={values.notes}
                onChange={(event) => handleFieldChange('notes', event.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
