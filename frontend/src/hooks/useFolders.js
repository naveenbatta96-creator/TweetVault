import { useState, useEffect, useCallback } from 'react'
import * as foldersApi from '../api/folders'

export function useFolders(activeSpace) {
  const [folders, setFolders] = useState([])
  const [activeFolderId, setActiveFolderId] = useState('all')
  const [loading, setLoading] = useState(false)

  const loadFolders = useCallback(async () => {
    setLoading(true)
    try {
      const spaceParam =
        activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : undefined
      const data = await foldersApi.getFolders(spaceParam)
      setFolders(data || [])
      return data || []
    } catch (err) {
      console.error('Failed to load folders:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [activeSpace?.id])

  useEffect(() => {
    loadFolders()
    setActiveFolderId('all')
  }, [loadFolders])

  const createFolder = useCallback(
    async (folderData) => {
      const spaceIdToUse =
        folderData.space_id ||
        (activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : 7)
      const created = await foldersApi.createFolder({
        space_id: spaceIdToUse,
        ...folderData,
      })
      await loadFolders()
      return created
    },
    [activeSpace?.id, loadFolders]
  )

  const updateFolder = useCallback(
    async (id, folderData) => {
      const updated = await foldersApi.updateFolder(id, folderData)
      await loadFolders()
      return updated
    },
    [loadFolders]
  )

  const deleteFolder = useCallback(
    async (folderId) => {
      await foldersApi.deleteFolder(folderId)
      if (activeFolderId === folderId) {
        setActiveFolderId('all')
      }
      return await loadFolders()
    },
    [activeFolderId, loadFolders]
  )

  return {
    folders,
    setFolders,
    activeFolderId,
    setActiveFolderId,
    loading,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  }
}

