import { apiFetch } from './client'

export async function getPosts(filters = {}) {
  const { spaceId, folderId, collectionId, type, q, sort } = filters
  const params = new URLSearchParams()

  if (spaceId) params.append('space_id', spaceId)
  if (folderId && folderId !== 'all') params.append('folder_id', folderId)
  if (collectionId && collectionId !== 'all') params.append('collection_id', collectionId)
  if (type && type !== 'all') params.append('type', type)
  if (q && q.trim()) params.append('q', q.trim())
  if (sort) params.append('sort', sort)

  const queryString = params.toString()
  return await apiFetch(`/posts${queryString ? `?${queryString}` : ''}`)
}

export async function getPost(id) {
  return await apiFetch(`/posts/${id}`)
}

export async function createPost(postData) {
  return await apiFetch('/posts', {
    method: 'POST',
    body: postData,
  })
}

export async function updatePost(id, postData) {
  return await apiFetch(`/posts/${id}`, {
    method: 'PUT',
    body: postData,
  })
}

export async function deletePost(id) {
  return await apiFetch(`/posts/${id}`, {
    method: 'DELETE',
  })
}

export async function batchUpdatePosts(ids, updateData) {
  try {
    return await apiFetch('/posts/batch-move', {
      method: 'POST',
      body: {
        ids,
        space_id: updateData.space_id,
        folder_id: updateData.folder_id,
        collection_id: updateData.collection_id,
      },
    })
  } catch {
    return await Promise.all(
      ids.map((id) =>
        apiFetch(`/posts/${id}`, {
          method: 'PUT',
          body: updateData,
        })
      )
    )
  }
}

export async function batchDeletePosts(ids) {
  try {
    return await apiFetch('/posts/batch-delete', {
      method: 'POST',
      body: { ids },
    })
  } catch {
    return await Promise.all(
      ids.map((id) =>
        apiFetch(`/posts/${id}`, {
          method: 'DELETE',
        })
      )
    )
  }
}
