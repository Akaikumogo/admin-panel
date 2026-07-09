import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  /** Ustun bo'yicha qidiruv (default: dataIndex yoki getFilterValue bo'lsa true) */
  filterable?: boolean;
  filterPlaceholder?: string;
  getFilterValue?: (record: T) => string;
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
    onChange?: (page: number, pageSize?: number) => void;
    hideOnSinglePage?: boolean;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: number | string | boolean; y?: number | string };
  onRow?: (record: T) => { onClick?: () => void; style?: React.CSSProperties };
  className?: string;
  emptyText?: React.ReactNode;
  locale?: Record<string, unknown>;
  /** Ustun filterlari (controlled) */
  columnFilters?: Record<string, string>;
  onColumnFiltersChange?: (filters: Record<string, string>) => void;
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

function getColumnId<T>(col: ColumnType<T>): string {
  return String(col.key ?? col.dataIndex ?? col.title);
}

function isColumnFilterable<T>(col: ColumnType<T>): boolean {
  if (col.filterable === false) return false;
  if (col.filterable === true) return true;
  const id = getColumnId(col);
  if (id === 'actions' || id === 'rowNumber' || id === '№') return false;
  return Boolean(col.dataIndex || col.getFilterValue);
}

function getCellFilterText<T extends Record<string, unknown>>(
  col: ColumnType<T>,
  record: T,
): string {
  if (col.getFilterValue) return col.getFilterValue(record);
  if (col.dataIndex) return String(record[col.dataIndex] ?? '');
  return '';
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
  columnFilters: controlledFilters,
  onColumnFiltersChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = React.useState<Record<string, string>>({});
  const columnFilters = controlledFilters ?? internalFilters;

  const setColumnFilters = (next: Record<string, string>) => {
    if (onColumnFiltersChange) onColumnFiltersChange(next);
    else setInternalFilters(next);
  };

  const paginated = pagination !== false;
  const serverSide = paginated && pagination.total != null;
  const pageSize = paginated ? (pagination.pageSize ?? 10) : dataSource.length;
  const [page, setPage] = React.useState(paginated ? (pagination.current ?? 1) : 1);

  React.useEffect(() => {
    if (paginated && pagination.current != null) {
      setPage(pagination.current);
    }
  }, [paginated, pagination !== false ? pagination.current : undefined]);

  const filteredData = React.useMemo(() => {
    if (onColumnFiltersChange) return dataSource;

    const active = Object.entries(columnFilters).filter(([, value]) => value.trim());
    if (!active.length) return dataSource;

    return dataSource.filter((record) =>
      active.every(([colId, query]) => {
        const col = columns.find((c) => getColumnId(c) === colId);
        if (!col) return true;
        const text = getCellFilterText(col, record).toLowerCase();
        return text.includes(query.trim().toLowerCase());
      }),
    );
  }, [columnFilters, columns, dataSource, onColumnFiltersChange]);

  const tableColumns = React.useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => {
        const id = getColumnId(col);
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
          meta: {
            align: col.align,
            width: col.width,
            ellipsis: col.ellipsis,
            filterable: isColumnFilterable(col),
            filterPlaceholder: col.filterPlaceholder,
          },
        };
      }),
    [columns],
  );

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const recordTotal = serverSide
    ? (pagination.total ?? 0)
    : filteredData.length;
  const currentPage = serverSide ? (pagination.current ?? page) : page;
  const paginatedRows = paginated && !serverSide
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows;
  const totalPages = Math.max(1, Math.ceil(recordTotal / pageSize));
  const pageSizeOptions = pagination !== false
    ? (pagination.pageSizeOptions ?? [20, 50, 100])
    : [20, 50, 100];
  const showPager = paginated;

  const goToPage = (nextPage: number) => {
    const safe = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safe);
    if (pagination !== false) {
      pagination.onChange?.(safe, pageSize);
    }
  };

  const changePageSize = (nextSize: string) => {
    const size = Number.parseInt(nextSize, 10);
    if (pagination !== false) {
      pagination.onChange?.(1, size);
    }
    setPage(1);
  };

  const updateColumnFilter = (colId: string, value: string) => {
    const next = { ...columnFilters, [colId]: value };
    if (!value.trim()) delete next[colId];
    setColumnFilters(next);
    if (!serverSide) setPage(1);
    else if (pagination !== false) pagination.onChange?.(1, pageSize);
  };

  const cellPadding = size === 'small' ? 'py-2 px-2' : size === 'large' ? 'py-4 px-4' : 'py-3 px-3';
  const hasColumnFilters = columns.some(isColumnFilterable);

  return (
    <div
      className={cn(
        'enterprise-table surface-panel relative dark:bg-[#0c0e14]',
        className,
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60">
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
          <TableHeader className="bg-muted/50 dark:bg-[#111318]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as {
                    align?: string;
                    width?: number | string;
                  } | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        cellPadding,
                        'text-foreground/80 dark:text-slate-300',
                        meta?.align === 'center' && 'text-center',
                        meta?.align === 'right' && 'text-right',
                      )}
                      style={{ width: meta?.width }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 font-semibold',
                            header.column.getCanSort() && 'cursor-pointer select-none',
                          )}
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
            {hasColumnFilters ? (
              <TableRow className="border-border bg-muted/30 dark:bg-[#0a0c10] hover:bg-muted/30 dark:hover:bg-[#0a0c10]">
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  const meta = header.column.columnDef.meta as {
                    align?: string;
                    width?: number | string;
                    filterable?: boolean;
                    filterPlaceholder?: string;
                  } | undefined;
                  const colId = header.column.id;

                  return (
                    <TableHead
                      key={`filter-${header.id}`}
                      className={cn(
                        'py-2 px-2',
                        meta?.align === 'center' && 'text-center',
                        meta?.align === 'right' && 'text-right',
                      )}
                      style={{ width: meta?.width }}
                    >
                      {meta?.filterable ? (
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            value={columnFilters[colId] ?? ''}
                            onChange={(e) => updateColumnFilter(colId, e.target.value)}
                            placeholder={meta.filterPlaceholder ?? 'Qidirish...'}
                            className="h-8 pl-7 text-xs bg-background dark:bg-[#151820] dark:border-slate-700 dark:placeholder:text-slate-500"
                            aria-label={`${colId} bo'yicha qidirish`}
                          />
                        </div>
                      ) : null}
                    </TableHead>
                  );
                })}
              </TableRow>
            ) : null}
          </TableHeader>
          <TableBody className="dark:bg-[#0c0e14]">
            {paginatedRows.length ? (
              paginatedRows.map((row) => {
                const record = row.original;
                const rowProps = onRow?.(record) ?? {};
                return (
                  <TableRow
                    key={getRowKey(record, rowKey, row.index)}
                    onClick={rowProps.onClick}
                    style={rowProps.style}
                    className={cn(
                      'border-border dark:border-slate-800 dark:hover:bg-[#151820]',
                      rowProps.onClick && 'cursor-pointer',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as {
                        align?: string;
                        ellipsis?: boolean;
                      } | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cellPadding,
                            'dark:text-slate-200',
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
      {showPager ? (
        <div className="flex flex-col gap-3 border-t border-border dark:border-slate-800 bg-muted/20 dark:bg-[#111318] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {recordTotal.toLocaleString('uz-UZ')} ta yozuv
            {Object.values(columnFilters).some((v) => v.trim()) ? ' (filtrlangan)' : ''}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {paginated && pagination.showSizeChanger ? (
              <Select value={String(pageSize)} onValueChange={changePageSize}>
                <SelectTrigger className="h-8 w-[120px] dark:bg-[#151820] dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt} / sahifa
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Oldingi
            </Button>
            <span className="text-sm tabular-nums text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Keyingi
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DataTable as Table };
