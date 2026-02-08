
import { FormControlLabel, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
export default function Settings({ setMode }: { setMode: (m:'light'|'dark')=>void }){
  const { i18n, t } = useTranslation()
  return (
    <div>
      <Typography variant='h5'>{t('settings')}</Typography>
      <FormControlLabel control={<Switch onChange={(e)=>setMode(e.target.checked?'dark':'light')} />} label={t('theme')} />
      <FormControlLabel control={<Switch onChange={()=>i18n.changeLanguage(i18n.language==='en'?'ru':'en')} />} label={t('language')} />
    </div>
  )
}
