
import { Paper, Typography } from '@mui/material'
import DataTable, { Column } from '@/components/DataTable'

export type Row = { id: number; title: string, status: string, priority: string }

const cols: Column<Row>[] = [
  {{ key: 'title', label: 'Title' }}, {{ key: 'status', label: 'Status' }}, {{ key: 'priority', label: 'Priority' }}
]

const rows: Row[] = [
  {{ id: 1, title: 'title 1', status: 'status 1', priority: 'priority 1' }},
  {{ id: 2, title: 'title 2', status: 'status 2', priority: 'priority 2' }}
]

export default function CasesPage(){
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant='h5'>Cases</Typography>
      <DataTable columns={{cols}} rows={{rows}} />
    </Paper>
  )
}
