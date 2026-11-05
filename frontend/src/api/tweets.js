import { apiFetch } from './client'

export async function fetchTweetByUrl(url) {
  return await apiFetch('/tweets/fetch', {
    method: 'POST',
    body: { url },
  })
}

