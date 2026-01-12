import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateClientSite, type ClientSiteDetails, type ClientSitePatch } from '@/lib/clientsApi';

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
  const [formValues, setFormValues] = useState<SiteFormValues>({
    contact_name: '',
    contact_phone: '',
    location_text: '',
    google_maps_url: '',
    notes: ''
  });

  useEffect(() => {
    setFormValues({
      contact_name: site?.contact_name ?? '',
      contact_phone: site?.contact_phone ?? '',
      location_text: site?.location_text ?? '',
      google_maps_url: site?.google_maps_url ?? '',
      notes: site?.notes ?? ''
    });
  }, [site]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.site_id) return;
    setSaving(true);
    setError(null);

    try {
      const patch: ClientSitePatch = {
        contact_name: formValues.contact_name?.trim() || null,
        contact_phone: formValues.contact_phone?.trim() || null,
        location_text: formValues.location_text?.trim() || null,
        google_maps_url: formValues.google_maps_url?.trim() || null,
        notes: formValues.notes?.trim() || null
      };

      const updated = await updateClientSite(site.site_id, patch);
      onUpdated({
        ...site,
        contact_name: updated.contact_name,
        contact_phone: updated.contact_phone,
        location_text: updated.location_text,
        google_maps_url: updated.google_maps_url,
        notes: updated.notes
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update site details.');
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
          <DialogTitle>Edit Site Details</DialogTitle>
          <DialogDescription>Update contact and location information for this site.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-contact-name">Contact Name</Label>
              <Input
                id="site-contact-name"
                value={formValues.contact_name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, contact_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-contact-phone">Contact Phone</Label>
              <Input
                id="site-contact-phone"
                value={formValues.contact_phone}
                onChange={(event) => setFormValues((prev) => ({ ...prev, contact_phone: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="site-location-text">Location Text</Label>
              <Input
                id="site-location-text"
                value={formValues.location_text}
                onChange={(event) => setFormValues((prev) => ({ ...prev, location_text: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="site-google-maps">Google Maps URL</Label>
              <Input
                id="site-google-maps"
                value={formValues.google_maps_url}
                onChange={(event) => setFormValues((prev) => ({ ...prev, google_maps_url: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="site-notes">Notes</Label>
              <textarea
                id="site-notes"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formValues.notes}
                onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
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
