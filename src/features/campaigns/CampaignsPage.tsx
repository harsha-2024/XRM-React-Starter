
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Box, Button, Grid, IconButton, MenuItem, Paper, TextField, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { Campaign, listCampaigns, createCampaign, updateCampaign, deleteCampaign } from '@/services/campaigns'

const CampaignSchema = z.object({
  name: z.string().min(1, 'Required'),
  channel: z.enum(['Email','Social','PPC','Events']),
  budget: z.coerce.number().positive('Must be positive')
})

type CampaignForm = z.infer<typeof CampaignSchema>

export default function CampaignsPage(){
  const [rows, setRows] = useState<Campaign[]>([])
  const [editing, setEditing] = useState<Campaign|null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignForm>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: { name:'', channel:'Email', budget: 1000 }
  })

  async function refresh(){ setRows(await listCampaigns()) }
  useEffect(()=>{ refresh() }, [])

  async function onSubmit(data: CampaignForm){
    if(editing){ await updateCampaign(editing.id, data) } else { await createCampaign(data) }
    await refresh(); setEditing(null); reset({ name:'', channel:'Email', budget: 1000 })
  }

  async function onDelete(id: number){ await deleteCampaign(id); await refresh() }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>{editing ? 'Edit Campaign' : 'New Campaign'}</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField fullWidth label='Name' sx={{ mt:2 }} error={!!errors.name} helperText={errors.name?.message} {...register('name')} />
            <TextField select fullWidth label='Channel' sx={{ mt:2 }} error={!!errors.channel} helperText={errors.channel?.message} {...register('channel')}>
              {['Email','Social','PPC','Events'].map(v=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
            <TextField fullWidth type='number' label='Budget' sx={{ mt:2 }} error={!!errors.budget} helperText={errors.budget?.message} {...register('budget')} />
            <Box sx={{ display:'flex', gap:1, mt:2 }}>
              <Button type='submit' variant='contained'>{editing?'Update':'Create'}</Button>
              {editing && <Button onClick={()=>{ setEditing(null); reset({ name:'', channel:'Email', budget: 1000 }) }}>Cancel</Button>}
            </Box>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p:2 }}>
          <Typography variant='h6'>Campaigns</Typography>
          <Box sx={{ overflowX:'auto', mt:2 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:8 }}>Name</th>
                  <th style={{ textAlign:'left', padding:8 }}>Channel</th>
                  <th style={{ textAlign:'left', padding:8 }}>Budget</th>
                  <th style={{ textAlign:'left', padding:8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id}>
                    <td style={{ padding:8 }}>{r.name}</td>
                    <td style={{ padding:8 }}>{r.channel}</td>
                    <td style={{ padding:8 }}>{r.budget}</td>
                    <td style={{ padding:8 }}>
                      <IconButton size='small' onClick={()=>{ setEditing(r); reset({ name:r.name, channel:r.channel, budget:r.budget }) }}><EditIcon fontSize='small' /></IconButton>
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
