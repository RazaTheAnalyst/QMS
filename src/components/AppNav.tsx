import { Link, useLocation } from 'react-router-dom';
import type { AppModule } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../auth';
import { getUserName } from '@/lib/utils';
import { NAV_LINKS } from '../navColors';
import {
  AppBar, Toolbar, Box, Button, IconButton, Typography, Tooltip,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import Logout from '@mui/icons-material/Logout';

interface AppNavProps {
  onAdd: () => void;
  modules: AppModule[];
}

const utilityButtonSx = {
  width: 38,
  height: 38,
  borderRadius: 1,
  color: 'text.secondary',
  bgcolor: 'transparent',
  '&:hover': {
    bgcolor: 'background.paper',
    color: 'primary.main',
  },
};

export function AppNav({ onAdd, modules }: AppNavProps) {
  const { toggleTheme, theme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const userName = getUserName(user);
  const visibleLinks = NAV_LINKS.filter(link => modules.includes(link.module));

  return (
    <AppBar position="sticky" elevation={0} sx={{
      bgcolor: 'background.paper',
      borderBottom: '1px solid',
      borderColor: 'divider',
      backdropFilter: 'blur(12px)',
      zIndex: theme => theme.zIndex.drawer + 2,
    }}>
      <Toolbar sx={{
        maxWidth: 1680,
        width: '100%',
        mx: 'auto',
        px: { xs: 1.5, sm: 2, lg: 3 },
        minHeight: { xs: 56, sm: 62 },
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'auto auto minmax(0, 1fr)' },
        gap: { xs: 1, md: 2.5 },
      }}>
        <Box component={Link} to="/" sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textDecoration: 'none',
          color: 'inherit',
          minWidth: 0,
        }}>
          <Box sx={{
            width: { xs: 34, sm: 38 },
            height: { xs: 34, sm: 38 },
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px -8px rgba(23,32,31,0.15)',
            flexShrink: 0,
          }}>
            <Box component="img" src="/logo.svg" alt="Logo" sx={{ width: { xs: 23, sm: 26 }, height: { xs: 23, sm: 26 } }} />
          </Box>
          <Typography fontWeight={850} fontSize={{ xs: '0.95rem', sm: '1.05rem' }} color="text.primary" noWrap>
            QMS
          </Typography>
        </Box>

        <Box sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          justifyContent: 'flex-start',
          minWidth: 0,
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            maxWidth: '100%',
            overflow: 'hidden',
          }}>
          {visibleLinks.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <Button
                key={link.to}
                component={Link}
                to={link.to}
                startIcon={<link.icon />}
                sx={{
                  position: 'relative',
                  color: isActive ? link.color : 'text.secondary',
                  bgcolor: isActive ? link.bg : 'transparent',
                  borderRadius: 1,
                  '&:hover': { bgcolor: link.bg, color: link.color },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 3,
                    height: 2,
                    borderRadius: 1,
                    bgcolor: isActive ? link.color : 'transparent',
                  },
                  fontWeight: isActive ? 800 : 700,
                  fontSize: '0.86rem',
                  px: { md: 1.1, lg: 1.35 },
                  py: 0.75,
                  minHeight: 38,
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': { mr: 0.75 },
                }}
              >
                {link.label}
              </Button>
            );
          })}
          </Box>
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          minWidth: 0,
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            p: 0.5,
            pl: { xs: 0.5, sm: 0.5 },
            pr: 0.5,
            minWidth: 0,
            boxShadow: '0 2px 8px -6px rgba(23,32,31,0.15)',
          }}>
            <Button
              onClick={onAdd}
              startIcon={<Add />}
              variant="contained"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 1,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: 'none',
                },
                fontWeight: 800,
                fontSize: '0.82rem',
                px: { sm: 1.15, lg: 1.4 },
                minHeight: 34,
                whiteSpace: 'nowrap',
                '& .MuiButton-startIcon': { mr: 0.65 },
              }}
            >
              Add quotation
            </Button>

            <Tooltip title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton onClick={toggleTheme} size="small" sx={utilityButtonSx} aria-label="Toggle theme">
                {theme === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, maxWidth: { sm: 100, lg: 160 }, px: 0.5 }} noWrap>
              {userName}
            </Typography>
            <Tooltip title="Sign out">
              <IconButton onClick={signOut} size="small" sx={{ ...utilityButtonSx, '&:hover': { bgcolor: 'background.paper', color: 'error.main' } }} aria-label="Sign out">
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
