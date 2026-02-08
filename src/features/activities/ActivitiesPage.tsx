
import { Paper, Typography } from '@mui/material'
import DataTable, { Column } from '@/components/DataTable'

export type Row = { id: number; subject: string, type: string, dueDate: string }

const cols: Column<Row>[] = [
  {{ key: 'subject', label: 'Subject' }}, {{ key: 'type', label: 'Type' }}, {{ key: 'dueDate', label: 'Duedate' }}
]

const rows: Row[] = [
  {{ id: 1, subject: 'subject 1', type: 'type 1', dueDate: 'dueDate 1' }},
  {{ id: 2, subject: 'subject 2', type: 'type 2', dueDate: 'dueDate 2' }}
]

export default function ActivitiesPage(){
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant='h5'>Activities</Typography>
      <DataTable columns={{cols}} rows={{rows}} />
    </Paper>
  )
}
