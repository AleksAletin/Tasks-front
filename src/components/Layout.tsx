import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';

/** Shared application shell: left navigation + routed content area. */
export function Layout() {
  return (
    <div className="layout">
      <NavBar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
