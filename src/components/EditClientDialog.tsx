import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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

export function EditClientDialog({ client, canEdit, onUpdated }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<ClientFormValues>({
    defaultValues: {
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      address: '',
      notes: ''
    }
  });

  useEffect(() => {
    reset({
      contact_name: client?.contact_name ?? '',
      contact_phone: client?.contact_phone ?? '',
      contact_email: client?.contact_email ?? '',
      address: client?.address ?? '',
      notes: client?.notes ?? ''
    });
  }, [client, reset]);

  const onSubmit = handleSubmit(async (values) => {
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
  });

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
              <Input id="client-contact-name" {...register('contact_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-contact-phone">Contact Phone</Label>
              <Input id="client-contact-phone" {...register('contact_phone')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-contact-email">Contact Email</Label>
              <Input id="client-contact-email" type="email" {...register('contact_email')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-address">Address</Label>
              <Input id="client-address" {...register('address')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-notes">Notes</Label>
              <textarea
                id="client-notes"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('notes')}
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
