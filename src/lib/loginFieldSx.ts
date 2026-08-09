import type { SxProps, Theme } from '@mui/material/styles';

export const loginFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
    bgcolor: theme => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(23,29,27,0.82)',
    borderRadius: 1.5,
    '& fieldset': {
      borderColor: theme => theme.palette.mode === 'light' ? 'rgba(15,118,110,0.18)' : 'rgba(34,166,154,0.22)',
    },
    '&:hover fieldset': {
      borderColor: 'primary.main',
    },
    '&.Mui-focused fieldset': {
      borderWidth: 1,
      borderColor: 'primary.main',
      boxShadow: theme => theme.palette.mode === 'light'
        ? '0 0 0 3px rgba(15,118,110,0.10)'
        : '0 0 0 3px rgba(34,166,154,0.14)',
    },
  },
  '& input': {
    fontWeight: 650,
    letterSpacing: 0,
    color: theme => theme.palette.mode === 'light' ? 'rgba(0,0,0,0.87)' : 'rgba(255,255,255,0.87)',
  },
  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
    WebkitTextFillColor: 'currentColor',
    caretColor: 'currentColor',
    WebkitBoxShadow: theme => `0 0 0 1000px ${theme.palette.mode === 'light' ? '#ffffff' : '#171d1b'} inset !important`,
    boxShadow: theme => `0 0 0 1000px ${theme.palette.mode === 'light' ? '#ffffff' : '#171d1b'} inset !important`,
    transition: 'background-color 9999s ease-out 0s',
  },
};