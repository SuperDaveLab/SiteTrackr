import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  VisibilityState
} from '@tanstack/react-table';
import { Button } from '../../../components/common/Button';
import { listTickets, TicketListItem, TicketStatus } from '../api/ticketsApi';
import { useAuth } from '../../auth/hooks/useAuth';

const statusColors: Record<TicketStatus, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280'
};

const priorityColors: Record<string, string> = {
  LOW: '#6b7280',
  NORMAL: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#dc2626'
};

export const TicketsListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (!user) return {};
    const key = `ticketsTableColumnVisibility_v1_${user.id}`;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>(() => {
    const status = searchParams.get('status');
    return status && ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)
      ? (status as TicketStatus)
      : undefined;
  });

  const sortBy = sorting[0]?.id === 'updatedAt' ? 'updatedAt' : 'createdAt';
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc';

  // Persist column visibility
  useEffect(() => {
    if (!user) return;
    const key = `ticketsTableColumnVisibility_v1_${user.id}`;
    window.localStorage.setItem(key, JSON.stringify(columnVisibility));
  }, [columnVisibility, user?.id]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL params for status filter
  useEffect(() => {
    if (statusFilter) {
      setSearchParams({ status: statusFilter });
    } else {
      setSearchParams({});
    }
  }, [statusFilter, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { page, pageSize, search, sortBy, sortDir, status: statusFilter }],
    queryFn: () =>
      listTickets({
        page,
        pageSize,
        search: search || undefined,
        sortBy,
        sortDir,
        status: statusFilter
      }),
    placeholderData: keepPreviousData
  });

  const tickets = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo<ColumnDef<TicketListItem>[]>(
    () => [
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => (
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#fff',
              background: statusColors[getValue<TicketStatus>()],
              whiteSpace: 'nowrap'
            }}
          >
            {getValue<string>().replace('_', ' ')}
          </span>
        )
      },
      {
        id: 'priority',
        header: 'Priority',
        accessorKey: 'priority',
        cell: ({ getValue }) => (
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#fff',
              background: priorityColors[getValue<string>()],
              whiteSpace: 'nowrap'
            }}
          >
            {getValue<string>()}
          </span>
        )
      },
      {
        id: 'summary',
        header: 'Summary',
        accessorKey: 'summary',
        cell: ({ row }) => (
          <Link
            to={`/tickets/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
          >
            {row.original.summary}
          </Link>
        )
      },
      {
        id: 'siteCode',
        header: 'Site ID',
        accessorFn: (row) => row.site?.code ?? '',
        cell: ({ getValue }) => <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{getValue<string>()}</span>
      },
      {
        id: 'siteName',
        header: 'Site Name',
        accessorFn: (row) => row.site?.name ?? ''
      },
      {
        id: 'location',
        header: 'Location',
        accessorFn: (row) =>
          row.site?.city && row.site?.state ? `${row.site.city}, ${row.site.state}` : '',
        cell: ({ getValue }) => <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{getValue<string>()}</span>
      },
      {
        id: 'template',
        header: 'Template',
        accessorFn: (row) => row.template?.name ?? '',
        cell: ({ getValue }) => <span style={{ fontSize: '0.875rem' }}>{getValue<string>()}</span>
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        enableSorting: true,
        cell: ({ getValue }) => (
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {new Date(getValue<string>()).toLocaleString()}
          </span>
        )
      },
      {
        id: 'updatedAt',
        header: 'Updated',
        accessorKey: 'updatedAt',
        enableSorting: true,
        cell: ({ getValue }) => (
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {new Date(getValue<string>()).toLocaleString()}
          </span>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
      columnVisibility
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Tickets</h2>
        <Link to="/tickets/new" style={{ textDecoration: 'none' }}>
          <Button fullWidth={false}>+ New Ticket</Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder="Search tickets by summary, site code, or site name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            width: '100%'
          }}
        />

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setStatusFilter(undefined); setPage(1); }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: !statusFilter ? '2px solid #0f766e' : '1px solid #d1d5db',
              background: !statusFilter ? '#f0fdfa' : '#fff',
              cursor: 'pointer',
              fontWeight: !statusFilter ? 600 : 400,
              fontSize: '0.875rem'
            }}
          >
            All
          </button>
          {(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TicketStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: statusFilter === status ? '2px solid #0f766e' : '1px solid #d1d5db',
                background: statusFilter === status ? '#f0fdfa' : '#fff',
                cursor: 'pointer',
                fontWeight: statusFilter === status ? 600 : 400,
                fontSize: '0.875rem'
              }}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Column Visibility */}
        <details style={{ fontSize: '0.875rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
            Show/Hide Columns
          </summary>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem', paddingLeft: '1rem' }}>
            {table.getAllLeafColumns().map((column) => (
              <label key={column.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                {column.columnDef.header as string}
              </label>
            ))}
          </div>
        </details>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽'
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={table.getAllLeafColumns().length} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Loading tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={table.getAllLeafColumns().length} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No tickets found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/tickets/${row.original.id}`)}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.15s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ padding: '0.75rem 1rem' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: '#fff',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Showing {tickets.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} tickets
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              background: page <= 1 ? '#f3f4f6' : '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              background: page >= totalPages ? '#f3f4f6' : '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: '0.875rem'
            }}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
