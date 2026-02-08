
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Box, Button, Grid, IconButton, MenuItem, Paper, TextField, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import InvoiceAttachmentsDialog from '@/components/InvoiceAttachmentsDialog'
import DeleteIcon from '@mui/icons-material/Delete'
import { Invoice, listInvoices, createInvoice, updateInvoice, deleteInvoice } from '@/services/invoices'

const InvoiceSchema = z.object({
  number: z.string().min(1, 'Required'),
  account: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be positive'),
  status: z.enum(['Draft','Sent','Paid','Overdue'])
})

type InvoiceForm = z.infer<typeof InvoiceSchema>

export default function InvoicesPage(){
  const [rows, setRows] = useState<Invoice[]>([])
  const [editing, setEditing] = useState<Invoice|null>(null)
  const [attOpen, setAttOpen] = useState(false)
  const [attInvoiceId, setAttInvoiceId] = useState<number|null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InvoiceForm>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: { number:'', account:'', amount: 0, status:'Draft' }
  })

  async function refresh(){ setRows(await listInvoices()) }
  useEffect(()=>{ refresh() }, [])

  async function onSubmit(data: InvoiceForm){
    if(editing){ await updateInvoice(editing.id, data) } else { await createInvoice(data) }
    await refresh(); setEditing(null); reset({ number:'', account:'', amount:0, status:'Draft' })
  }

  async function onDelete(id: number){ await deleteInvoice(id); await refresh() }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>{editing ? 'Edit Invoice' : 'New Invoice'}</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField fullWidth label='Number' sx={{ mt:2 }} error={!!errors.number} helperText={errors.number?.message} {...register('number')} />
            <TextField fullWidth label='Account' sx={{ mt:2 }} error={!!errors.account} helperText={errors.account?.message} {...register('account')} />
            <TextField fullWidth type='number' label='Amount' sx={{ mt:2 }} error={!!errors.amount} helperText={errors.amount?.message} {...register('amount')} />
            <TextField select fullWidth label='Status' sx={{ mt:2 }} error={!!errors.status} helperText={errors.status?.message} {...register('status')}>
              {['Draft','Sent','Paid','Overdue'].map(v=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
            <Box sx={{ display:'flex', gap:1, mt:2 }}>
              <Button type='submit' variant='contained'>{editing?'Update':'Create'}</Button>
              {editing && <Button onClick={()=>{ setEditing(null); reset({ number:'', account:'', amount:0, status:'Draft' }) }}>Cancel</Button>}
            </Box>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>Invoices</Typography>
          <Box sx={{ overflowX:'auto', mt:2 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:8 }}>Number</th>
                  <th style={{ textAlign:'left', padding:8 }}>Account</th>
                  <th style={{ textAlign:'left', padding:8 }}>Amount</th>
                  <th style={{ textAlign:'left', padding:8 }}>Status</th>
                  <th style={{ textAlign:'left', padding:8 }}>Attachments</th>
                  <th style={{ textAlign:'left', padding:8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id}>
                    <td style={{ padding:8 }}>{r.number}</td>
                    <td style={{ padding:8 }}>{r.account}</td>
                    <td style={{ padding:8 }}>{r.amount}</td>
                    <td style={{ padding:8 }}>{r.status}</td>
                    <td style={{ padding:8 }}><IconButton size='small' onClick={()=>{ setAttInvoiceId(r.id); setAttOpen(true) }}><AttachFileIcon fontSize='small' /></IconButton></td>
                    <td style={{ padding:8 }}>
                      <IconButton size='small' onClick={()=>{ setEditing(r); reset({ number:r.number, account:r.account, amount:r.amount, status:r.status }) }}><EditIcon fontSize='small' /></IconButton>
                      <IconButton size='small' color='error' onClick={()=>onDelete(r.id)}><DeleteIcon fontSize='small' /></IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      </Grid>
      <InvoiceAttachmentsDialog open={attOpen} onClose={()=>setAttOpen(false)} invoiceId={attInvoiceId||0} />
    </Grid>
  )
}
