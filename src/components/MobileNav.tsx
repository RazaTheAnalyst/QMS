import { Link, useLocation } from 'react-router-dom';
import { Box, BottomNavigation, BottomNavigationAction, Fab, Badge } from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import Description from '@mui/icons-material/Description';
import LocalShipping from '@mui/icons-material/LocalShipping';
import Add from '@mui/icons-material/Add';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import type { AppModule } from '../types';

interface MobileNavProps {
  onAdd: () => void;
  pendingApprovalsCount: number;
  modules: AppModule[];
}

export function MobileNav({ onAdd, pendingApprovalsCount, modules }: MobileNavProps) {
  const location = useLocation();
  const isActive = (to: string) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const tabs = [
    { to: '/', label: 'Dashboard', icon: Dashboard, module: 'dashboard' as const },
    { to: '/quotations', label: 'Quotations', icon: Description, badge: pendingApprovalsCount, module: 'quotations' as const },
    { to: '/forwarders', label: 'Forwarders', icon: LocalShipping, module: 'forwarders' as const },
    { to: '/users', label: 'Users', icon: ManageAccounts, module: 'users' as const },
  ].filter(tab => modules.includes(tab.module));

  return (
    <Box sx={{ display: { md: 'none' }, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}>
      <BottomNavigation
        value={tabs.find(t => isActive(t.to))?.to ?? '/'}
        showLabels
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          backdropFilter: 'blur(12px)',
          height: 64,
        }}
      >
        {tabs.map(tab => (
          <BottomNavigationAction
            key={tab.to}
            component={Link}
            to={tab.to}
            label={tab.label}
            value={tab.to}
            icon={
              tab.badge && tab.badge > 0 ? (
                <Badge badgeContent={tab.badge > 99 ? '99+' : tab.badge} color="warning" sx={{ '& .MuiBadge-badge': { fontSize: 9, fontWeight: 700, height: 16, minWidth: 16 } }}>
                  <tab.icon />
                </Badge>
              ) : (
                <tab.icon />
              )
            }
            sx={{
              color: isActive(tab.to) ? 'primary.main' : 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' },
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          />
        ))}
      </BottomNavigation>
      <Fab
        color="primary"
        aria-label="Add quotation"
        onClick={onAdd}
        sx={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
      >
        <Add />
      </Fab>
    </Box>
  );
}
