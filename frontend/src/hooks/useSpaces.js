import { useState, useEffect, useCallback } from 'react'
import * as spacesApi from '../api/spaces'

export const ALL_SPACES_OPTION = {
  id: 'all',
  name: 'All Spaces',
  description: 'Unified vault across all spaces',
  color: '#a8c7fa',
  icon: 'layers',
}

export function useSpaces() {
  const [spaces, setSpaces] = useState([])
  const [activeSpace, setActiveSpace] = useState(ALL_SPACES_OPTION)
  const [loading, setLoading] = useState(false)

  const selectSpace = useCallback((space) => {
    setActiveSpace(space)
    if (space && space.id && space.id !== 'all') {
      localStorage.setItem('tweetvault_active_space_id', space.id.toString())
    } else {
      localStorage.setItem('tweetvault_active_space_id', 'all')
    }
  }, [])

  const loadSpaces = useCallback(async () => {
    setLoading(true)
    try {
      const data = await spacesApi.getSpaces()
      setSpaces(data || [])
      
      const savedSpaceId = localStorage.getItem('tweetvault_active_space_id')
      if (savedSpaceId === 'all') {
        setActiveSpace(ALL_SPACES_OPTION)
      } else if (savedSpaceId) {
        const found = (data || []).find((s) => s.id.toString() === savedSpaceId.toString())
        setActiveSpace(found || ALL_SPACES_OPTION)
      } else {
        // Default to Actress space if available (has the user's primary archived tweets) or ALL_SPACES_OPTION
        const actress = (data || []).find((s) => s.name.toLowerCase().includes('actress'))
        if (actress) {
          setActiveSpace(actress)
          localStorage.setItem('tweetvault_active_space_id', actress.id.toString())
        } else {
          setActiveSpace(ALL_SPACES_OPTION)
        }
      }
      return data || []
    } catch (err) {
      console.error('Failed to load spaces:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSpaces()
  }, [loadSpaces])

  const createSpace = useCallback(
    async (spaceData) => {
      const created = await spacesApi.createSpace(spaceData)
      await loadSpaces()
      selectSpace(created)
      return created
    },
    [loadSpaces, selectSpace]
  )

  const updateSpace = useCallback(
    async (id, spaceData) => {
      const updated = await spacesApi.updateSpace(id, spaceData)
      await loadSpaces()
      setActiveSpace((prev) => (prev?.id === id ? updated : prev))
      return updated
    },
    [loadSpaces]
  )

  const deleteSpace = useCallback(
    async (spaceToDelete) => {
      if (!spaceToDelete) return
      await spacesApi.deleteSpace(spaceToDelete.id)
      const updated = await loadSpaces()
      if (activeSpace?.id === spaceToDelete.id) {
        selectSpace(ALL_SPACES_OPTION)
      }
      return updated
    },
    [activeSpace, loadSpaces, selectSpace]
  )

  return {
    spaces,
    setSpaces,
    activeSpace,
    setActiveSpace: selectSpace,
    loading,
    loadSpaces,
    createSpace,
    updateSpace,
    deleteSpace,
    ALL_SPACES_OPTION,
  }
}


