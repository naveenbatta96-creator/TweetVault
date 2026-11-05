import { apiFetch } from './client'

export async function getCollections(spaceId) {
  const query = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : ''
  return await apiFetch(`/collections${query}`)
}

export async function createCollection(collectionData) {
  return await apiFetch('/collections', {
    method: 'POST',
    body: collectionData,
  })
}

export async function updateCollection(id, collectionData) {
  return await apiFetch(`/collections/${id}`, {
    method: 'PUT',
    body: collectionData,
  })
}

export async function deleteCollection(id) {
  return await apiFetch(`/collections/${id}`, {
    method: 'DELETE',
  })
}

