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
  /** Ant Design — guruh ustunlari (masalan Ruxsatlar switchlari) */
  children?: ColumnType<T>[];
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

function flattenLeafColumns<T>(columns: ColumnType<T>[]): ColumnType<T>[] {
  const out: ColumnType<T>[] = [];
  for (const col of columns) {
    if (col.children?.length) {
      out.push(...flattenLeafColumns(col.children));
    } else {
      out.push(col);
    }
  }
  return out;
}

function hasGroupedColumns<T>(columns: ColumnType<T>[]): boolean {
  return columns.some((c) => (c.children?.length ?? 0) > 0);
}

function findLeafColumn<T>(columns: ColumnType<T>[], colId: string): ColumnType<T> | undefined {
  for (const col of columns) {
    if (col.children?.length) {
      const found = findLeafColumn(col.children, colId);
      if (found) return found;
    } else if (getColumnId(col) === colId) {
      return col;
    }
  }
  return undefined;
}

function colDefFromType<T>(col: ColumnType<T>): ColumnDef<T> {
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
      fixed: col.fixed,
    },
  };
}

function parseColumnWidth(width?: number | string): number | undefined {
  if (width == null) return undefined;
  if (typeof width === 'number') return width;
  const n = Number.parseInt(String(width), 10);
  return Number.isFinite(n) ? n : undefined;
}

function buildFixedOffsets<T>(columns: ColumnType<T>[]) {
  const leaf = flattenLeafColumns(columns);
  let left = 0;
  let right = 0;
  const leftOffsets = new Map<string, number>();
  const rightOffsets = new Map<string, number>();
  const leftZ = new Map<string, number>();
  const rightZ = new Map<string, number>();
  const defaultWidth = 160;
  let leftCount = 0;
  let rightCount = 0;

  for (const col of leaf) {
    const id = getColumnId(col);
    const w = parseColumnWidth(col.width) ?? defaultWidth;
    if (col.fixed === 'left') {
      leftOffsets.set(id, left);
      leftZ.set(id, 30 + leftCount);
      left += w;
      leftCount += 1;
    }
  }
  for (let i = leaf.length - 1; i >= 0; i--) {
    const col = leaf[i];
    const id = getColumnId(col);
    const w = parseColumnWidth(col.width) ?? 120;
    if (col.fixed === 'right') {
      rightOffsets.set(id, right);
      rightZ.set(id, 30 + rightCount);
      right += w;
      rightCount += 1;
    }
  }
  return { leftOffsets, rightOffsets, leftZ, rightZ };
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  dataSource = [],
  rowKey = 'key',
  loading,
  pagination = { pageSize: 20, showSizeChanger: true },
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
  const [draftFilters, setDraftFilters] = React.useState<Record<string, string>>(columnFilters);
  const filterDebounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setDraftFilters(columnFilters);
  }, [columnFilters]);

  React.useEffect(
    () => () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    },
    [],
  );
  const { leftOffsets, rightOffsets, leftZ, rightZ } = React.useMemo(
    () => buildFixedOffsets(columns),
    [columns],
  );

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

  const leafColumns = React.useMemo(() => flattenLeafColumns(columns), [columns]);
  const groupedHeaders = hasGroupedColumns(columns);

  const tableColumns = React.useMemo<ColumnDef<T>[]>(
    () => leafColumns.map((col) => colDefFromType(col)),
    [leafColumns],
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
    const nextDraft = { ...draftFilters, [colId]: value };
    if (!value.trim()) delete nextDraft[colId];
    setDraftFilters(nextDraft);

    if (onColumnFiltersChange) {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
      filterDebounceRef.current = setTimeout(() => {
        onColumnFiltersChange(nextDraft);
        if (pagination !== false) pagination.onChange?.(1, pageSize);
      }, 400);
      return;
    }

    const next = { ...columnFilters, [colId]: value };
    if (!value.trim()) delete next[colId];
    setColumnFilters(next);
    if (!serverSide) setPage(1);
    else if (pagination !== false) pagination.onChange?.(1, pageSize);
  };

  const cellPadding = size === 'small' ? 'py-2 px-2' : size === 'large' ? 'py-4 px-4' : 'py-3 px-3';
  const hasColumnFilters = leafColumns.some(isColumnFilterable);

  const renderHeaderCell = (
    col: ColumnType<T>,
    colId: string,
    title: React.ReactNode,
    canSort: boolean,
    onSort?: () => void,
    sortState?: false | 'asc' | 'desc',
    rowSpan?: number,
    colSpan?: number,
  ) => {
    const meta = col;
    const fixed = col.fixed;
    return (
      <TableHead
        key={colId}
        rowSpan={rowSpan}
        colSpan={colSpan}
        className={cn(
          cellPadding,
          'text-foreground/80 dark:text-slate-300',
          meta.align === 'center' && 'text-center',
          meta.align === 'right' && 'text-right',
          stickyCellClass(fixed, true),
        )}
        style={stickyStyle(colId, fixed, meta.width, true)}
      >
        {canSort ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold cursor-pointer select-none"
            onClick={onSort}
          >
            {title}
            {sortState === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : sortState === 'desc' ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
            )}
          </button>
        ) : (
          <span className="font-semibold">{title}</span>
        )}
      </TableHead>
    );
  };

  const stickyCellClass = (fixed?: 'left' | 'right', isHeader?: boolean) =>
    cn(
      fixed === 'left' &&
        'sticky border-r border-border shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.45)] overflow-hidden',
      fixed === 'right' &&
        'sticky border-l border-border shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.45)] overflow-hidden',
      fixed === 'left' &&
        (isHeader ? 'bg-muted dark:bg-[#111318]' : 'bg-card dark:bg-[#0c0e14]'),
      fixed === 'right' &&
        (isHeader ? 'bg-muted dark:bg-[#111318]' : 'bg-card dark:bg-[#0c0e14]'),
      isHeader && fixed && 'z-40',
    );

  const stickyStyle = (
    colId: string,
    fixed?: 'left' | 'right',
    width?: number | string,
    isHeader?: boolean,
  ): React.CSSProperties | undefined => {
    const resolvedWidth = width ?? (fixed === 'right' ? 120 : 160);
    if (fixed === 'left') {
      return {
        left: leftOffsets.get(colId) ?? 0,
        width: resolvedWidth,
        minWidth: resolvedWidth,
        maxWidth: resolvedWidth,
        zIndex: isHeader ? 50 : (leftZ.get(colId) ?? 30),
      };
    }
    if (fixed === 'right') {
      return {
        right: rightOffsets.get(colId) ?? 0,
        width: resolvedWidth,
        minWidth: resolvedWidth,
        maxWidth: resolvedWidth,
        zIndex: isHeader ? 50 : (rightZ.get(colId) ?? 30),
      };
    }
    return width != null ? { width, minWidth: width } : undefined;
  };

  return (
    <div
      className={cn(
        'enterprise-table relative w-full min-w-0 max-w-full rounded-xl border border-border bg-card dark:bg-[#0c0e14]',
        className,
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60">
          <Spinner size={28} />
        </div>
      ) : null}
      <div
        className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto"
        style={{
          maxHeight: scroll?.y,
        }}
      >
        <UITable
          className={cn(
            'w-full',
            scroll?.x ? 'table-auto' : 'min-w-full table-fixed',
          )}
          style={
            typeof scroll?.x === 'number'
              ? { minWidth: scroll.x }
              : scroll?.x
                ? { minWidth: 'max-content' }
                : undefined
          }
        >
          <TableHeader className="sticky top-0 z-[45] bg-muted dark:bg-[#111318]">
            {groupedHeaders ? (
              <>
                <TableRow className="border-border hover:bg-transparent">
                  {columns.map((col) => {
                    const colId = getColumnId(col);
                    if (col.children?.length) {
                      return renderHeaderCell(
                        col,
                        `group-${colId}`,
                        col.title,
                        false,
                        undefined,
                        undefined,
                        undefined,
                        col.children.length,
                      );
                    }
                    return renderHeaderCell(
                      col,
                      colId,
                      col.title,
                      false,
                      undefined,
                      undefined,
                      2,
                    );
                  })}
                </TableRow>
                <TableRow className="border-border hover:bg-transparent">
                  {columns.flatMap((col) => {
                    if (!col.children?.length) return [];
                    return col.children.map((child) => {
                      const childId = getColumnId(child);
                      return renderHeaderCell(child, childId, child.title, false);
                    });
                  })}
                </TableRow>
              </>
            ) : (
              table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const col = findLeafColumn(columns, header.column.id);
                    const meta = header.column.columnDef.meta as {
                      align?: string;
                      width?: number | string;
                      fixed?: 'left' | 'right';
                    } | undefined;
                    const fixed = col?.fixed ?? meta?.fixed;
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          cellPadding,
                          'text-foreground/80 dark:text-slate-300',
                          meta?.align === 'center' && 'text-center',
                          meta?.align === 'right' && 'text-right',
                          stickyCellClass(fixed, true),
                        )}
                        style={stickyStyle(header.column.id, fixed, meta?.width, true)}
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
              ))
            )}
            {hasColumnFilters && !groupedHeaders ? (
              <TableRow className="border-border bg-muted/30 dark:bg-[#0a0c10] hover:bg-muted/30 dark:hover:bg-[#0a0c10]">
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  const col = findLeafColumn(columns, header.column.id);
                  const meta = header.column.columnDef.meta as {
                    align?: string;
                    width?: number | string;
                    filterable?: boolean;
                    filterPlaceholder?: string;
                    fixed?: 'left' | 'right';
                  } | undefined;
                  const colId = header.column.id;
                  const fixed = col?.fixed ?? meta?.fixed;

                  return (
                    <TableHead
                      key={`filter-${header.id}`}
                      className={cn(
                        'py-2 px-2',
                        meta?.align === 'center' && 'text-center',
                        meta?.align === 'right' && 'text-right',
                        stickyCellClass(fixed, true),
                      )}
                      style={stickyStyle(colId, fixed, meta?.width, true)}
                    >
                      {meta?.filterable ? (
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            value={draftFilters[colId] ?? ''}
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
                      row.index % 2 === 1 && 'bg-muted/20 dark:bg-white/[0.02]',
                      'hover:bg-muted/45 dark:hover:bg-[#151820]',
                      rowProps.onClick && 'cursor-pointer',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const col = findLeafColumn(columns, cell.column.id);
                      const meta = cell.column.columnDef.meta as {
                        align?: string;
                        ellipsis?: boolean;
                        width?: number | string;
                        fixed?: 'left' | 'right';
                      } | undefined;
                      const fixed = col?.fixed ?? meta?.fixed;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cellPadding,
                            'dark:text-slate-200',
                            meta?.align === 'center' && 'text-center',
                            meta?.align === 'right' && 'text-right',
                            meta?.ellipsis && 'truncate',
                            stickyCellClass(fixed, false),
                          )}
                          style={stickyStyle(cell.column.id, fixed, meta?.width, false)}
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
                <TableCell colSpan={leafColumns.length} className="h-24 text-center text-muted-foreground">
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
