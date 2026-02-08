
import { Paper, Typography } from '@mui/material'
export default function SamplePlugin(){
  return (
    <Paper sx={{ p:2, mt:2 }}>
      <Typography variant='h6'>Sample Plugin Component</Typography>
      <Typography variant='body2'>This plugin was loaded dynamically.</Typography>
    </Paper>
  )
}
