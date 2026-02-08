
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Box, Button, Grid, IconButton, MenuItem, Paper, TextField, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { Lead, listLeads, createLead, updateLead, deleteLead } from '@/services/leads'

const LeadSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  status: z.enum(['New','Qualified','Disqualified'])
})

type LeadForm = z.infer<typeof LeadSchema>

export default function LeadsPage(){
  const [rows, setRows] = useState<Lead[]>([])
  const [editing, setEditing] = useState<Lead|null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadForm>({
    resolver: zodResolver(LeadSchema),
    defaultValues: { firstName:'', lastName:'', email:'', status:'New' }
  })

  async function refresh(){ setRows(await listLeads()) }
  useEffect(()=>{ refresh() }, [])

  async function onSubmit(data: LeadForm){
    if(editing){ await updateLead(editing.id, data) } else { await createLead(data) }
    await refresh(); setEditing(null); reset({ firstName:'', lastName:'', email:'', status:'New' })
  }

  async function onDelete(id: number){ await deleteLead(id); await refresh() }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>{editing ? 'Edit Lead' : 'New Lead'}</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField fullWidth label='First name' sx={{ mt:2 }} error={!!errors.firstName} helperText={errors.firstName?.message} {...register('firstName')} />
            <TextField fullWidth label='Last name' sx={{ mt:2 }} error={!!errors.lastName} helperText={errors.lastName?.message} {...register('lastName')} />
            <TextField fullWidth label='Email' sx={{ mt:2 }} error={!!errors.email} helperText={errors.email?.message} {...register('email')} />
            <TextField select fullWidth label='Status' sx={{ mt:2 }} error={!!errors.status} helperText={errors.status?.message} {...register('status')}>
              {['New','Qualified','Disqualified'].map(v=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
            <Box sx={{ display:'flex', gap:1, mt:2 }}>
              <Button type='submit' variant='contained'>{editing?'Update':'Create'}</Button>
              {editing && <Button onClick={()=>{ setEditing(null); reset({ firstName:'', lastName:'', email:'', status:'New' }) }}>Cancel</Button>}
            </Box>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>Leads</Typography>
          <Box sx={{ overflowX:'auto', mt:2 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:8 }}>First</th>
                  <th style={{ textAlign:'left', padding:8 }}>Last</th>
                  <th style={{ textAlign:'left', padding:8 }}>Email</th>
                  <th style={{ textAlign:'left', padding:8 }}>Status</th>
                  <th style={{ textAlign:'left', padding:8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id}>
                    <td style={{ padding:8 }}>{r.firstName}</td>
                    <td style={{ padding:8 }}>{r.lastName}</td>
                    <td style={{ padding:8 }}>{r.email}</td>
                    <td style={{ padding:8 }}>{r.status}</td>
                    <td style={{ padding:8 }}>
                      <IconButton size='small' onClick={()=>{ setEditing(r); reset({ firstName:r.firstName, lastName:r.lastName, email:r.email, status:r.status }) }}><EditIcon fontSize='small' /></IconButton>
                      <IconButton size='small' color='error' onClick={()=>onDelete(r.id)}><DeleteIcon fontSize='small' /></IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
}
