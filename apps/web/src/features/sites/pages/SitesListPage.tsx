import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  VisibilityState
} from '@tanstack/react-table';
import { fetchSites, SiteSummary } from '../api/sitesApi';
import { useAuth } from '../../auth/hooks/useAuth';

export const SitesListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (!user) return {};
    const key = `sitesTableColumnVisibility_v1_${user.id}`;
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

  const sortBy = (() => {
    const id = sorting[0]?.id;
    if (id === 'updatedAt' || id === 'name' || id === 'code') return id;
    return 'createdAt';
  })();
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc';

  // Persist column visibility
  useEffect(() => {
    if (!user) return;
    const key = `sitesTableColumnVisibility_v1_${user.id}`;
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

  const { data, isLoading } = useQuery({
    queryKey: ['sites', { page, pageSize, search, sortBy, sortDir }],
    queryFn: () =>
      fetchSites({
        page,
        pageSize,
        search: search || undefined,
        sortBy,
        sortDir
      }),
    keepPreviousData: true
  });

  const sites = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo<ColumnDef<SiteSummary>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        accessorKey: 'code',
        enableSorting: true,
        cell: ({ getValue }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 500 }}>
            {getValue<string>() || '—'}
          </span>
        )
      },
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            to={`/sites/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
          >
            {row.original.name}
          </Link>
        )
      },
      {
        id: 'marketName',
        header: 'Market Name',
        accessorKey: 'marketName',
        cell: ({ getValue }) => (
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            {getValue<string>() || '—'}
          </span>
        )
      },
      {
        id: 'city',
        header: 'City',
        accessorKey: 'city',
        cell: ({ getValue }) => <span style={{ fontSize: '0.875rem' }}>{getValue<string>() || '—'}</span>
      },
      {
        id: 'state',
        header: 'State',
        accessorKey: 'state',
        cell: ({ getValue }) => (
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {getValue<string>() || '—'}
          </span>
        )
      },
      {
        id: 'owner',
        header: 'Owner',
        accessorFn: (row) => row.owner?.name ?? '',
        cell: ({ getValue }) => (
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {getValue<string>() || '—'}
          </span>
        )
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
    data: sites,
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
      <h2 style={{ margin: 0 }}>Sites</h2>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder="Search sites by name, code, city, or state..."
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
                  Loading sites...
                </td>
              </tr>
            ) : sites.length === 0 ? (
              <tr>
                <td colSpan={table.getAllLeafColumns().length} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No sites found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/sites/${row.original.id}`)}
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
          Showing {sites.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} sites
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
