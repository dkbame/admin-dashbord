import { supabase } from './supabase'

export async function uploadImage(
  file: File,
  type: 'icons' | 'screenshots',
  appId: string
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    // Store in app-assets bucket, in the correct folder
    const fileName = `${type}/${appId}/${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('app-assets')
      .upload(fileName, file)

    if (error) {
      throw error
    }

    const { data: publicUrl } = supabase.storage
      .from('app-assets')
      .getPublicUrl(fileName)

    return publicUrl.publicUrl
  } catch (error) {
    console.error(`Error uploading ${type}:`, error)
    return null
  }
}

export async function uploadMultipleImages(
  files: File[],
  type: 'icons' | 'screenshots',
  appId: string
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, type, appId))
  const results = await Promise.all(uploadPromises)
  return results.filter((url): url is string => url !== null)
} 