import React, { useState, useCallback } from 'react';
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
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { offcutUsageService } from '@/lib/supabase';

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

// Interface for a single entry row
interface EntryRow {
  id: string;
  company: string;
  bar_diameter: string;
  pieces_used: string;
  weight_kg: string;
  weight_tons: string;
  notes: string;
}

// Interface for row validation errors
interface RowErrors {
  company?: string;
  bar_diameter?: string;
  pieces_used?: string;
  weight_kg?: string;
}

interface AddOffcutEntriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onSuccess: () => void;
}

// Generate a unique ID for each row
const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create empty entry row
const createEmptyRow = (): EntryRow => ({
  id: generateRowId(),
  company: '',
  bar_diameter: '',
  pieces_used: '',
  weight_kg: '',
  weight_tons: '',
  notes: '',
});

// Auto-calculate weight_tons from weight_kg (weight_kg / 1000, 3 decimals)
const calculateWeightTons = (weightKg: string): string => {
  const kg = parseFloat(weightKg);
  if (isNaN(kg) || kg <= 0) return '';
  return (kg / 1000).toFixed(3);
};

export function AddOffcutEntriesModal({
  open,
  onOpenChange,
  selectedDate,
  onSuccess,
}: AddOffcutEntriesModalProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<EntryRow[]>([createEmptyRow()]);
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [saving, setSaving] = useState(false);

  // Format date for display in title
  const formatDateForDisplay = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle field change for a row
  const handleFieldChange = useCallback(
    (rowId: string, field: keyof EntryRow, value: string) => {
      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.id !== rowId) return row;

          const updatedRow = { ...row, [field]: value };

          // Auto-calculate weight_tons when weight_kg changes
          if (field === 'weight_kg') {
            updatedRow.weight_tons = calculateWeightTons(value);
          }

          return updatedRow;
        })
      );

      // Clear error for the changed field
      setErrors((prevErrors) => {
        const rowErrors = prevErrors[rowId];
        if (!rowErrors) return prevErrors;
        const { [field as keyof RowErrors]: _, ...remaining } = rowErrors;
        return { ...prevErrors, [rowId]: remaining };
      });
    },
    []
  );

  // Add a new row
  const handleAddRow = useCallback(() => {
    setRows((prevRows) => [...prevRows, createEmptyRow()]);
  }, []);

  // Remove a row
  const handleRemoveRow = useCallback((rowId: string) => {
    setRows((prevRows) => {
      // Don't allow removing if only one row
      if (prevRows.length === 1) return prevRows;
      return prevRows.filter((row) => row.id !== rowId);
    });
    setErrors((prevErrors) => {
      const { [rowId]: _, ...remaining } = prevErrors;
      return remaining;
    });
  }, []);

  // Validate all rows
  const validateRows = (): boolean => {
    const newErrors: Record<string, RowErrors> = {};
    let isValid = true;

    for (const row of rows) {
      const rowErrors: RowErrors = {};

      if (!row.company.trim()) {
        rowErrors.company = 'Company is required';
        isValid = false;
      }

      if (!row.bar_diameter) {
        rowErrors.bar_diameter = 'Bar diameter is required';
        isValid = false;
      }

      if (!row.pieces_used.trim()) {
        rowErrors.pieces_used = 'Pieces used is required';
        isValid = false;
      } else {
        const pieces = parseInt(row.pieces_used, 10);
        if (isNaN(pieces) || pieces <= 0 || !Number.isInteger(pieces)) {
          rowErrors.pieces_used = 'Must be a positive integer';
          isValid = false;
        }
      }

      if (!row.weight_kg.trim()) {
        rowErrors.weight_kg = 'Weight (kg) is required';
        isValid = false;
      } else {
        const weight = parseFloat(row.weight_kg);
        if (isNaN(weight) || weight <= 0) {
          rowErrors.weight_kg = 'Must be a positive number';
          isValid = false;
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        newErrors[row.id] = rowErrors;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle save all
  const handleSaveAll = async () => {
    if (!validateRows()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      // Prepare entries for bulk insert
      const entries = rows.map((row) => ({
        date: selectedDate,
        company: row.company.trim(),
        bar_diameter: row.bar_diameter,
        pieces_used: parseInt(row.pieces_used, 10),
        weight_kg: parseFloat(parseFloat(row.weight_kg).toFixed(3)),
        weight_tons: parseFloat(calculateWeightTons(row.weight_kg)),
        notes: row.notes.trim() || null,
      }));

      await offcutUsageService.createBulk(entries);

      toast({
        title: 'Success',
        description: `${entries.length} offcut ${entries.length === 1 ? 'entry' : 'entries'} added successfully.`,
      });

      // Reset and close
      setRows([createEmptyRow()]);
      setErrors({});
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save offcut entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to save offcut entries. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setRows([createEmptyRow()]);
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  // Count valid rows
  const validRowCount = rows.filter(
    (row) =>
      row.company.trim() &&
      row.bar_diameter &&
      row.pieces_used.trim() &&
      row.weight_kg.trim()
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Offcut Entries - {formatDateForDisplay(selectedDate)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="border rounded-lg p-4 space-y-4 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Entry {index + 1}</span>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(row.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor={`${row.id}-company`}>Company *</Label>
                  <Input
                    id={`${row.id}-company`}
                    value={row.company}
                    onChange={(e) =>
                      handleFieldChange(row.id, 'company', e.target.value)
                    }
                    placeholder="Enter company name"
                    className={errors[row.id]?.company ? 'border-destructive' : ''}
                  />
                  {errors[row.id]?.company && (
                    <p className="text-sm text-destructive">
                      {errors[row.id].company}
                    </p>
                  )}
                </div>

                {/* Bar Diameter */}
                <div className="space-y-2">
                  <Label htmlFor={`${row.id}-bar_diameter`}>Bar Diameter *</Label>
                  <Select
                    value={row.bar_diameter}
                    onValueChange={(value) =>
                      handleFieldChange(row.id, 'bar_diameter', value)
                    }
                  >
                    <SelectTrigger
                      id={`${row.id}-bar_diameter`}
                      className={
                        errors[row.id]?.bar_diameter ? 'border-destructive' : ''
                      }
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
                  {errors[row.id]?.bar_diameter && (
                    <p className="text-sm text-destructive">
                      {errors[row.id].bar_diameter}
                    </p>
                  )}
                </div>

                {/* Pieces Used */}
                <div className="space-y-2">
                  <Label htmlFor={`${row.id}-pieces_used`}>Pieces Used *</Label>
                  <Input
                    id={`${row.id}-pieces_used`}
                    type="number"
                    min="1"
                    step="1"
                    value={row.pieces_used}
                    onChange={(e) =>
                      handleFieldChange(row.id, 'pieces_used', e.target.value)
                    }
                    placeholder="Enter quantity"
                    className={
                      errors[row.id]?.pieces_used ? 'border-destructive' : ''
                    }
                  />
                  {errors[row.id]?.pieces_used && (
                    <p className="text-sm text-destructive">
                      {errors[row.id].pieces_used}
                    </p>
                  )}
                </div>

                {/* Weight (kg) */}
                <div className="space-y-2">
                  <Label htmlFor={`${row.id}-weight_kg`}>Weight (kg) *</Label>
                  <Input
                    id={`${row.id}-weight_kg`}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={row.weight_kg}
                    onChange={(e) =>
                      handleFieldChange(row.id, 'weight_kg', e.target.value)
                    }
                    placeholder="0.000"
                    className={errors[row.id]?.weight_kg ? 'border-destructive' : ''}
                  />
                  {errors[row.id]?.weight_kg && (
                    <p className="text-sm text-destructive">
                      {errors[row.id].weight_kg}
                    </p>
                  )}
                </div>

                {/* Weight (tons) - Read Only */}
                <div className="space-y-2">
                  <Label htmlFor={`${row.id}-weight_tons`}>
                    Weight (tons)
                    <span className="text-muted-foreground text-xs ml-1">
                      (auto)
                    </span>
                  </Label>
                  <Input
                    id={`${row.id}-weight_tons`}
                    value={row.weight_tons}
                    readOnly
                    disabled
                    placeholder="0.000"
                    className="bg-muted"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor={`${row.id}-notes`}>Notes</Label>
                  <Input
                    id={`${row.id}-notes`}
                    value={row.notes}
                    onChange={(e) =>
                      handleFieldChange(row.id, 'notes', e.target.value)
                    }
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Row Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRow}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
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
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || validRowCount === 0}
          >
            {saving ? 'Saving...' : `Save All (${validRowCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
