
import api from './api'

export type InvoiceAttachment = {
  id: number
  fileName: string
  originalName: string
  size: number
  mimeType: string
  url: string
  uploadedAt: number
  storage?: 'local'|'s3'
}

export async function listInvoiceAttachments(invoiceId: number){
  const { data } = await api.get<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments`)
  return data
}

export async function uploadInvoiceAttachment(invoiceId: number, file: File){
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<InvoiceAttachment>(`/invoices/${invoiceId}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data
}

export async function deleteInvoiceAttachment(invoiceId: number, attId: number){
  await api.delete(`/invoices/${invoiceId}/attachments/${attId}`)
}

export async function presignInvoiceAttachment(invoiceId: number, filename: string, contentType: string){
  const { data } = await api.post(`/invoices/${invoiceId}/attachments/presign`, { filename, contentType })
  return data as { uploadUrl:string; objectUrl:string; key:string; headers?: Record<string,string> }
}

export async function recordInvoiceAttachment(invoiceId:number, info: { key:string; objectUrl:string; originalName:string; size:number; mimeType:string }){
  const { data } = await api.post(`/invoices/${invoiceId}/attachments/record`, info)
  return data
}

export async function getSignedInvoiceAttachmentUrl(invoiceId: number, attId: number){
  const { data } = await api.get(`/invoices/${invoiceId}/attachments/${attId}/url`)
  return data as { url: string; expiresIn: number }
}
