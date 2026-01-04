import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInventoryStore, InventoryTableName } from '../stores/inventoryStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Non-editable columns that should be excluded from editing
const NON_EDITABLE_COLUMNS = ['id', 'created_at', 'updated_at', 'user_id'];

// Check if a column contains numeric (editable) values
const isNumericColumn = (data: Record<string, any>[], column: string): boolean => {
  if (!data.length) return false;
  // Check first non-null value
  for (const row of data) {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      return typeof val === 'number' || !isNaN(Number(val));
    }
  }
  return false;
};

// Get editable columns from data
const getEditableColumns = (
  data: Record<string, any>[],
  rowLabelKey: string,
  explicitColumns?: string[]
): string[] => {
  // Use explicit columns if provided (filter out 'total' to make it read-only for computed values)
  if (explicitColumns && explicitColumns.length > 0) {
    // For special_length, allow editing all columns except 'total' (which is computed)
    return explicitColumns.filter((col) => col.toLowerCase() !== 'total');
  }

  if (!data.length) return [];

  const firstRow = data[0];
  const allKeys = Object.keys(firstRow);

  // Filter out system columns, row label, and non-numeric columns
  const editableCols = allKeys.filter(
    (key) =>
      key !== rowLabelKey &&
      !NON_EDITABLE_COLUMNS.includes(key.toLowerCase()) &&
      isNumericColumn(data, key)
  );

  // Sort columns: put TOTAL at the end if it exists
  const sortedCols = editableCols.sort((a, b) => {
    if (a.toLowerCase() === 'total') return 1;
    if (b.toLowerCase() === 'total') return -1;
    return 0;
  });

  return sortedCols;
};

// Determine the ID column for a table
const getIdColumn = (data: Record<string, any>[]): string => {
  if (!data.length) return 'id';
  const firstRow = data[0];
  if ('id' in firstRow) return 'id';
  // Fallback to first key that looks like an ID
  const keys = Object.keys(firstRow);
  const idLikeKey = keys.find(k => k.toLowerCase().includes('id'));
  return idLikeKey || keys[0];
};

// Get column display header (use mapping if available)
const getColumnDisplayHeader = (
  col: string,
  columnDisplayMap?: Record<string, string>
): string => {
  if (columnDisplayMap && columnDisplayMap[col]) {
    return columnDisplayMap[col];
  }
  return col.toUpperCase();
};

// Sort rows for special_length table by diameter (ascending numeric)
const sortSpecialLengthRows = (data: Record<string, any>[]): Record<string, any>[] => {
  return [...data].sort((a, b) => {
    const aType = String(a.type || '');
    const bType = String(b.type || '');
    // Extract numeric value from type (e.g., "16mm" -> 16)
    const aNum = parseInt(aType.replace(/\D/g, ''), 10) || 9999;
    const bNum = parseInt(bType.replace(/\D/g, ''), 10) || 9999;
    return aNum - bNum;
  });
};

interface InventoryEditModalProps {
  open: boolean;
  onClose: () => void;
  tableName: InventoryTableName;
  tableTitle: string;
  rowLabelKey: string;
  rowLabelDisplay?: string; // Display name for the row label column header
  initialData: Record<string, any>[];
  explicitColumns?: string[]; // Explicit columns for tables with non-standard column names
  columnDisplayMap?: Record<string, string>; // Map database column names to display headers
}

export function InventoryEditModal({
  open,
  onClose,
  tableName,
  tableTitle,
  rowLabelKey,
  rowLabelDisplay,
  initialData,
  explicitColumns,
  columnDisplayMap,
}: InventoryEditModalProps) {
  const [editedData, setEditedData] = useState<Record<string, any>[]>([]);
  const [saving, setSaving] = useState(false);
  const { updateTableData } = useInventoryStore();
  const { toast } = useToast();

  // Initialize edited data when modal opens
  useEffect(() => {
    if (open && initialData.length) {
      // Sort data for special_length table to match the main table order
      const sortedData = tableName === 'special_length'
        ? sortSpecialLengthRows(initialData)
        : initialData;
      setEditedData(JSON.parse(JSON.stringify(sortedData)));
    }
  }, [open, initialData, tableName]);

  const editableColumns = getEditableColumns(editedData, rowLabelKey, explicitColumns);
  const idColumn = getIdColumn(editedData);

  // Get the sorted initial data for comparison (to detect changes correctly)
  const sortedInitialData = tableName === 'special_length'
    ? sortSpecialLengthRows(initialData)
    : initialData;

  // Handle value change
  const handleValueChange = (
    rowIndex: number,
    column: string,
    value: string
  ) => {
    setEditedData((prev) => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        [column]: value === '' ? null : Number(value),
      };
      return updated;
    });
  };

  // Check if data has changed
  const hasChanges = (): boolean => {
    return JSON.stringify(editedData) !== JSON.stringify(sortedInitialData);
  };

  // Handle save
  const handleSave = async () => {
    if (!hasChanges()) {
      toast({
        title: 'No changes',
        description: 'No values were modified.',
      });
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Prepare updates - only include rows that changed
      const updates: Array<{
        id: string | number;
        data: Record<string, any>;
        idColumn?: string;
      }> = [];

      editedData.forEach((row, idx) => {
        const original = sortedInitialData[idx];
        const rowId = row[idColumn];

        // Check if any editable column changed
        let hasRowChanges = false;
        const changedData: Record<string, any> = {};

        for (const col of editableColumns) {
          if (row[col] !== original[col]) {
            hasRowChanges = true;
            changedData[col] = row[col];
          }
        }

        if (hasRowChanges && rowId !== undefined) {
          updates.push({
            id: rowId,
            data: changedData,
            idColumn: idColumn,
          });
        }
      });

      if (updates.length === 0) {
        toast({
          title: 'No changes',
          description: 'No values were modified.',
        });
        onClose();
        return;
      }

      await updateTableData(tableName, updates);

      toast({
        title: 'Success',
        description: `${tableTitle} inventory updated successfully.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasChanges()) {
      // Reset to initial data (sorted for special_length)
      setEditedData(JSON.parse(JSON.stringify(sortedInitialData)));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit {tableTitle} Values</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {editedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data to edit
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold bg-muted/50 whitespace-nowrap sticky top-0">
                    {rowLabelDisplay || (rowLabelKey.charAt(0).toUpperCase() + rowLabelKey.slice(1))}
                  </TableHead>
                  {editableColumns.map((col) => (
                    <TableHead
                      key={col}
                      className="font-semibold bg-muted/50 text-center whitespace-nowrap sticky top-0"
                    >
                      {getColumnDisplayHeader(col, columnDisplayMap)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.map((row, rowIdx) => (
                  <TableRow key={row[idColumn] || rowIdx}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row[rowLabelKey] || '-'}
                    </TableCell>
                    {editableColumns.map((col) => (
                      <TableCell key={col} className="p-1">
                        <Input
                          type="number"
                          step="0.001"
                          value={
                            row[col] === null || row[col] === undefined
                              ? ''
                              : row[col]
                          }
                          onChange={(e) =>
                            handleValueChange(rowIdx, col, e.target.value)
                          }
                          className="w-24 text-center h-8"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
