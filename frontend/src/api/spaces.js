import { apiFetch } from './client'

export async function getSpaces() {
  return await apiFetch('/spaces')
}

export async function createSpace(spaceData) {
  return await apiFetch('/spaces', {
    method: 'POST',
    body: spaceData,
  })
}

export async function updateSpace(id, spaceData) {
  return await apiFetch(`/spaces/${id}`, {
    method: 'PUT',
    body: spaceData,
  })
}

export async function deleteSpace(id) {
  return await apiFetch(`/spaces/${id}`, {
    method: 'DELETE',
  })
}

