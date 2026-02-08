
import api from './api'

export type Invoice = {
  id: number
  number: string
  account: string
  amount: number
  status: 'Draft'|'Sent'|'Paid'|'Overdue'
}

export async function listInvoices(){ const { data } = await api.get<Invoice[]>('/invoices'); return data }
export async function createInvoice(payload: Omit<Invoice,'id'>){ const { data } = await api.post<Invoice>('/invoices', payload); return data }
export async function updateInvoice(id: number, payload: Omit<Invoice,'id'>){ const { data } = await api.put<Invoice>(`/invoices/${id}`, payload); return data }
export async function deleteInvoice(id: number){ await api.delete(`/invoices/${id}`) }
