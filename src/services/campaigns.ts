
import api from './api'

export type Campaign = {
  id: number
  name: string
  channel: 'Email'|'Social'|'PPC'|'Events'
  budget: number
}

export async function listCampaigns(){ const { data } = await api.get<Campaign[]>('/campaigns'); return data }
export async function createCampaign(payload: Omit<Campaign,'id'>){ const { data } = await api.post<Campaign>('/campaigns', payload); return data }
export async function updateCampaign(id: number, payload: Omit<Campaign,'id'>){ const { data } = await api.put<Campaign>(`/campaigns/${id}`, payload); return data }
export async function deleteCampaign(id: number){ await api.delete(`/campaigns/${id}`) }
