import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { SyncStatusBadge } from '../../offline/SyncStatusBadge';
import { useTheme } from '../../theme/ThemeProvider';
import './AppLayout.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'DISPATCHER', 'TECH'] },
  { path: '/tickets', label: 'Tickets', icon: '🎫', roles: ['ADMIN', 'DISPATCHER', 'TECH'] },
  { path: '/sites', label: 'Sites', icon: '📍', roles: ['ADMIN', 'DISPATCHER', 'TECH'] },
  { path: '/map', label: 'Map View', icon: '🗺️', roles: ['ADMIN', 'DISPATCHER', 'TECH'] }
];

const adminNavItems = [
  { path: '/admin/templates', label: 'Templates', icon: '📋', roles: ['ADMIN'] },
  { path: '/admin/site-owners', label: 'Site Owners', icon: '🏢', roles: ['ADMIN'] },
  { path: '/admin/users', label: 'Users', icon: '👥', roles: ['ADMIN'] },
  { path: '/admin/import-export', label: 'Import/Export', icon: '📥', roles: ['ADMIN'] },
  { path: '/admin/sync-queue', label: 'Sync Queue', icon: '🔁', roles: ['ADMIN'] },
  { path: '/admin/branding', label: 'Branding', icon: '🎨', roles: ['ADMIN'] }
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const { branding } = useTheme();
  const navigate = useNavigate();
  const initials = user?.displayName?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? 'ST';
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const isAdmin = user?.role === 'ADMIN';
  const visibleNavItems = navItems.filter(item => item.roles.includes(user?.role || 'TECH'));
  const visibleAdminItems = isAdmin ? adminNavItems : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileMenuOpen]);

  const handleProfileClick = () => {
    setProfileMenuOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
  };

  const buildNavClass = (isActive: boolean) =>
    ['sidebar-link', isActive ? 'is-active' : undefined].filter(Boolean).join(' ');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Company logo" className="app-logo-image" />
            ) : (
              <span className="app-logo-text">SiteTrackr</span>
            )}
            <div className="app-logo-status">
              <SyncStatusBadge />
            </div>
          </div>
        </div>
        <div className="profile-menu-anchor" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="profile-menu-trigger"
            title="Profile menu"
          >
            {initials}
          </button>
          {profileMenuOpen && (
            <div className="profile-menu-panel">
              <div className="profile-menu-header">{user?.displayName || user?.email}</div>
              <button className="profile-menu-button" onClick={handleProfileClick}>
                <span>👤</span>
                <span>Profile</span>
              </button>
              <button className="profile-menu-button logout" onClick={handleLogout}>
                <span>🚪</span>
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside
          className="sidebar"
          style={{ width: sidebarOpen ? '240px' : '0', borderRightWidth: sidebarOpen ? undefined : 0 }}
        >
          <nav>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => buildNavClass(isActive)}
                end={item.path === '/'}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}

            {visibleAdminItems.length > 0 && (
              <>
                <div className="sidebar-section-title">Admin</div>
                {visibleAdminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => buildNavClass(isActive)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </aside>

        <main className="main-content">
          <div className="main-scroll">
            <div className="main-view">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
