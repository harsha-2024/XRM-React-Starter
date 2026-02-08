
import api from './api'

export type InvoiceAttachment = {
  id: number
  fileName: string
  originalName: string
  size: number
  mimeType: string
  url: string
  uploadedAt: number
}

export async function listInvoiceAttachments(invoiceId: number){
  const { data } = await api.get<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments`)
  return data
}

export async function uploadInvoiceAttachment(invoiceId: number, file: File){
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<InvoiceAttachment>(`/invoices/${invoiceId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

export async function deleteInvoiceAttachment(invoiceId: number, attId: number){
  await api.delete(`/invoices/${invoiceId}/attachments/${attId}`)
}
