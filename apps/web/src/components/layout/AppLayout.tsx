import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useOnlineStatus } from '../../lib/hooks/useOnlineStatus';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'DISPATCHER', 'TECH'] },
  { path: '/tickets', label: 'Tickets', icon: '🎫', roles: ['ADMIN', 'DISPATCHER', 'TECH'] },
  { path: '/sites', label: 'Sites', icon: '📍', roles: ['ADMIN', 'DISPATCHER', 'TECH'] }
];

const adminNavItems = [
  { path: '/admin/templates', label: 'Templates', icon: '📋', roles: ['ADMIN'] },
  { path: '/admin/site-owners', label: 'Site Owners', icon: '🏢', roles: ['ADMIN'] },
  { path: '/admin/users', label: 'Users', icon: '👥', roles: ['ADMIN'] },
  { path: '/admin/import-export', label: 'Import/Export', icon: '📥', roles: ['ADMIN'] }
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
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

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0f172a',
          color: '#fff',
          zIndex: 40,
          position: 'sticky',
          top: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div>
            <strong style={{ letterSpacing: '0.08em' }}>SiteTrackr</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{isOnline ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        <div style={{ position: 'relative' }} ref={profileMenuRef}>
          <div
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '999px',
              background: '#48d2c5',
              color: '#0f172a',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              opacity: profileMenuOpen ? 0.8 : 1
            }}
            title="Profile menu"
          >
            {initials}
          </div>
          
          {profileMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                minWidth: '180px',
                overflow: 'hidden',
                zIndex: 50
              }}
            >
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', color: '#6b7280' }}>
                {user?.displayName || user?.email}
              </div>
              <button
                onClick={handleProfileClick}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#374151',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>👤</span>
                <span>Profile</span>
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderTop: '1px solid #e5e7eb',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#dc2626',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>🚪</span>
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: sidebarOpen ? '240px' : '0',
            background: '#fff',
            borderRight: sidebarOpen ? '1px solid #e5e7eb' : 'none',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            position: 'sticky',
            top: 0,
            height: 'calc(100vh - 73px)', /* Subtract header height */
            alignSelf: 'flex-start'
          }}
        >
          <nav style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  textDecoration: 'none',
                  color: isActive ? '#0f766e' : '#374151',
                  background: isActive ? '#f0fdfa' : 'transparent',
                  borderLeft: isActive ? '3px solid #0f766e' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s'
                })}
                end={item.path === '/'}
              >
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              </NavLink>
            ))}
            
            {visibleAdminItems.length > 0 && (
              <>
                <div
                  style={{
                    padding: '1rem 1.5rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Admin
                </div>
                {visibleAdminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1.5rem',
                      textDecoration: 'none',
                      color: isActive ? '#0f766e' : '#374151',
                      background: isActive ? '#f0fdfa' : 'transparent',
                      borderLeft: isActive ? '3px solid #0f766e' : '3px solid transparent',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.2s'
                    })}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div className="main-view">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
