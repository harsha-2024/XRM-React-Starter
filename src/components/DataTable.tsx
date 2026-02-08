
import { Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'

export type Column<T> = { key: keyof T; label: string }
export default function DataTable<T extends { id: string|number }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <Table size="small" aria-label="data table">
      <TableHead>
        <TableRow>
          {columns.map(c => <TableCell key={String(c.key)}>{c.label}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(r => (
          <TableRow key={String(r.id)}>
            {columns.map(c => <TableCell key={String(c.key)}>{String(r[c.key])}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
