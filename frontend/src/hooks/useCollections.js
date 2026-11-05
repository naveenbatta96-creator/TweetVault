import { useState, useEffect, useCallback } from 'react'
import * as collectionsApi from '../api/collections'

export function useCollections(activeSpace) {
  const [collections, setCollections] = useState([])
  const [activeCollectionId, setActiveCollectionId] = useState('all')
  const [loading, setLoading] = useState(false)

  const loadCollections = useCallback(async () => {
    if (!activeSpace?.id) {
      setCollections([])
      return []
    }
    setLoading(true)
    try {
      const data = await collectionsApi.getCollections(activeSpace.id)
      setCollections(data || [])
      return data || []
    } catch (err) {
      console.error('Failed to load collections:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [activeSpace?.id])

  useEffect(() => {
    loadCollections()
    setActiveCollectionId('all')
  }, [loadCollections])

  const createCollection = useCallback(
    async (collectionData) => {
      if (!activeSpace?.id) return
      const created = await collectionsApi.createCollection({
        space_id: activeSpace.id,
        ...collectionData,
      })
      await loadCollections()
      return created
    },
    [activeSpace?.id, loadCollections]
  )

  const updateCollection = useCallback(
    async (id, collectionData) => {
      const updated = await collectionsApi.updateCollection(id, collectionData)
      await loadCollections()
      return updated
    },
    [loadCollections]
  )

  const deleteCollection = useCallback(
    async (collectionId) => {
      await collectionsApi.deleteCollection(collectionId)
      if (activeCollectionId === collectionId) {
        setActiveCollectionId('all')
      }
      return await loadCollections()
    },
    [activeCollectionId, loadCollections]
  )

  return {
    collections,
    setCollections,
    activeCollectionId,
    setActiveCollectionId,
    loading,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  }
}

