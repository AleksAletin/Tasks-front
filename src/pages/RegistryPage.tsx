import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useRoles } from '../api/roles';
import type { Role, RoleStatus } from '../types/domain';

const STATUS_LABELS: Record<RoleStatus, string> = {
  planning: 'Планирование',
  in_progress: 'В работе',
  switched: 'Переключена',
};

const columnHelper = createColumnHelper<Role>();

const columns = [
  columnHelper.accessor('name', { header: 'Роль' }),
  columnHelper.accessor('status', {
    header: 'Статус',
    cell: (info) => (
      <span className="badge">{STATUS_LABELS[info.getValue()]}</span>
    ),
  }),
  columnHelper.accessor('readinessPercent', {
    header: 'Готовность',
    cell: (info) => {
      const value = info.getValue();
      return value == null ? '—' : `${value}%`;
    },
  }),
  columnHelper.accessor('switchDate', {
    header: 'Дата переключения',
    cell: (info) => info.getValue() ?? '—',
  }),
];

function RolesTable({ roles }: { roles: Role[] }) {
  const table = useReactTable({
    data: roles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="table">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RegistryPage() {
  const { data, isLoading, isError, error } = useRoles();

  // Memoize so the rendered content branch is easy to read/extend.
  const body = useMemo(() => {
    if (isLoading) {
      return <div className="state">Загрузка реестра…</div>;
    }

    if (isError) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      return (
        <div className="state state--error">
          Не удалось загрузить роли. Проверьте, что backend доступен.
          <div className="state__detail">{message}</div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return <div className="state">Реестр пуст — нет ни одной роли.</div>;
    }

    return <RolesTable roles={data} />;
  }, [data, isLoading, isError, error]);

  return (
    <section>
      <h1 className="page__title">Реестр по ролям</h1>
      <p className="page__subtitle">
        Список ролей миграции со статусом и процентом готовности.
      </p>
      {body}
    </section>
  );
}
