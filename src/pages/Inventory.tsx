import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore, InventoryTableName } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { InventoryEditModal } from '../components/InventoryEditModal';
import { ROUTES } from '@/routes/routes';

// Table configuration for each inventory section
interface TableConfig {
  title: string;
  tableName: InventoryTableName;
  rowLabelKey: string;
  rowLabelDisplay?: string; // Display name for the row label column header
  highlightLowValues: boolean;
  explicitColumns?: string[]; // Explicit columns for tables with non-standard column names
  columnDisplayMap?: Record<string, string>; // Map database column names to display headers
}

const tableConfigs: TableConfig[] = [
  {
    title: 'Qatar Steel',
    tableName: 'qatar_steel',
    rowLabelKey: 'type',
    highlightLowValues: true,
  },
  {
    title: 'AlWatania Steel',
    tableName: 'al_watania_steel',
    rowLabelKey: 'type',
    highlightLowValues: true,
  },
  {
    title: 'Special Length Watania Sections',
    tableName: 'special_length',
    rowLabelKey: 'type',
    rowLabelDisplay: 'Length', // Display "Length" instead of "Type" for header
    highlightLowValues: true,
    // Explicit columns since column names start with numbers (e.g., "16mm")
    explicitColumns: ['16mm', '20mm', '25mm', '32mm', 'total'],
    // Map database column names to display headers (length values)
    columnDisplayMap: {
      '16mm': '8.25m',
      '20mm': '9m',
      '25mm': '10m',
      '32mm': '11.25m',
      'total': 'TOTAL',
    },
  },
  {
    title: 'Coils',
    tableName: 'coils',
    rowLabelKey: 'type',
    highlightLowValues: false,
  },
  {
    title: 'Wire',
    tableName: 'wire',
    rowLabelKey: 'type',
    highlightLowValues: false,
  },
  {
    title: 'Coupler',
    tableName: 'coupler',
    rowLabelKey: 'type',
    highlightLowValues: false,
  },
];

// Non-editable columns that should be excluded from editing
const NON_EDITABLE_COLUMNS = ['id', 'created_at', 'updated_at', 'user_id'];

// Format numeric values with 3 decimal places
const formatNumber = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(3);
};

// Check if a value is numeric and below threshold
const isLowValue = (value: any, threshold: number = 100): boolean => {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  return !isNaN(num) && num < threshold;
};

// Get display columns from data (excluding row label and system columns)
const getDisplayColumns = (
  data: Record<string, any>[],
  rowLabelKey: string,
  explicitColumns?: string[]
): string[] => {
  // Use explicit columns if provided
  if (explicitColumns && explicitColumns.length > 0) {
    return explicitColumns;
  }

  if (!data.length) return [];

  const firstRow = data[0];
  const allKeys = Object.keys(firstRow);

  // Filter out system columns and row label
  const displayCols = allKeys.filter(
    (key) =>
      key !== rowLabelKey &&
      !NON_EDITABLE_COLUMNS.includes(key.toLowerCase())
  );

  // Sort columns: put TOTAL at the end if it exists
  const sortedCols = displayCols.sort((a, b) => {
    if (a.toLowerCase() === 'total') return 1;
    if (b.toLowerCase() === 'total') return -1;
    return 0;
  });

  return sortedCols;
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

// Inventory Section Component
interface InventorySectionProps {
  config: TableConfig;
  data: Record<string, any>[];
  loading: boolean;
  canEdit: boolean;
  onEdit: (tableName: InventoryTableName, data: Record<string, any>[]) => void;
}

function InventorySection({
  config,
  data,
  loading,
  canEdit,
  onEdit,
}: InventorySectionProps) {
  const columns = getDisplayColumns(data, config.rowLabelKey, config.explicitColumns);

  // Sort rows for special_length table by diameter
  const sortedData = config.tableName === 'special_length'
    ? sortSpecialLengthRows(data)
    : data;

  // Get the row label header text
  const rowLabelHeader = config.rowLabelDisplay ||
    (config.rowLabelKey.charAt(0).toUpperCase() + config.rowLabelKey.slice(1));

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {config.title}
          </h2>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(config.tableName, data)}
            disabled={loading || !data.length}
            className="gap-2"
          >
            <Edit2 size={14} />
            Edit Values
          </Button>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold bg-muted/50 whitespace-nowrap">
                    {rowLabelHeader}
                  </TableHead>
                  {columns.map((col) => (
                    <TableHead
                      key={col}
                      className="font-semibold bg-muted/50 text-center whitespace-nowrap"
                    >
                      {getColumnDisplayHeader(col, config.columnDisplayMap)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, idx) => (
                  <TableRow key={row.id || idx}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row[config.rowLabelKey] || '-'}
                    </TableCell>
                    {columns.map((col) => {
                      const value = row[col];
                      const isLow =
                        config.highlightLowValues && isLowValue(value);
                      return (
                        <TableCell
                          key={col}
                          className={`text-center whitespace-nowrap ${
                            isLow ? 'text-red-600 font-semibold' : ''
                          }`}
                        >
                          {formatNumber(value)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {config.highlightLowValues && data.length > 0 && (
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          * Values below 100 tons are highlighted in red
        </div>
      )}
    </Card>
  );
}

// Main Inventory Page
export function Inventory() {
  const navigate = useNavigate();
  const { data, loading, loadAllInventory, loadingTable } = useInventoryStore();
  const { user } = useAuthStore();

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<InventoryTableName | null>(
    null
  );
  const [editingData, setEditingData] = useState<Record<string, any>[]>([]);

  // Check if user can edit (Admin or Editor)
  const canEdit = hasPermission(user?.profile?.role, 'edit');

  // Load inventory data on mount
  useEffect(() => {
    loadAllInventory();
  }, [loadAllInventory]);

  // Handle edit button click
  const handleEdit = (
    tableName: InventoryTableName,
    tableData: Record<string, any>[]
  ) => {
    setEditingTable(tableName);
    setEditingData(JSON.parse(JSON.stringify(tableData))); // Deep clone
    setEditModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setEditModalOpen(false);
    setEditingTable(null);
    setEditingData([]);
  };

  // Get config for editing table
  const getEditingConfig = () => {
    return tableConfigs.find((c) => c.tableName === editingTable) || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.dashboard)}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            View and manage steel inventory across all categories
          </p>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading inventory data...</p>
          </div>
        </div>
      )}

      {/* Inventory Sections */}
      {!loading && (
        <div className="space-y-6">
          {tableConfigs.map((config) => (
            <InventorySection
              key={config.tableName}
              config={config}
              data={data[config.tableName]}
              loading={loadingTable === config.tableName}
              canEdit={canEdit}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingTable && (
        <InventoryEditModal
          open={editModalOpen}
          onClose={handleCloseModal}
          tableName={editingTable}
          tableTitle={getEditingConfig()?.title || ''}
          rowLabelKey={getEditingConfig()?.rowLabelKey || 'type'}
          rowLabelDisplay={getEditingConfig()?.rowLabelDisplay}
          initialData={editingData}
          explicitColumns={getEditingConfig()?.explicitColumns}
          columnDisplayMap={getEditingConfig()?.columnDisplayMap}
        />
      )}
    </div>
  );
}
