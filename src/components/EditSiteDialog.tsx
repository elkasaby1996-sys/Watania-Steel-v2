import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSite, type ClientSiteDetails, type ClientSitePatch } from '@/lib/clientsApi';
import { useToast } from '@/hooks/use-toast';

type EditSiteDialogProps = {
  site: ClientSiteDetails | null;
  canEdit: boolean;
  onUpdated: (site: ClientSiteDetails) => void;
};

type SiteFormValues = {
  contact_name: string;
  contact_phone: string;
  location_text: string;
  google_maps_url: string;
  notes: string;
};

export function EditSiteDialog({ site, canEdit, onUpdated }: EditSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset } = useForm<SiteFormValues>({
    defaultValues: {
      contact_name: '',
      contact_phone: '',
      location_text: '',
      google_maps_url: '',
      notes: ''
    }
  });

  useEffect(() => {
    reset({
      contact_name: site?.contact_name ?? '',
      contact_phone: site?.contact_phone ?? '',
      location_text: site?.location_text ?? '',
      google_maps_url: site?.google_maps_url ?? '',
      notes: site?.notes ?? ''
    });
  }, [reset, site]);

  const onSubmit = handleSubmit(async (values) => {
    if (!site?.site_id) return;
    setSaving(true);
    setError(null);

    try {
      const patch: ClientSitePatch = {
        contact_name: values.contact_name?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
        location_text: values.location_text?.trim() || null,
        google_maps_url: values.google_maps_url?.trim() || null,
        notes: values.notes?.trim() || null
      };

      const updated = await updateSite(site.site_id, patch);
      onUpdated({
        ...site,
        contact_name: updated.contact_name,
        contact_phone: updated.contact_phone,
        location_text: updated.location_text,
        google_maps_url: updated.google_maps_url,
        notes: updated.notes
      });
      toast({
        title: 'Site updated',
        description: 'Site contact details were saved successfully.'
      });
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update site details.';
      setError(message);
      toast({
        title: 'Failed to update site',
        description: message,
        variant: 'destructive'
      });
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
        <Button variant="outline">Edit Site</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Site Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-contact-name">Contact Name</Label>
              <Input id="site-contact-name" {...register('contact_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-contact-phone">Contact Phone</Label>
              <Input id="site-contact-phone" {...register('contact_phone')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="site-location-text">Location Text</Label>
              <Input id="site-location-text" {...register('location_text')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="site-google-maps">Google Maps URL</Label>
              <Input id="site-google-maps" {...register('google_maps_url')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="site-notes">Notes</Label>
              <textarea
                id="site-notes"
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
