import { useState, useEffect, useCallback } from 'react'
import * as postsApi from '../api/posts'

export function usePosts({
  activeSpace,
  activeFolderId = 'all',
  activeCollectionId = 'all',
  filterType = 'all',
  searchQuery = '',
  sortBy = 'newest',
}) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const backendType =
        filterType === 'tweet' || filterType === 'story' ? filterType : 'all'

      const spaceParam =
        activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : undefined

      let data = await postsApi.getPosts({
        spaceId: spaceParam,
        folderId: activeFolderId,
        collectionId: activeCollectionId,
        type: backendType,
        q: searchQuery,
        sort: sortBy,
      })

      if (filterType === 'media') {
        data = (data || []).filter((p) => Boolean(p.media_url))
      } else if (filterType === 'favorite') {
        data = (data || []).filter((p) => Boolean(p.is_favorite))
      }

      setPosts(data || [])
      return data || []
    } catch (err) {
      console.error('Failed to load posts:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [
    activeSpace?.id,
    activeFolderId,
    activeCollectionId,
    filterType,
    searchQuery,
    sortBy,
  ])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPosts()
    }, 150)
    return () => clearTimeout(timer)
  }, [loadPosts])

  const createPost = useCallback(
    async (postData) => {
      const created = await postsApi.createPost(postData)
      await loadPosts()
      return created
    },
    [loadPosts]
  )

  const updatePost = useCallback(
    async (id, postData) => {
      const updated = await postsApi.updatePost(id, postData)
      await loadPosts()
      return updated
    },
    [loadPosts]
  )

  const deletePost = useCallback(
    async (id) => {
      await postsApi.deletePost(id)
      await loadPosts()
    },
    [loadPosts]
  )

  const likePost = useCallback(
    async (post) => {
      const newLikes = (post.likes_count || 0) + 1
      const updated = await postsApi.updatePost(post.id, {
        ...post,
        likes_count: newLikes,
      })
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes_count: newLikes } : p))
      )
      return updated
    },
    []
  )

  return {
    posts,
    setPosts,
    loading,
    loadPosts,
    createPost,
    updatePost,
    deletePost,
    likePost,
  }
}
