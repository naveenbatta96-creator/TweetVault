import { apiFetch } from './client'

export async function getFolders(spaceId) {
  const query = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : ''
  return await apiFetch(`/folders${query}`)
}

export async function createFolder(folderData) {
  return await apiFetch('/folders', {
    method: 'POST',
    body: folderData,
  })
}

export async function updateFolder(id, folderData) {
  return await apiFetch(`/folders/${id}`, {
    method: 'PUT',
    body: folderData,
  })
}

export async function deleteFolder(id) {
  return await apiFetch(`/folders/${id}`, {
    method: 'DELETE',
  })
}

