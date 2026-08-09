import Dashboard from '@mui/icons-material/Dashboard';
import Description from '@mui/icons-material/Description';
import LocalShipping from '@mui/icons-material/LocalShipping';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import type { AppModule } from './types';

export interface NavLink {
  to: string;
  label: string;
  icon: typeof Dashboard;
  color: string;
  bg: string;
  module: AppModule;
}

export const NAV_LINKS: NavLink[] = [
  { to: '/', label: 'Dashboard', icon: Dashboard, color: '#31748f', bg: 'rgba(49,116,143,0.10)', module: 'dashboard' },
  { to: '/quotations', label: 'Quotations', icon: Description, color: '#0f766e', bg: 'rgba(15,118,110,0.10)', module: 'quotations' },
  { to: '/forwarders', label: 'Forwarders', icon: LocalShipping, color: '#b7791f', bg: 'rgba(183,121,31,0.12)', module: 'forwarders' },
  { to: '/users', label: 'Users', icon: ManageAccounts, color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', module: 'users' },
];
