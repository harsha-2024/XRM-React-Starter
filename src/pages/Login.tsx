
import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Login(){
  const { login } = useAuth()
  const nav = useNavigate()
  const { t } = useTranslation()
  return (
    <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh' }}>
      <Paper sx={{ p:3, width:360 }}>
        <Typography variant='h6'>{t('login')}</Typography>
        <TextField fullWidth label={t('username')} sx={{ mt:2 }} defaultValue='admin' />
        <TextField fullWidth label={t('password')} type='password' sx={{ mt:2 }} defaultValue='admin' />
        <Button variant='contained' sx={{ mt:2 }} onClick={()=>{ login('admin','admin'); nav('/') }}>{t('signIn')}</Button>
      </Paper>
    </Box>
  )
}
