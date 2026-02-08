
import api from './api'

export type Lead = {
  id: number
  firstName: string
  lastName: string
  email: string
  status: 'New'|'Qualified'|'Disqualified'
}

export async function listLeads(){ const { data } = await api.get<Lead[]>('/leads'); return data }
export async function createLead(payload: Omit<Lead,'id'>){ const { data } = await api.post<Lead>('/leads', payload); return data }
export async function updateLead(id: number, payload: Omit<Lead,'id'>){ const { data } = await api.put<Lead>(`/leads/${id}`, payload); return data }
export async function deleteLead(id: number){ await api.delete(`/leads/${id}`) }
