
import { Grid, Paper, Typography } from '@mui/material'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend)

export default function Dashboard(){
  const data = { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ label:'Revenue', data:[12,19,3,5,2,3], borderColor:'#1976d2' }] }
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant='h4'>Dashboard</Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>Pipeline</Typography>
          <Line data={data} />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>Activities</Typography>
          <Line data={data} />
        </Paper>
      </Grid>
    </Grid>
  )
}
