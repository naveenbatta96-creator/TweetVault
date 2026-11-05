export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'wails.localhost' || window.location.protocol === 'file:') {
      return 'http://localhost:8085/api'
    }
  }
  return '/api'
}

export const API_BASE = getApiBase()

export async function apiFetch(endpoint, options = {}) {
  const base = getApiBase()
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers = { ...options.headers }
  let body = options.body

  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body
  })

  if (!response.ok) {
    let errorMsg = `API request failed with status ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData && (errorData.error || errorData.message)) {
        errorMsg = errorData.error || errorData.message
      }
    } catch {
      // Not JSON
    }
    throw new Error(errorMsg)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }
  return response
}

