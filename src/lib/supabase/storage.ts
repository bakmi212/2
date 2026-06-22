import { createBrowserClient } from './client'

const BUCKET_NAME = 'product-images'
const DOWNLOADS_BUCKET = 'product-downloads'

export async function uploadProductImage(file: File, productSlug: string): Promise<string | null> {
  const supabase = createBrowserClient()

  const ext = file.name.split('.').pop()?.toLowerCase()
  const fileName = `${productSlug}-${Date.now()}.${ext}`
  const filePath = `products/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

export async function uploadProductDownload(file: File, productSlug: string): Promise<string | null> {
  const supabase = createBrowserClient()

  const ext = file.name.split('.').pop()?.toLowerCase()
  const fileName = `${productSlug}-${Date.now()}.${ext}`
  const filePath = `downloads/${fileName}`

  const { error } = await supabase.storage
    .from(DOWNLOADS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  return filePath
}

export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  const supabase = createBrowserClient()

  const url = new URL(imageUrl)
  const pathParts = url.pathname.split('/')
  const bucketIndex = pathParts.indexOf(BUCKET_NAME)
  if (bucketIndex === -1) return false

  const filePath = pathParts.slice(bucketIndex + 1).join('/')

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    return false
  }

  return true
}

export async function deleteProductDownload(filePath: string): Promise<boolean> {
  const supabase = createBrowserClient()

  const { error } = await supabase.storage
    .from(DOWNLOADS_BUCKET)
    .remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    return false
  }

  return true
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, JPEG, PNG, and WEBP files are allowed.' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB.' }
  }

  return { valid: true }
}

export function validateDownloadFile(file: File): { valid: boolean; error?: string } {
  const allowedExts = ['zip', 'rar', 'pdf', 'apk', 'exe', 'dmg', 'docx', 'pptx', 'xlsx']
  const maxSize = 100 * 1024 * 1024 // 100MB

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !allowedExts.includes(ext)) {
    return { valid: false, error: 'Only ZIP, RAR, PDF, APK, EXE, DMG, DOCX, PPTX, XLSX files are allowed.' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 100MB.' }
  }

  return { valid: true }
}

export function getDownloadUrl(filePath: string): string {
  const supabase = createBrowserClient()
  const { data } = supabase.storage.from(DOWNLOADS_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

// Category image uploads
const CATEGORIES_BUCKET = 'product-images'

export async function uploadCategoryImage(file: File, categorySlug: string): Promise<string | null> {
  const supabase = createBrowserClient()

  const ext = file.name.split('.').pop()?.toLowerCase()
  const fileName = `${categorySlug}-${Date.now()}.${ext}`
  const filePath = `categories/${fileName}`

  const { error } = await supabase.storage
    .from(CATEGORIES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from(CATEGORIES_BUCKET)
    .getPublicUrl(filePath)

  return publicUrl
}

export async function deleteCategoryImage(imageUrl: string): Promise<boolean> {
  const supabase = createBrowserClient()

  const url = new URL(imageUrl)
  const pathParts = url.pathname.split('/')
  const bucketIndex = pathParts.indexOf(CATEGORIES_BUCKET)
  if (bucketIndex === -1) return false

  const filePath = pathParts.slice(bucketIndex + 1).join('/')

  const { error } = await supabase.storage
    .from(CATEGORIES_BUCKET)
    .remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    return false
  }

  return true
}

export async function uploadQrisImage(file: File): Promise<string | null> {
  const supabase = createBrowserClient()
  const ext = file.name.split('.').pop()?.toLowerCase()
  const fileName = `qris-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('qris-images').upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) { console.error('QRIS upload error:', error); return null }
  const { data: { publicUrl } } = supabase.storage.from('qris-images').getPublicUrl(fileName)
  return publicUrl
}

export async function uploadPaymentProof(file: File, orderId: string): Promise<string | null> {
  const supabase = createBrowserClient()
  const ext = file.name.split('.').pop()?.toLowerCase()
  const fileName = `proof-${orderId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('payment-proofs').upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) { console.error('Proof upload error:', error); return null }
  const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)
  return publicUrl
}

export function validateCategoryImage(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  const maxSize = 2 * 1024 * 1024 // 2MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, WEBP, and GIF files are allowed.' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 2MB.' }
  }

  return { valid: true }
}
