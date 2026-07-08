import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

export type ColumnType<T = Record<string, unknown>> = {
  title: React.ReactNode;
  dataIndex?: string;
  key?: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  sorter?: boolean | ((a: T, b: T) => number);
  defaultSortOrder?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
};

export type DataTableProps<T extends Record<string, unknown>> = {
  columns: ColumnType<T>[];
  dataSource?: T[];
  rowKey?: keyof T | ((record: T) => string) | string;
  loading?: boolean;
  pagination?: false | {
    pageSize?: number;
    current?: number;
    total?: number;
    onChange?: (page: number) => void;
    hideOnSinglePage?: boolean;
    showSizeChanger?: boolean;
  };
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: number | string | boolean; y?: number | string };
  onRow?: (record: T) => { onClick?: () => void; style?: React.CSSProperties };
  className?: string;
  emptyText?: React.ReactNode;
  locale?: Record<string, unknown>;
};

function getRowKey<T extends Record<string, unknown>>(
  record: T,
  rowKey: DataTableProps<T>['rowKey'],
  index: number,
): string {
  if (typeof rowKey === 'function') return rowKey(record);
  if (typeof rowKey === 'string' && record[rowKey] != null) return String(record[rowKey]);
  if (record.key != null) return String(record.key);
  if (record.id != null) return String(record.id);
  return String(index);
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  dataSource = [],
  rowKey = 'key',
  loading,
  pagination = { pageSize: 10 },
  size = 'middle',
  scroll,
  onRow,
  className,
  emptyText = 'Ma\'lumot yo\'q',
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const paginated = pagination !== false;
  const [page, setPage] = React.useState(paginated ? (pagination.current ?? 1) : 1);
  const pageSize = paginated ? (pagination.pageSize ?? 10) : dataSource.length;

  const tableColumns = React.useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => {
        const id = col.key ?? col.dataIndex ?? String(col.title);
        return {
          id,
          accessorKey: col.dataIndex,
          header: () => col.title,
          cell: ({ row }) => {
            const value = col.dataIndex ? row.original[col.dataIndex] : undefined;
            return col.render ? col.render(value, row.original, row.index) : (value as React.ReactNode);
          },
          enableSorting: !!col.sorter,
          sortingFn:
            typeof col.sorter === 'function'
              ? (a, b) => (col.sorter as (a: T, b: T) => number)(a.original, b.original)
              : 'alphanumeric',
          meta: { align: col.align, width: col.width, ellipsis: col.ellipsis },
        };
      }),
    [columns],
  );

  const table = useReactTable({
    data: dataSource,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const total = rows.length;
  const paginatedRows = paginated ? rows.slice((page - 1) * pageSize, page * pageSize) : rows;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cellPadding = size === 'small' ? 'py-2 px-2' : size === 'large' ? 'py-4 px-4' : 'py-3 px-3';

  return (
    <div className={cn('relative rounded-xl border bg-card', className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60">
          <Spinner size={28} />
        </div>
      ) : null}
      <div
        className="overflow-auto"
        style={{
          maxHeight: scroll?.y,
          maxWidth: scroll?.x === true ? '100%' : typeof scroll?.x === 'number' ? scroll.x : undefined,
        }}
      >
        <UITable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { align?: string; width?: number | string } | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(cellPadding, meta?.align === 'center' && 'text-center', meta?.align === 'right' && 'text-right')}
                      style={{ width: meta?.width }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn('inline-flex items-center gap-1', header.column.getCanSort() && 'cursor-pointer select-none')}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? (
                            header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                            )
                          ) : null}
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {paginatedRows.length ? (
              paginatedRows.map((row) => {
                const record = row.original;
                const rowProps = onRow?.(record) ?? {};
                return (
                  <TableRow
                    key={getRowKey(record, rowKey, row.index)}
                    onClick={rowProps.onClick}
                    style={rowProps.style}
                    className={rowProps.onClick ? 'cursor-pointer' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { align?: string; ellipsis?: boolean } | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cellPadding,
                            meta?.align === 'center' && 'text-center',
                            meta?.align === 'right' && 'text-right',
                            meta?.ellipsis && 'max-w-[200px] truncate',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UITable>
      </div>
      {paginated && totalPages > 1 ? (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">{total} ta yozuv</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); pagination.onChange?.(page - 1); }}>
              Oldingi
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(page + 1); pagination.onChange?.(page + 1); }}>
              Keyingi
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DataTable as Table };
