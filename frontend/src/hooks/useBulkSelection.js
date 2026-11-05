import { useState, useCallback, useEffect } from 'react'

export function useBulkSelection(posts = [], resetDependencies = []) {
  const [selectedPostIds, setSelectedPostIds] = useState([])

  const toggleSelectPost = useCallback((id, e) => {
    if (e) e.stopPropagation()
    setSelectedPostIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const handleSelectAllVisible = useCallback(() => {
    if (selectedPostIds.length === posts.length && posts.length > 0) {
      setSelectedPostIds([])
    } else {
      setSelectedPostIds(posts.map((p) => p.id))
    }
  }, [posts, selectedPostIds.length])

  const clearSelection = useCallback(() => {
    setSelectedPostIds([])
  }, [])

  // Auto-clear selection when dependencies change
  useEffect(() => {
    setSelectedPostIds([])
  }, resetDependencies) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    selectedPostIds,
    setSelectedPostIds,
    toggleSelectPost,
    handleSelectAllVisible,
    clearSelection,
    isAllSelected: posts.length > 0 && selectedPostIds.length === posts.length,
    hasSelection: selectedPostIds.length > 0,
    selectedCount: selectedPostIds.length,
  }
}

