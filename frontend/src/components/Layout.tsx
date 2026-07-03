import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ScanLine,
  FileSpreadsheet,
  FileText,
  Building2,
  Tags,
  Users,
  UserCog,
  ScrollText,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RoleName } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: RoleName[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bienes', label: 'Bienes', icon: Package },
  { to: '/escaner', label: 'Escaner', icon: ScanLine },
  {
    to: '/excel',
    label: 'Importar / Exportar',
    icon: FileSpreadsheet,
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    to: '/pdf',
    label: 'PDF a Excel',
    icon: FileText,
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  { to: '/departamentos', label: 'Departamentos', icon: Building2 },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/responsables', label: 'Responsables', icon: Users },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['ADMIN'] },
  { to: '/auditoria', label: 'Auditoria', icon: ScrollText, roles: ['ADMIN'] },
];

export function Layout() {
  const { user, logout, hasRole } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => !n.roles || hasRole(...n.roles));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/logo.png" alt="UAEMEX" className="h-12 w-12 rounded-lg object-contain" />
        <div>
          <p className="text-sm font-bold leading-tight">Gestion de Activos</p>
          <p className="text-xs font-semibold text-gold-600">UAEMEX</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-brand-200 px-3 py-3 dark:border-brand-800">
        <button onClick={handleLogout} className="btn-secondary w-full">
          <LogOut size={16} /> Cerrar sesion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-brand-200 bg-white dark:border-brand-800 dark:bg-slate-900 lg:block">
        {SidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
            >
              {SidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-brand-200 bg-white px-4 py-3 dark:border-brand-800 dark:bg-slate-900">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-3 border-l border-brand-200 pl-3 dark:border-brand-700">
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight">
                  {user?.fullName}
                </p>
                <p className="text-xs text-slate-400">{user?.role.name}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-sm font-bold text-gold-700 dark:bg-gold-900 dark:text-gold-300">
                {user?.fullName?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
