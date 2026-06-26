import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Реестр по ролям' },
  { to: '/parity', label: 'Паритет-матрица' },
  { to: '/roles', label: 'Переключение ролей' },
  { to: '/metrics', label: 'Метрики' },
  { to: '/plan', label: 'План по фазам' },
  { to: '/gantt', label: 'Ресурсный гант' },
  { to: '/import', label: 'Импорт Excel' },
];

export function NavBar() {
  return (
    <nav className="nav">
      <div className="nav__brand">
        XRM migration tool
        <small>Трекер миграции</small>
      </div>
      <div className="nav__links">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'nav__link nav__link--active' : 'nav__link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
