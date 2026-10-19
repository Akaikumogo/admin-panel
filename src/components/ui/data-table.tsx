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
  /** Multi-line cell (avatar + name) — disable nowrap */
  wrap?: boolean;
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
  onRow?: (record: T) => {
    onClick?: (e?: React.MouseEvent) => void;
    style?: React.CSSProperties;
  };
  className?: string;
  emptyText?: React.ReactNode;
  locale?: Record<string, unknown>;
  /** Ustun filterlari (controlled) */
  columnFilters?: Record<string, string>;
  onColumnFiltersChange?: (filters: Record<string, string>) => void;
  /** Controlled expand: only the row whose key matches is expanded */
  expandedRowKey?: string | null;
  /** Rendered in a full-width row immediately below the expanded data row */
  expandedRowRender?: (record: T) => React.ReactNode;
  /** Flat: no outer/cell borders; subtle row separators ok */
  variant?: 'default' | 'flat';
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
  if (id === 'actions' || id === 'rowNumber' || id === '№' || id === 'expand') return false;
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
      wrap: col.wrap,
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
  pagination = { pageSize: 10, showSizeChanger: true },
  size = 'middle',
  scroll,
  onRow,
  className,
  emptyText = 'Ma\'lumot yo\'q',
  columnFilters: controlledFilters,
  onColumnFiltersChange,
  expandedRowKey,
  expandedRowRender,
  variant = 'default',
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = React.useState<Record<string, string>>({});
  const columnFilters = controlledFilters ?? internalFilters;
  const [draftFilters, setDraftFilters] = React.useState<Record<string, string>>(columnFilters);
  const filterDebounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ active: boolean; moved: boolean; startX: number; scrollLeft: number }>({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const isFlat = variant === 'flat';

  const isDragInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'button, a, input, label, textarea, select, option, [role="button"], [role="checkbox"], [role="switch"], [contenteditable="true"], [data-stop-row-click], [data-no-drag-scroll]',
      ),
    );
  };

  const onScrollPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (isDragInteractiveTarget(e.target)) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onScrollPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const endScrollDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
    try {
      scrollContainerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onScrollClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

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
    ? (pagination.pageSizeOptions ?? [10, 20, 50, 100])
    : [10, 20, 50, 100];
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

  const cellPadding = size === 'small' ? 'py-2 px-2.5' : size === 'large' ? 'py-3.5 px-3.5' : 'py-2.5 px-3';
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
          'text-muted-foreground',
          meta.align === 'center' && 'text-center',
          meta.align === 'right' && 'text-right',
          stickyCellClass(fixed, true),
        )}
        style={stickyStyle(colId, fixed, meta.width, true)}
      >
        {canSort ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.04em]"
            onClick={onSort}
          >
            {title}
            {sortState === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : sortState === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-35" />
            )}
          </button>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">
            {title}
          </span>
        )}
      </TableHead>
    );
  };

  const stickyCellClass = (fixed?: 'left' | 'right', isHeader?: boolean) =>
    cn(
      fixed === 'left' &&
        cn(
          'sticky overflow-hidden shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.45)]',
          !isFlat && 'border-r border-border',
        ),
      fixed === 'right' &&
        cn(
          'sticky overflow-hidden shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.45)]',
          !isFlat && 'border-l border-border',
        ),
      fixed === 'left' &&
        (isHeader ? 'bg-[var(--table-header)]' : 'bg-[var(--table-surface)]'),
      fixed === 'right' &&
        (isHeader ? 'bg-[var(--table-header)]' : 'bg-[var(--table-surface)]'),
      isHeader && fixed && 'z-40',
    );

  const stickyStyle = (
    colId: string,
    fixed?: 'left' | 'right',
    width?: number | string,
    isHeader?: boolean,
    opts?: { skipWidth?: boolean },
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
    if (opts?.skipWidth || width == null) return undefined;
    // Leaf columns: preferred width only (no maxWidth lock) so headers stay aligned
    return { width, minWidth: typeof width === 'number' ? width : width };
  };

  const hasHorizontalScroll = scroll?.x != null && scroll.x !== false;

  return (
    <div
      className={cn(
        'enterprise-table relative w-full min-w-0 max-w-full overflow-hidden bg-[var(--table-surface)]',
        isFlat ? 'rounded-none border-0 shadow-none' : 'rounded-xl border border-border',
        className,
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/60">
          <Spinner size={28} />
        </div>
      ) : null}
      <div
        ref={scrollContainerRef}
        className={cn(
          'w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto overscroll-x-contain',
          '[&_button]:cursor-pointer [&_a]:cursor-pointer [&_input]:cursor-text [&_textarea]:cursor-text [&_select]:cursor-pointer [&_[role=switch]]:cursor-pointer',
          hasHorizontalScroll && (isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'),
        )}
        style={{
          maxHeight: scroll?.y,
        }}
        onPointerDown={hasHorizontalScroll ? onScrollPointerDown : undefined}
        onPointerMove={hasHorizontalScroll ? onScrollPointerMove : undefined}
        onPointerUp={hasHorizontalScroll ? endScrollDrag : undefined}
        onPointerCancel={hasHorizontalScroll ? endScrollDrag : undefined}
        onClickCapture={hasHorizontalScroll ? onScrollClickCapture : undefined}
      >
        <UITable
          className="w-full table-fixed border-separate border-spacing-0"
          style={
            typeof scroll?.x === 'number'
              ? { minWidth: scroll.x, width: '100%' }
              : scroll?.x === true || scroll?.x === 'max-content'
                ? { minWidth: 'max-content', width: '100%' }
                : { width: '100%' }
          }
        >
          <TableHeader className="sticky top-0 z-[45] bg-[var(--table-header)]">
            {groupedHeaders ? (
              <>
                <TableRow className={cn(isFlat ? 'border-border/40' : 'border-border', 'hover:bg-transparent')}>
                  {columns.map((col) => {
                    const colId = getColumnId(col);
                    if (col.children?.length) {
                      // Group headers: no width style — leaf columns own the widths
                      return (
                        <TableHead
                          key={`group-${colId}`}
                          colSpan={col.children.length}
                          className={cn(
                            cellPadding,
                            'text-center text-muted-foreground',
                          )}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">
                            {col.title}
                          </span>
                        </TableHead>
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
                <TableRow className={cn(isFlat ? 'border-border/40' : 'border-border', 'hover:bg-transparent')}>
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
                <TableRow key={headerGroup.id} className={cn(isFlat ? 'border-border/40' : 'border-border', 'hover:bg-transparent')}>
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
                          'text-muted-foreground',
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
                              'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em]',
                              header.column.getCanSort() && 'cursor-pointer select-none',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() ? (
                              header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-35" />
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
              <TableRow className={cn(isFlat ? 'border-border/40' : 'border-border', 'bg-[var(--table-header)]/70 hover:bg-[var(--table-header)]/70')}>
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
                            className="h-8 pl-7 text-xs bg-card border-border placeholder:text-muted-foreground/70"
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
          <TableBody className="bg-[var(--table-surface)]">
            {paginatedRows.length ? (
              paginatedRows.map((row) => {
                const record = row.original;
                const rowProps = onRow?.(record) ?? {};
                const key = getRowKey(record, rowKey, row.index);
                const isExpanded =
                  expandedRowRender != null &&
                  expandedRowKey != null &&
                  expandedRowKey === key;
                return (
                  <React.Fragment key={key}>
                    <TableRow
                      onClick={(e) => {
                        const el = e.target as HTMLElement | null;
                        if (
                          el?.closest(
                            'button, a, input, label, textarea, select, [data-stop-row-click]',
                          )
                        ) {
                          return;
                        }
                        rowProps.onClick?.(e);
                      }}
                      style={rowProps.style}
                      className={cn(
                        isFlat ? 'border-border/40' : 'border-border',
                        'hover:bg-[var(--table-row-hover)]',
                        rowProps.onClick && 'cursor-pointer',
                        isExpanded && 'bg-[var(--table-row-hover)]',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const col = findLeafColumn(columns, cell.column.id);
                        const meta = cell.column.columnDef.meta as {
                          align?: string;
                          ellipsis?: boolean;
                          wrap?: boolean;
                          width?: number | string;
                          fixed?: 'left' | 'right';
                        } | undefined;
                        const fixed = col?.fixed ?? meta?.fixed;
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              cellPadding,
                              'align-middle text-foreground overflow-hidden',
                              meta?.ellipsis
                                ? 'max-w-0 truncate'
                                : meta?.wrap
                                  ? 'whitespace-normal'
                                  : 'whitespace-nowrap',
                              meta?.align === 'center' && 'text-center',
                              meta?.align === 'right' && 'text-right',
                              stickyCellClass(fixed, false),
                            )}
                            style={stickyStyle(cell.column.id, fixed, meta?.width, false)}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {isExpanded ? (
                      <TableRow
                        key={`${key}-expanded`}
                        className={cn(
                          isFlat ? 'border-border/40' : 'border-border',
                          'bg-[var(--table-header)] hover:bg-[var(--table-header)]',
                        )}
                      >
                        <TableCell
                          colSpan={leafColumns.length}
                          className={cn(cellPadding, 'text-foreground')}
                        >
                          <div className="min-w-0 overflow-x-auto py-2" data-stop-row-click>
                            {expandedRowRender(record)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
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
        <div
          className={cn(
            'flex flex-col gap-3 bg-[var(--table-header)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
            isFlat ? 'border-t border-border/40' : 'border-t border-border',
          )}
        >
          <span className="text-sm text-muted-foreground">
            {recordTotal.toLocaleString('uz-UZ')} ta yozuv
            {Object.values(columnFilters).some((v) => v.trim()) ? ' (filtrlangan)' : ''}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {paginated && pagination.showSizeChanger ? (
              <Select value={String(pageSize)} onValueChange={changePageSize}>
                <SelectTrigger className="h-8 w-[120px] bg-card border-border">
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
