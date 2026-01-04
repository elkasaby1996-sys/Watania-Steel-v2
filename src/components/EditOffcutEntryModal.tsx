import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { offcutUsageService, OffcutUsageEntry } from '@/lib/supabase';

// Bar diameter options
const BAR_DIAMETER_OPTIONS = [
  '8mm',
  '10mm',
  '12mm',
  '14mm',
  '16mm',
  '18mm',
  '20mm',
  '25mm',
  '32mm',
  '40mm',
];

// Interface for validation errors
interface FormErrors {
  company?: string;
  bar_diameter?: string;
  pieces_used?: string;
  weight_kg?: string;
}

interface EditOffcutEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: OffcutUsageEntry | null;
  onSuccess: () => void;
}

// Auto-calculate weight_tons from weight_kg (weight_kg / 1000, 3 decimals)
const calculateWeightTons = (weightKg: string): string => {
  const kg = parseFloat(weightKg);
  if (isNaN(kg) || kg <= 0) return '';
  return (kg / 1000).toFixed(3);
};

export function EditOffcutEntryModal({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: EditOffcutEntryModalProps) {
  const { toast } = useToast();
  const [company, setCompany] = useState('');
  const [barDiameter, setBarDiameter] = useState('');
  const [piecesUsed, setPiecesUsed] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightTons, setWeightTons] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Populate form when entry changes
  useEffect(() => {
    if (entry) {
      setCompany(entry.company || '');
      setBarDiameter(entry.bar_diameter || '');
      setPiecesUsed(String(entry.pieces_used || ''));
      setWeightKg(entry.weight_kg?.toFixed(3) || '');
      setWeightTons(entry.weight_tons?.toFixed(3) || '');
      setNotes(entry.notes || '');
      setErrors({});
    }
  }, [entry]);

  // Auto-calculate weight_tons when weight_kg changes
  const handleWeightKgChange = (value: string) => {
    setWeightKg(value);
    setWeightTons(calculateWeightTons(value));
    // Clear error
    setErrors((prev) => ({ ...prev, weight_kg: undefined }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!company.trim()) {
      newErrors.company = 'Company is required';
      isValid = false;
    }

    if (!barDiameter) {
      newErrors.bar_diameter = 'Bar diameter is required';
      isValid = false;
    }

    if (!piecesUsed.trim()) {
      newErrors.pieces_used = 'Pieces used is required';
      isValid = false;
    } else {
      const pieces = parseInt(piecesUsed, 10);
      if (isNaN(pieces) || pieces <= 0 || !Number.isInteger(pieces)) {
        newErrors.pieces_used = 'Must be a positive integer';
        isValid = false;
      }
    }

    if (!weightKg.trim()) {
      newErrors.weight_kg = 'Weight (kg) is required';
      isValid = false;
    } else {
      const weight = parseFloat(weightKg);
      if (isNaN(weight) || weight <= 0) {
        newErrors.weight_kg = 'Must be a positive number';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle save
  const handleSave = async () => {
    if (!entry) return;

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const updates: Partial<OffcutUsageEntry> = {
        company: company.trim(),
        bar_diameter: barDiameter,
        pieces_used: parseInt(piecesUsed, 10),
        weight_kg: parseFloat(parseFloat(weightKg).toFixed(3)),
        weight_tons: parseFloat(calculateWeightTons(weightKg)),
        notes: notes.trim() || null,
      };

      await offcutUsageService.update(entry.id, updates);

      toast({
        title: 'Success',
        description: 'Offcut entry updated successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update offcut entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update offcut entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  // Format date for display in title
  const formatDateForDisplay = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Edit Offcut Entry{entry ? ` - ${formatDateForDisplay(entry.date)}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company *</Label>
              <Input
                id="edit-company"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setErrors((prev) => ({ ...prev, company: undefined }));
                }}
                placeholder="Enter company name"
                className={errors.company ? 'border-destructive' : ''}
              />
              {errors.company && (
                <p className="text-sm text-destructive">{errors.company}</p>
              )}
            </div>

            {/* Bar Diameter */}
            <div className="space-y-2">
              <Label htmlFor="edit-bar_diameter">Bar Diameter *</Label>
              <Select
                value={barDiameter}
                onValueChange={(value) => {
                  setBarDiameter(value);
                  setErrors((prev) => ({ ...prev, bar_diameter: undefined }));
                }}
              >
                <SelectTrigger
                  id="edit-bar_diameter"
                  className={errors.bar_diameter ? 'border-destructive' : ''}
                >
                  <SelectValue placeholder="Select diameter" />
                </SelectTrigger>
                <SelectContent>
                  {BAR_DIAMETER_OPTIONS.map((diameter) => (
                    <SelectItem key={diameter} value={diameter}>
                      {diameter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bar_diameter && (
                <p className="text-sm text-destructive">{errors.bar_diameter}</p>
              )}
            </div>

            {/* Pieces Used */}
            <div className="space-y-2">
              <Label htmlFor="edit-pieces_used">Pieces Used *</Label>
              <Input
                id="edit-pieces_used"
                type="number"
                min="1"
                step="1"
                value={piecesUsed}
                onChange={(e) => {
                  setPiecesUsed(e.target.value);
                  setErrors((prev) => ({ ...prev, pieces_used: undefined }));
                }}
                placeholder="Enter quantity"
                className={errors.pieces_used ? 'border-destructive' : ''}
              />
              {errors.pieces_used && (
                <p className="text-sm text-destructive">{errors.pieces_used}</p>
              )}
            </div>

            {/* Weight (kg) */}
            <div className="space-y-2">
              <Label htmlFor="edit-weight_kg">Weight (kg) *</Label>
              <Input
                id="edit-weight_kg"
                type="number"
                min="0.001"
                step="0.001"
                value={weightKg}
                onChange={(e) => handleWeightKgChange(e.target.value)}
                placeholder="0.000"
                className={errors.weight_kg ? 'border-destructive' : ''}
              />
              {errors.weight_kg && (
                <p className="text-sm text-destructive">{errors.weight_kg}</p>
              )}
            </div>

            {/* Weight (tons) - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="edit-weight_tons">
                Weight (tons)
                <span className="text-muted-foreground text-xs ml-1">(auto)</span>
              </Label>
              <Input
                id="edit-weight_tons"
                value={weightTons}
                readOnly
                disabled
                placeholder="0.000"
                className="bg-muted"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
