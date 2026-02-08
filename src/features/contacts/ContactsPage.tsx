
import { Paper, Typography } from '@mui/material'
import DataTable, { Column } from '@/components/DataTable'

export type Row = { id: number; firstName: string, lastName: string, email: string }

const cols: Column<Row>[] = [
  {{ key: 'firstName', label: 'Firstname' }}, {{ key: 'lastName', label: 'Lastname' }}, {{ key: 'email', label: 'Email' }}
]

const rows: Row[] = [
  {{ id: 1, firstName: 'firstName 1', lastName: 'lastName 1', email: 'email 1' }},
  {{ id: 2, firstName: 'firstName 2', lastName: 'lastName 2', email: 'email 2' }}
]

export default function ContactsPage(){
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant='h5'>Contacts</Typography>
      <DataTable columns={{cols}} rows={{rows}} />
    </Paper>
  )
}
