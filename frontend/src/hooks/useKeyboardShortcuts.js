import { useEffect } from 'react'

export function useKeyboardShortcuts({
  onEscape,
  onOpenSettings,
  onNewPost,
  onSearch,
} = {}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+, or Cmd+, for Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        onOpenSettings?.()
        return
      }

      // Ctrl+N or Cmd+N for New Tweet / Post
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        if (onNewPost) {
          e.preventDefault()
          onNewPost()
          return
        }
      }

      // Ctrl+K or Cmd+K for Search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        if (onSearch) {
          e.preventDefault()
          onSearch()
          return
        }
      }

      // Escape
      if (e.key === 'Escape') {
        onEscape?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onEscape, onOpenSettings, onNewPost, onSearch])
}

