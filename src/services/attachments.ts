
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
  thumbUrl?: string
  thumbStorage?: 'local'|'s3'
  processing?: boolean // UX flag to show 'processing' badge
}

export async function listInvoiceAttachments(invoiceId: number){
  const { data } = await api.get<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments`)
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

export async function getSignedInvoiceAttachmentThumbUrl(invoiceId: number, attId: number){
  const { data } = await api.get(`/invoices/${invoiceId}/attachments/${attId}/thumb-url`)
  return data as { url: string; expiresIn: number }
}

export function downloadInvoiceAttachment(invoiceId: number, attId: number){
  const url = (api.defaults.baseURL || '') + `/invoices/${invoiceId}/attachments/${attId}/download`
  window.location.href = url
}

// Multipart endpoints
export async function s3MultipartInitiate(invoiceId:number, filename:string, contentType:string){
  const { data } = await api.post(`/invoices/${invoiceId}/attachments/multipart/initiate`, { filename, contentType })
  return data as { key:string; uploadId:string }
}
export async function s3MultipartPresignPart(invoiceId:number, key:string, uploadId:string, partNumber:number){
  const { data } = await api.post(`/invoices/${invoiceId}/attachments/multipart/presign-part`, { key, uploadId, partNumber })
  return data as { url:string; headers?: Record<string,string> }
}
export async function s3MultipartComplete(invoiceId:number, key:string, uploadId:string, parts:{ PartNumber:number; ETag:string }[]){
  const { data } = await api.post(`/invoices/${invoiceId}/attachments/multipart/complete`, { key, uploadId, parts })
  return data as { objectUrl:string }
}
