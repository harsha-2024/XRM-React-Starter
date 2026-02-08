
import { Paper, Typography } from '@mui/material'
import DataTable, { Column } from '@/components/DataTable'

export type Row = { id: number; name: string, industry: string, owner: string }

const cols: Column<Row>[] = [
  {{ key: 'name', label: 'Name' }}, {{ key: 'industry', label: 'Industry' }}, {{ key: 'owner', label: 'Owner' }}
]

const rows: Row[] = [
  {{ id: 1, name: 'name 1', industry: 'industry 1', owner: 'owner 1' }},
  {{ id: 2, name: 'name 2', industry: 'industry 2', owner: 'owner 2' }}
]

export default function AccountsPage(){
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant='h5'>Accounts</Typography>
      <DataTable columns={{cols}} rows={{rows}} />
    </Paper>
  )
}
