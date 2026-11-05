import { apiFetch, getApiBase } from './client'

export async function uploadMedia(fileOrFormData) {
  if (fileOrFormData instanceof File || fileOrFormData instanceof Blob) {
    // Read file as Data URL (base64) to ensure byte-perfect upload across Wails WebView2
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(fileOrFormData)
      })

      return await apiFetch('/media/upload', {
        method: 'POST',
        body: {
          data: base64,
          file_name: fileOrFormData.name || 'upload.png',
        },
      })
    } catch (e) {
      console.warn('Base64 upload error, falling back to FormData:', e)
      const formData = new FormData()
      formData.append('file', fileOrFormData)
      return await apiFetch('/media/upload', {
        method: 'POST',
        body: formData,
      })
    }
  }

  if (typeof fileOrFormData === 'string') {
    return await apiFetch('/media/upload', {
      method: 'POST',
      body: {
        data: fileOrFormData,
      },
    })
  }

  return await apiFetch('/media/upload', {
    method: 'POST',
    body: fileOrFormData,
  })
}

export async function downloadMedia(url) {
  return await apiFetch('/media/download', {
    method: 'POST',
    body: { url },
  })
}

export function getMediaServeUrl(relativePath) {
  if (!relativePath) return ''
  if (relativePath.startsWith('http') || relativePath.startsWith('data:')) {
    return relativePath
  }
  const base = getApiBase()
  return `${base}/media/serve?path=${encodeURIComponent(relativePath)}`
}

