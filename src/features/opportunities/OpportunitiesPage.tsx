
import { Paper, Typography } from '@mui/material'
import DataTable, { Column } from '@/components/DataTable'

export type Row = { id: number; name: string, stage: string, amount: string }

const cols: Column<Row>[] = [
  {{ key: 'name', label: 'Name' }}, {{ key: 'stage', label: 'Stage' }}, {{ key: 'amount', label: 'Amount' }}
]

const rows: Row[] = [
  {{ id: 1, name: 'name 1', stage: 'stage 1', amount: 'amount 1' }},
  {{ id: 2, name: 'name 2', stage: 'stage 2', amount: 'amount 2' }}
]

export default function OpportunitiesPage(){
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant='h5'>Opportunities</Typography>
      <DataTable columns={{cols}} rows={{rows}} />
    </Paper>
  )
}
