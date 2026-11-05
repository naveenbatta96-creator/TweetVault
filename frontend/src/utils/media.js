// Parse media_url array, JSON string, or comma-separated string into string array
export function parseMediaList(mediaUrl) {
  if (!mediaUrl) return []
  if (Array.isArray(mediaUrl)) return mediaUrl.filter(Boolean)
  try {
    const parsed = JSON.parse(mediaUrl)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {}
  if (typeof mediaUrl === 'string') {
    if (mediaUrl.includes(',')) {
      return mediaUrl.split(',').map((s) => s.trim()).filter(Boolean)
    }
    return [mediaUrl.trim()]
  }
  return []
}

// Detect video URL based on extension or MIME type
export function isVideoUrl(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  if (
    lower.endsWith('.gif') ||
    lower.includes('.gif?') ||
    lower.includes('/gif') ||
    lower.startsWith('data:image/gif') ||
    lower.endsWith('.jfif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.avif') ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  ) {
    return false
  }
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.ogv') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.mkv') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.avi') ||
    lower.includes('video') ||
    lower.startsWith('data:video/')
  )
}

// Detect GIF URL based on extension or MIME type
export function isGifUrl(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    lower.endsWith('.gif') ||
    lower.includes('.gif?') ||
    lower.includes('/gif') ||
    lower.startsWith('data:image/gif')
  )
}

// Detect any picture format supported by Twitter/X
export function isImageUrl(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  if (lower.startsWith('data:image/')) return true
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.jfif') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.avif') ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.ico') ||
    lower.endsWith('.tif') ||
    lower.endsWith('.tiff') ||
    lower.includes('format=jpg') ||
    lower.includes('format=jpeg') ||
    lower.includes('format=jfif') ||
    lower.includes('format=png') ||
    lower.includes('format=webp') ||
    lower.includes('format=avif') ||
    lower.includes('format=gif')
  )
}

// Determine best file extension for an image/video URL
export function getMediaExtension(url, fallback = '.jpg') {
  if (!url) return fallback
  const lower = url.toLowerCase()
  if (isGifUrl(url)) return '.gif'
  if (isVideoUrl(url)) return '.mp4'
  if (lower.includes('.jfif') || lower.includes('format=jfif')) return '.jfif'
  if (lower.includes('.webp') || lower.includes('format=webp')) return '.webp'
  if (lower.includes('.avif') || lower.includes('format=avif')) return '.avif'
  if (lower.includes('.png') || lower.includes('format=png')) return '.png'
  if (lower.includes('.heic') || lower.includes('format=heic')) return '.heic'
  if (lower.includes('.heif')) return '.heif'
  if (lower.includes('.svg')) return '.svg'
  if (lower.includes('.bmp')) return '.bmp'
  if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('format=jpg')) return '.jpg'
  return fallback
}

// Get media classification
export function getMediaType(url) {
  if (!url) return 'none'
  if (isGifUrl(url)) return 'gif'
  if (isVideoUrl(url)) return 'video'
  return 'photo'
}

// Get the first media URL from single string, JSON array string, or comma-separated string
export function getPrimaryMediaUrl(url) {
  if (!url) return ''
  if (typeof url === 'string' && url.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(url)
      if (Array.isArray(arr) && arr.length > 0) return arr[0]
    } catch {}
  }
  if (typeof url === 'string' && url.includes(',')) {
    return url.split(',')[0].trim()
  }
  return url
}

// Resolve media URL for local Wails or browser contexts
export function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const clean = url.startsWith('/') ? url : `/${url}`
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'wails.localhost' || window.location.protocol === 'file:') {
      return `http://localhost:8085${clean}`
    }
  }
  return url
}

// Fallback error handler for img and video elements to fetch from localhost:8085
export function handleMediaError(e, fallbackPath) {
  const target = e.currentTarget
  if (!target || target.dataset.fallbackTried) return
  target.dataset.fallbackTried = 'true'
  const path = fallbackPath || target.getAttribute('src') || ''
  if (path && !path.startsWith('http://localhost:8085')) {
    const clean = path.startsWith('/') ? path : `/${path}`
    target.src = `http://localhost:8085${clean}`
  }
}
