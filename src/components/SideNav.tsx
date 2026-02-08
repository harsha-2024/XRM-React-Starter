
import { Drawer, List, ListItemButton, ListItemText } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/cases', label: 'Cases' },
  { to: '/activities', label: 'Activities' },
  { to: '/leads', label: 'Leads' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

export default function SideNav() {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' } }}>
      <List>
        {links.map(l => (
          <ListItemButton key={l.to} selected={loc.pathname===l.to} onClick={()=>nav(l.to)}>
            <ListItemText primary={l.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  )
}
