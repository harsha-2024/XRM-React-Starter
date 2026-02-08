
import { AppBar, Toolbar, Typography, IconButton, Tooltip, Switch } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export default function NavBar({ mode, setMode }: { mode: 'light'|'dark'; setMode: (m:'light'|'dark')=>void }) {
  const { logout } = useAuth()
  const { t, i18n } = useTranslation()
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>XRM</Typography>
        <Tooltip title={t('toggleTheme')}><Switch checked={mode==='dark'} onChange={()=>setMode(mode==='dark'?'light':'dark')} /></Tooltip>
        <Tooltip title={t('changeLanguage')}>
          <IconButton color="inherit" onClick={()=>i18n.changeLanguage(i18n.language==='en'?'ru':'en')}>🌐</IconButton>
        </Tooltip>
        <Tooltip title={t('logout')}>
          <IconButton color="inherit" onClick={logout}><LogoutIcon /></IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
