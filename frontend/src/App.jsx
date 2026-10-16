import React, { useState, useEffect } from 'react'
import {
  Folder,
  Layers,
  Search,
  Plus,
  X,
  Sparkles,
  BookOpen,
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  LayoutGrid,
  Filter,
  CheckCircle,
  Cpu,
  Eye,
  Image,
  MessageSquare,
  FolderInput,
  ArrowRightLeft
} from 'lucide-react'

import StoryDocEditor from './components/StoryDocEditor'
import StoryDocViewer from './components/StoryDocViewer'
import TweetViewer from './components/TweetViewer'

const COLOR_PRESETS = ['#3b82f6', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#64748b']

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:8085/api' : '/api'

export default function App() {
  // Navigation & Space selection
  const [viewMode, setViewMode] = useState('workspace') // 'spaces' or 'workspace'
  const [spaces, setSpaces] = useState([])
  const [activeSpace, setActiveSpace] = useState(null)

  // Folders & Collections
  const [folders, setFolders] = useState([])
  const [collections, setCollections] = useState([])
  const [activeFolderId, setActiveFolderId] = useState('all')
  const [activeCollectionId, setActiveCollectionId] = useState('all')

  // Editing / Renaming / Moving Folders & Collections
  const [editingFolder, setEditingFolder] = useState(null)
  const [showEditFolderModal, setShowEditFolderModal] = useState(false)
  const [editFolderName, setEditFolderName] = useState('')
  const [editFolderColor, setEditFolderColor] = useState('#3b82f6')
  const [editFolderSpaceId, setEditFolderSpaceId] = useState('')

  const [editingCollection, setEditingCollection] = useState(null)
  const [showEditCollectionModal, setShowEditCollectionModal] = useState(false)
  const [editCollectionName, setEditCollectionName] = useState('')
  const [editCollectionColor, setEditCollectionColor] = useState('#ec4899')
  const [editCollectionSpaceId, setEditCollectionSpaceId] = useState('')

  // Moving Posts between folders/collections/spaces
  const [movingPost, setMovingPost] = useState(null)
  const [showMovePostModal, setShowMovePostModal] = useState(false)
  const [movePostTargetSpaceId, setMovePostTargetSpaceId] = useState('')
  const [movePostTargetFolderId, setMovePostTargetFolderId] = useState('')
  const [movePostTargetCollectionId, setMovePostTargetCollectionId] = useState('')
  const [moveAvailableFolders, setMoveAvailableFolders] = useState([])
  const [moveAvailableCollections, setMoveAvailableCollections] = useState([])

  // Posts & Filtering
  const [posts, setPosts] = useState([])
  const [filterType, setFilterType] = useState('all') // 'all' | 'tweet' | 'story'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [loading, setLoading] = useState(false)

  // FAB Speed Dial state (Mock Image 2 & 3)
  const [isFabOpen, setIsFabOpen] = useState(false)

  // Modals
  const [showPostModal, setShowPostModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [readingStory, setReadingStory] = useState(null)
  const [viewingTweet, setViewingTweet] = useState(null)
  const [showSpaceModal, setShowSpaceModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showImageField, setShowImageField] = useState(false)

  // Form states
  const [postForm, setPostForm] = useState({
    type: 'tweet',
    title: '',
    content: '',
    comment: '',
    author_name: '',
    author_handle: '',
    author_avatar: '',
    media_url: '',
    original_url: '',
    likes_count: 0,
    retweets_count: 0,
    bookmarks_count: 0,
    read_time: '3 min read',
    tags: '',
    folder_id: '',
    collection_id: '',
  })


  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceDesc, setNewSpaceDesc] = useState('')
  const [newSpaceColor, setNewSpaceColor] = useState('#3b82f6')
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionColor, setNewCollectionColor] = useState('#ec4899')

  // Fetch initial spaces
  const loadSpaces = async () => {
    try {
      const res = await fetch(`${API_BASE}/spaces`)
      if (!res.ok) throw new Error('Failed to load spaces')
      const data = await res.json()
      setSpaces(data)
      if (data.length > 0 && !activeSpace) {
        setActiveSpace(data[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadSpaces()
  }, [])

  // Load Folders & Collections when activeSpace changes
  useEffect(() => {
    if (!activeSpace) return
    const loadSubItems = async () => {
      try {
        const [fRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/folders?space_id=${activeSpace.id}`),
          fetch(`${API_BASE}/collections?space_id=${activeSpace.id}`)
        ])
        const fData = await fRes.json()
        const cData = await cRes.json()
        setFolders(fData)
        setCollections(cData)
        setActiveFolderId('all')
        setActiveCollectionId('all')
      } catch (err) {
        console.error(err)
      }
    }
    loadSubItems()
  }, [activeSpace])

  // Load Posts whenever space, folder, collection, type, search, sort changes
  const loadPosts = async () => {
    if (!activeSpace) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('space_id', activeSpace.id)
      if (activeFolderId && activeFolderId !== 'all') {
        params.append('folder_id', activeFolderId)
      }
      if (activeCollectionId && activeCollectionId !== 'all') {
        params.append('collection_id', activeCollectionId)
      }
      if (filterType !== 'all') {
        params.append('type', filterType)
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim())
      }
      params.append('sort', sortBy)

      const res = await fetch(`${API_BASE}/posts?${params.toString()}`)
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPosts()
    }, 150)
    return () => clearTimeout(timer)
  }, [activeSpace, activeFolderId, activeCollectionId, filterType, searchQuery, sortBy])

  // Open Create Modal
  const handleOpenCreatePost = (defaultType = 'tweet') => {
    setEditingPost(null)
    setShowImageField(false)
    setPostForm({
      type: defaultType,
      title: '',
      content: '',
      comment: '',
      author_name: defaultType === 'tweet' ? 'Saved Creator' : 'Sarah Chen',
      author_handle: defaultType === 'tweet' ? '@saved_user' : '@schen_essays',
      author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      media_url: '',
      original_url: '',
      likes_count: Math.floor(Math.random() * 250) + 20,
      retweets_count: Math.floor(Math.random() * 50) + 5,
      bookmarks_count: Math.floor(Math.random() * 80) + 10,
      read_time: defaultType === 'story' ? '4 min read' : '',
      tags: defaultType === 'tweet' ? 'Tweet' : 'Essay',
      folder_id: activeFolderId !== 'all' ? activeFolderId : (folders[0]?.id || ''),
      collection_id: activeCollectionId !== 'all' ? activeCollectionId : '',
    })
    setIsFabOpen(false)
    setShowPostModal(true)
  }

  // Open Edit Modal
  const handleOpenEditPost = (post) => {
    setEditingPost(post)
    setShowImageField(Boolean(post.media_url))
    setPostForm({
      type: post.type,
      title: post.title || '',
      content: post.content || '',
      comment: post.comment || '',
      author_name: post.author_name || '',
      author_handle: post.author_handle || '',
      author_avatar: post.author_avatar || '',
      media_url: post.media_url || '',
      original_url: post.original_url || '',
      likes_count: post.likes_count || 0,
      retweets_count: post.retweets_count || 0,
      bookmarks_count: post.bookmarks_count || 0,
      read_time: post.read_time || '',
      tags: (post.tags || []).join(', '),
      folder_id: post.folder_id || '',
      collection_id: post.collection_id || '',
    })
    setShowPostModal(true)
  }

  // Submit Post (Create or Update)
  const handleSavePost = async (e) => {
    e.preventDefault()
    if (!postForm.content.trim()) return

    const tagsArray = postForm.tags
      ? postForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    // Auto-detect author handle or source link if user pasted an X/Twitter URL
    let finalContent = postForm.content.trim()
    let finalHandle = postForm.author_handle || '@saved_user'
    let finalOriginalUrl = postForm.original_url

    const urlMatch = finalContent.match(/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/\d+/)
    if (urlMatch) {
      finalHandle = '@' + urlMatch[1]
      finalOriginalUrl = urlMatch[0]
    }

    const payload = {
      space_id: activeSpace.id,
      folder_id: postForm.folder_id ? parseInt(postForm.folder_id) : null,
      collection_id: postForm.collection_id ? parseInt(postForm.collection_id) : null,
      type: postForm.type,
      title: postForm.title,
      content: finalContent,
      comment: postForm.comment || '',
      author_name: postForm.author_name || (finalHandle !== '@saved_user' ? finalHandle.replace('@', '') : 'Saved Creator'),
      author_handle: finalHandle,
      author_avatar: postForm.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      media_url: postForm.media_url,
      original_url: finalOriginalUrl,
      likes_count: parseInt(postForm.likes_count) || 0,
      retweets_count: parseInt(postForm.retweets_count) || 0,
      bookmarks_count: parseInt(postForm.bookmarks_count) || 0,
      read_time: postForm.read_time,
      tags: tagsArray,
      is_favorite: false,
    }

    try {
      if (editingPost) {
        await fetch(`${API_BASE}/posts/${editingPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`${API_BASE}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowPostModal(false)
      loadPosts()
      loadSpaces()
    } catch (err) {
      console.error(err)
    }
  }


  // Delete Post
  const handleDeletePost = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await fetch(`${API_BASE}/posts/${id}`, { method: 'DELETE' })
      loadPosts()
      loadSpaces()
    } catch (err) {
      console.error(err)
    }
  }

  // Toggle favorite / like
  const handleLikePost = async (post, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    const newLikes = (post.likes_count || 0) + 1
    try {
      await fetch(`${API_BASE}/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...post,
          likes_count: newLikes,
        }),
      })
      setViewingTweet((prev) =>
        prev && prev.id === post.id ? { ...prev, likes_count: newLikes } : prev
      )
      loadPosts()
    } catch (err) {
      console.error(err)
    }
  }

  // Create Space
  const handleCreateSpace = async (e) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return
    try {
      const res = await fetch(`${API_BASE}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSpaceName,
          description: newSpaceDesc,
          color: newSpaceColor,
          icon: 'sparkles',
        }),
      })
      const created = await res.json()
      setNewSpaceName('')
      setNewSpaceDesc('')
      setShowSpaceModal(false)
      await loadSpaces()
      setActiveSpace(created)
      setViewMode('workspace')
    } catch (err) {
      console.error(err)
    }
  }

  // Create Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim() || !activeSpace) return
    try {
      await fetch(`${API_BASE}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: activeSpace.id,
          name: newFolderName,
          color: newFolderColor,
        }),
      })
      setNewFolderName('')
      setShowFolderModal(false)
      // refresh folders
      const fRes = await fetch(`${API_BASE}/folders?space_id=${activeSpace.id}`)
      setFolders(await fRes.json())
    } catch (err) {
      console.error(err)
    }
  }

  // Create Collection
  const handleCreateCollection = async (e) => {
    e.preventDefault()
    if (!newCollectionName.trim() || !activeSpace) return
    try {
      await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: activeSpace.id,
          name: newCollectionName,
          color: newCollectionColor,
        }),
      })
      setNewCollectionName('')
      setShowCollectionModal(false)
      // refresh collections
      const cRes = await fetch(`${API_BASE}/collections?space_id=${activeSpace.id}`)
      setCollections(await cRes.json())
    } catch (err) {
      console.error(err)
    }
  }

  // Edit / Rename / Move Folder
  const handleOpenEditFolder = (folder, e) => {
    if (e) e.stopPropagation()
    setEditingFolder(folder)
    setEditFolderName(folder.name)
    setEditFolderColor(folder.color || '#3b82f6')
    setEditFolderSpaceId(folder.space_id || activeSpace?.id || '')
    setShowEditFolderModal(true)
  }

  const handleSaveEditFolder = async (e) => {
    e.preventDefault()
    if (!editingFolder || !editFolderName.trim()) return
    try {
      const targetSpaceId = parseInt(editFolderSpaceId) || activeSpace.id
      const res = await fetch(`${API_BASE}/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFolderName.trim(),
          color: editFolderColor,
          space_id: targetSpaceId,
        }),
      })
      if (!res.ok) throw new Error('Failed to update folder')
      setShowEditFolderModal(false)

      if (targetSpaceId !== activeSpace.id) {
        if (activeFolderId === editingFolder.id) {
          setActiveFolderId('all')
        }
      }

      const fRes = await fetch(`${API_BASE}/folders?space_id=${activeSpace.id}`)
      setFolders(await fRes.json())
      loadPosts()
      loadSpaces()
    } catch (err) {
      console.error(err)
      alert('Error updating folder: ' + err.message)
    }
  }

  const handleDeleteFolder = async (folderId, e) => {
    if (e) e.stopPropagation()
    if (!confirm('Are you sure you want to delete this folder? Posts in this folder will remain in the space.')) return
    try {
      const res = await fetch(`${API_BASE}/folders/${folderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete folder')
      if (activeFolderId === folderId) {
        setActiveFolderId('all')
      }
      const fRes = await fetch(`${API_BASE}/folders?space_id=${activeSpace.id}`)
      setFolders(await fRes.json())
      loadPosts()
      loadSpaces()
    } catch (err) {
      console.error(err)
    }
  }

  // Edit / Rename / Move Collection
  const handleOpenEditCollection = (col, e) => {
    if (e) e.stopPropagation()
    setEditingCollection(col)
    setEditCollectionName(col.name)
    setEditCollectionColor(col.color || '#ec4899')
    setEditCollectionSpaceId(col.space_id || activeSpace?.id || '')
    setShowEditCollectionModal(true)
  }

  const handleSaveEditCollection = async (e) => {
    e.preventDefault()
    if (!editingCollection || !editCollectionName.trim()) return
    try {
      const targetSpaceId = parseInt(editCollectionSpaceId) || activeSpace.id
      const res = await fetch(`${API_BASE}/collections/${editingCollection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCollectionName.trim(),
          color: editCollectionColor,
          space_id: targetSpaceId,
        }),
      })
      if (!res.ok) throw new Error('Failed to update collection')
      setShowEditCollectionModal(false)

      if (targetSpaceId !== activeSpace.id) {
        if (activeCollectionId === editingCollection.id) {
          setActiveCollectionId('all')
        }
      }

      const cRes = await fetch(`${API_BASE}/collections?space_id=${activeSpace.id}`)
      setCollections(await cRes.json())
      loadPosts()
      loadSpaces()
    } catch (err) {
      console.error(err)
      alert('Error updating collection: ' + err.message)
    }
  }

  const handleDeleteCollection = async (colId, e) => {
    if (e) e.stopPropagation()
    if (!confirm('Are you sure you want to delete this collection?')) return
    try {
      const res = await fetch(`${API_BASE}/collections/${colId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete collection')
      if (activeCollectionId === colId) {
        setActiveCollectionId('all')
      }
      const cRes = await fetch(`${API_BASE}/collections?space_id=${activeSpace.id}`)
      setCollections(await cRes.json())
      loadPosts()
      loadSpaces()
    } catch (err) {
      console.error(err)
    }
  }

  // Move Post (Tweet / Story)
  const handleOpenMovePost = async (post, e) => {
    if (e) e.stopPropagation()
    setMovingPost(post)
    const targetSpace = post.space_id || activeSpace?.id
    setMovePostTargetSpaceId(targetSpace)
    setMovePostTargetFolderId(post.folder_id ? post.folder_id.toString() : '')
    setMovePostTargetCollectionId(post.collection_id ? post.collection_id.toString() : '')

    try {
      const [fRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/folders?space_id=${targetSpace}`),
        fetch(`${API_BASE}/collections?space_id=${targetSpace}`)
      ])
      setMoveAvailableFolders(await fRes.json())
      setMoveAvailableCollections(await cRes.json())
    } catch (err) {
      console.error(err)
    }
    setShowMovePostModal(true)
  }

  const handleMoveSpaceChange = async (newSpaceId) => {
    setMovePostTargetSpaceId(newSpaceId)
    setMovePostTargetFolderId('')
    setMovePostTargetCollectionId('')
    try {
      const [fRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/folders?space_id=${newSpaceId}`),
        fetch(`${API_BASE}/collections?space_id=${newSpaceId}`)
      ])
      setMoveAvailableFolders(await fRes.json())
      setMoveAvailableCollections(await cRes.json())
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveMovePost = async (e) => {
    e.preventDefault()
    if (!movingPost) return
    try {
      const updatedPost = {
        ...movingPost,
        space_id: parseInt(movePostTargetSpaceId) || activeSpace.id,
        folder_id: movePostTargetFolderId ? parseInt(movePostTargetFolderId) : null,
        collection_id: movePostTargetCollectionId ? parseInt(movePostTargetCollectionId) : null,
      }
      const res = await fetch(`${API_BASE}/posts/${movingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      })
      if (!res.ok) throw new Error('Failed to move item')
      setShowMovePostModal(false)
      loadPosts()
      loadSpaces()
      const fRes = await fetch(`${API_BASE}/folders?space_id=${activeSpace.id}`)
      setFolders(await fRes.json())
      const cRes = await fetch(`${API_BASE}/collections?space_id=${activeSpace.id}`)
      setCollections(await cRes.json())
    } catch (err) {
      console.error(err)
      alert('Error moving item: ' + err.message)
    }
  }

  // Get active folder/collection name for header
  const getActiveViewTitle = () => {
    if (activeFolderId !== 'all') {
      const f = folders.find((item) => item.id.toString() === activeFolderId.toString())
      return f ? f.name : 'Folder'
    }
    if (activeCollectionId !== 'all') {
      const c = collections.find((item) => item.id.toString() === activeCollectionId.toString())
      return c ? c.name : 'Collection'
    }
    return activeSpace?.name || 'All Posts'
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="brand-badge" onClick={() => setViewMode('spaces')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-icon">
            <Sparkles size={16} />
          </div>
          <span>TweetVault</span>
        </div>

        <div className="nav-actions">
          <button
            className={`btn-spaces-toggle ${viewMode === 'spaces' ? 'active' : ''}`}
            onClick={() => setViewMode('spaces')}
            title="Overview of all spaces (as depicted in design mock)"
          >
            <LayoutGrid size={16} />
            <span>Spaces Overview</span>
          </button>

          {activeSpace && viewMode === 'spaces' && (
            <button
              className="btn-spaces-toggle"
              onClick={() => setViewMode('workspace')}
            >
              <span>Return to {activeSpace.name.split('-')[0]}</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ====================================================
          VIEW 1: SPACES OVERVIEW (Matches Wireframe Image 1)
          Three circular nodes: space 1, space 2, space 3
          ==================================================== */}
      {viewMode === 'spaces' ? (
        <main className="spaces-overview-screen">
          <div className="spaces-canvas-frame">
            <div className="spaces-overview-header">
              <h1 className="spaces-overview-title">Select a Space to Enter</h1>
              <p className="spaces-overview-subtitle">
                Organize your tweets, threads, essays, and stories into isolated creative spaces.
              </p>
            </div>

            {/* Circular Space Bubbles matching Image 1: space 1, space 2, space 3 */}
            <div className="spaces-circles-row">
              {spaces.map((s, idx) => {
                const isActive = activeSpace?.id === s.id
                return (
                  <div
                    key={s.id}
                    className="space-circle-card"
                    onClick={() => {
                      setActiveSpace(s)
                      setViewMode('workspace')
                    }}
                  >
                    <div className={`space-circle-bubble ${isActive ? 'active-bubble' : ''}`}>
                      <div className="space-bubble-icon">
                        {idx === 0 ? <Cpu size={36} color="#38bdf8" /> : idx === 1 ? <BookOpen size={36} color="#c084fc" /> : <Palette size={36} color="#f472b6" />}
                      </div>
                      <div className="space-bubble-badge">
                        {s.posts_count || 0} items
                      </div>
                    </div>
                    <div className="space-circle-label">
                      {s.name.split('-')[0].trim().toLowerCase()}
                    </div>
                    <div className="space-circle-desc">
                      {s.description || s.name}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="spaces-overview-actions">
              <button
                className="btn-primary"
                onClick={() => setShowSpaceModal(true)}
              >
                <Plus size={18} />
                <span>Create New Space</span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* ====================================================
           VIEW 2: WORKSPACE VIEW (Matches Wireframe Images 2 & 3)
           Sidebar with space name, folders, collections
           Main view with folder name, pill search, tiles grid, and FAB
           ==================================================== */
        <div className="workspace-layout">
          {/* Left Sidebar */}
          <aside className="sidebar">
            {/* Space Header Badge (Circle + Space Name as in Image 2) */}
            <div
              className="space-header-pill"
              onClick={() => setViewMode('spaces')}
              title="Click to switch space"
            >
              <div className="space-avatar-circle">
                <Sparkles size={18} />
              </div>
              <div className="space-title-text">
                {activeSpace?.name || 'space name'}
              </div>
            </div>

            {/* Folders Section */}
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span>folders</span>
                <button
                  className="sidebar-add-btn"
                  onClick={() => setShowFolderModal(true)}
                  title="Add new folder"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="sidebar-item-list">
                <button
                  className={`sidebar-nav-btn ${activeFolderId === 'all' && activeCollectionId === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFolderId('all')
                    setActiveCollectionId('all')
                  }}
                >
                  <LayoutGrid size={16} />
                  <span>All Items</span>
                  <span className="sidebar-nav-count">{posts.length}</span>
                </button>

                {folders.map((f) => (
                  <div key={f.id} className="sidebar-item-row">
                    <button
                      className={`sidebar-nav-btn ${activeFolderId === f.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveFolderId(f.id)
                        setActiveCollectionId('all')
                      }}
                      title={f.name}
                    >
                      <Folder size={16} color={f.color || '#38bdf8'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <span className="sidebar-nav-count">{f.posts_count || 0}</span>
                    </button>
                    <div className="sidebar-item-actions">
                      <button
                        className="sidebar-action-btn"
                        onClick={(e) => handleOpenEditFolder(f, e)}
                        title="Rename or move folder"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        className="sidebar-action-btn danger"
                        onClick={(e) => handleDeleteFolder(f.id, e)}
                        title="Delete folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collections Section */}
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span>collections</span>
                <button
                  className="sidebar-add-btn"
                  onClick={() => setShowCollectionModal(true)}
                  title="Add new collection"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="sidebar-item-list">
                {collections.map((c) => (
                  <div key={c.id} className="sidebar-item-row">
                    <button
                      className={`sidebar-nav-btn ${activeCollectionId === c.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveCollectionId(c.id)
                        setActiveFolderId('all')
                      }}
                      title={c.name}
                    >
                      <Layers size={16} color={c.color || '#ec4899'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </span>
                      <span className="sidebar-nav-count">{c.posts_count || 0}</span>
                    </button>
                    <div className="sidebar-item-actions">
                      <button
                        className="sidebar-action-btn"
                        onClick={(e) => handleOpenEditCollection(c, e)}
                        title="Rename or move collection"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        className="sidebar-action-btn danger"
                        onClick={(e) => handleDeleteCollection(c.id, e)}
                        title="Delete collection"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="main-content">
            {/* Top Bar with folder name + pill search bar (Matches Wireframe 2) */}
            <div className="content-top-bar">
              <div className="folder-title-heading">
                <span>{getActiveViewTitle()}</span>
                {activeFolderId !== 'all' && (
                  <>
                    <span className="folder-badge-type">Folder</span>
                    {(() => {
                      const curFolder = folders.find((f) => f.id.toString() === activeFolderId.toString())
                      if (!curFolder) return null
                      return (
                        <button
                          className="btn-rename-header"
                          onClick={() => handleOpenEditFolder(curFolder)}
                          title="Rename or move this folder"
                        >
                          <Edit3 size={13} />
                          <span>Rename / Move</span>
                        </button>
                      )
                    })()}
                  </>
                )}
                {activeCollectionId !== 'all' && (
                  <>
                    <span className="folder-badge-type" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6' }}>Collection</span>
                    {(() => {
                      const curCol = collections.find((c) => c.id.toString() === activeCollectionId.toString())
                      if (!curCol) return null
                      return (
                        <button
                          className="btn-rename-header"
                          onClick={() => handleOpenEditCollection(curCol)}
                          title="Rename or move this collection"
                        >
                          <Edit3 size={13} />
                          <span>Rename / Move</span>
                        </button>
                      )
                    })()}
                  </>
                )}
              </div>

              {/* Centered Pill Search Bar */}
              <div className="search-pill-wrapper">
                <Search className="search-icon-left" size={18} />
                <input
                  type="text"
                  className="search-pill-input"
                  placeholder="Search tweets, stories, authors, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="filter-toolbar">
              <div className="filter-chips">
                <button
                  className={`chip-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  <LayoutGrid size={14} />
                  <span>All ({posts.length})</span>
                </button>
                <button
                  className={`chip-btn chip-tweet ${filterType === 'tweet' ? 'active' : ''}`}
                  onClick={() => setFilterType('tweet')}
                >
                  <MessageCircle size={14} />
                  <span>Tweets</span>
                </button>
                <button
                  className={`chip-btn chip-story ${filterType === 'story' ? 'active' : ''}`}
                  onClick={() => setFilterType('story')}
                >
                  <BookOpen size={14} />
                  <span>Stories</span>
                </button>
              </div>

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Sort: Newest</option>
                <option value="likes">Sort: Most Liked</option>
                <option value="oldest">Sort: Oldest</option>
              </select>
            </div>

            {/* Grid of Tiles (Wireframe 2 & 3: tiles is posts or the stores parts) */}
            <div className="tiles-grid">
              {posts.map((post) => {
                const isStory = post.type === 'story'
                return (
                  <article
                    key={post.id}
                    className="tile-card"
                    onClick={() => (isStory ? setReadingStory(post) : setViewingTweet(post))}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      {/* Author Header */}
                      <div className="tile-card-header">
                        <div className="tile-author-meta">
                          <img
                            src={post.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                            alt={post.author_name}
                            className="tile-avatar"
                          />
                          <div className="tile-author-info">
                            <span className="tile-author-name">
                              {post.author_name}
                              {post.type === 'tweet' && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </span>
                            <span className="tile-author-handle">{post.author_handle}</span>
                          </div>
                        </div>

                        <span className={`tile-type-badge ${isStory ? 'story' : 'tweet'}`}>
                          {isStory ? <BookOpen size={11} /> : <MessageCircle size={11} />}
                          {isStory ? 'Story' : 'Tweet'}
                        </span>
                      </div>

                      {/* Story Headline (if Story) */}
                      {isStory && post.title && (
                        <h2 className="tile-story-title">{post.title}</h2>
                      )}

                      {/* Media image preview */}
                      {post.media_url && (
                        <img
                          src={post.media_url}
                          alt="Post media preview"
                          className="tile-media-thumb"
                          loading="lazy"
                        />
                      )}

                      {/* Content snippet */}
                      <p className="tile-body-text">
                        {post.type === 'story' && /<[a-z][\s\S]*>/i.test(post.content)
                          ? post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 180) + (post.content.length > 180 ? '...' : '')
                          : post.content}
                      </p>

                      {/* User's Note / Comment */}
                      {post.comment && (
                        <div className="tile-user-note">
                          <div className="note-header">
                            <MessageSquare size={12} />
                            <span>My Note</span>
                          </div>
                          <p className="note-body">{post.comment}</p>
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (

                        <div className="tile-tags">
                          {post.tags.map((tag, i) => (
                            <span key={i} className="tile-tag-pill">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer with stats and actions */}
                    <div className="tile-footer">
                      <div className="tile-metrics">
                        <span
                          className="metric-item"
                          onClick={(e) => handleLikePost(post, e)}
                          title="Like"
                          style={{ cursor: 'pointer' }}
                        >
                          <Heart size={14} color="#f43f5e" fill={post.likes_count > 0 ? '#f43f5e' : 'none'} />
                          {post.likes_count}
                        </span>

                        {post.type === 'tweet' && (
                          <span className="metric-item" title="Retweets">
                            <Repeat2 size={14} color="#10b981" />
                            {post.retweets_count}
                          </span>
                        )}

                        {post.read_time && (
                          <span className="metric-item" style={{ color: '#f472b6' }}>
                            <BookOpen size={13} />
                            {post.read_time}
                          </span>
                        )}
                      </div>

                      <div className="tile-card-actions">
                        <button
                          className="action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isStory) {
                              setReadingStory(post)
                            } else {
                              setViewingTweet(post)
                            }
                          }}
                          title={isStory ? 'Read document story' : 'View tweet'}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          className="action-icon-btn"
                          onClick={(e) => handleOpenMovePost(post, e)}
                          title="Move to another folder or space"
                        >
                          <FolderInput size={15} />
                        </button>

                        <button
                          className="action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditPost(post)
                          }}
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          className="action-icon-btn danger"
                          onClick={(e) => handleDeletePost(post.id, e)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}

              {posts.length === 0 && !loading && (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <h3 className="empty-state-title">No posts in this view yet</h3>
                  <p className="empty-state-subtitle">
                    Save your favorite tweets or write new stories by clicking the (+) button below.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => handleOpenCreatePost('tweet')}
                  >
                    <Plus size={16} />
                    <span>Create Your First Post</span>
                  </button>
                </div>
              )}
            </div>
          </main>

          {/* ====================================================
              FLOATING ACTION BUTTON (FAB) & SPEED DIAL
              (Exact match of Wireframe Image 2 & 3:
               Clicking (+) opens popover menu with "create", "update", "....."
               and morphs into (X))
              ==================================================== */}
          <div className="fab-container">
            {/* Speed Dial Menu (Image 3 popover) */}
            {isFabOpen && (
              <div className="fab-speed-dial">
                <button
                  className="dial-menu-item"
                  onClick={() => handleOpenCreatePost('tweet')}
                >
                  <span className="dial-icon">
                    <MessageCircle size={15} />
                  </span>
                  <span>create tweet</span>
                </button>

                <button
                  className="dial-menu-item"
                  onClick={() => handleOpenCreatePost('story')}
                >
                  <span className="dial-icon" style={{ background: 'rgba(236,72,153,0.2)', color: '#f472b6' }}>
                    <BookOpen size={15} />
                  </span>
                  <span>create story</span>
                </button>

                <button
                  className="dial-menu-item"
                  onClick={() => {
                    setIsFabOpen(false)
                    setShowFolderModal(true)
                  }}
                >
                  <span className="dial-icon" style={{ background: 'rgba(6,182,212,0.2)', color: '#22d3ee' }}>
                    <Folder size={15} />
                  </span>
                  <span>new folder</span>
                </button>

                <button
                  className="dial-menu-item"
                  onClick={() => {
                    setIsFabOpen(false)
                    setShowCollectionModal(true)
                  }}
                >
                  <span className="dial-icon" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                    <Layers size={15} />
                  </span>
                  <span>new collection</span>
                </button>

                <button
                  className="dial-menu-item"
                  onClick={() => {
                    setIsFabOpen(false)
                    setViewMode('spaces')
                  }}
                >
                  <span className="dial-icon" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                    <LayoutGrid size={15} />
                  </span>
                  <span>switch space</span>
                </button>
              </div>
            )}

            {/* The (+) / (X) FAB Button */}
            <button
              className={`fab-button ${isFabOpen ? 'active' : ''}`}
              onClick={() => setIsFabOpen(!isFabOpen)}
              title={isFabOpen ? 'Close Menu' : 'Add Item / Actions'}
            >
              {isFabOpen ? <X size={26} /> : <Plus size={28} />}
            </button>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: CREATE / EDIT POST (Tweet or Story)
          ==================================================== */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: postForm.type === 'story' ? '880px' : '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPost ? 'Edit Post' : 'Save New Item to Vault'}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowPostModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePost}>
              <div className="modal-body">
                {/* Type Selector (Tweet vs Story) */}
                <div className="type-toggle-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${postForm.type === 'tweet' ? 'active' : ''}`}
                    onClick={() => setPostForm({ ...postForm, type: 'tweet' })}
                  >
                    <MessageCircle size={16} />
                    <span>Tweet / Post</span>
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${postForm.type === 'story' ? 'active' : ''}`}
                    onClick={() => setPostForm({ ...postForm, type: 'story' })}
                  >
                    <BookOpen size={16} />
                    <span>Story / Essay</span>
                  </button>
                </div>

                {postForm.type === 'tweet' ? (
                  /* SIMPLIFIED TWEET POPUP */
                  <>
                    {/* Tweet text / link */}
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tweet Content or Link</span>
                        <span style={{ textTransform: 'none', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          Paste tweet text or X / Twitter link
                        </span>
                      </label>
                      <textarea
                        className="form-textarea"
                        placeholder="Paste tweet text or X/Twitter URL here...
e.g. 'PostgreSQL 18 concurrency improvements are game-changing!' or https://x.com/username/status/..."
                        rows={4}
                        value={postForm.content}
                        onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>

                    {/* Personal Comment / Notes */}
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={13} />
                        <span>My Note / Comment</span>
                      </label>
                      <textarea
                        className="form-textarea comment-input"
                        placeholder="Add your thoughts, key takeaway, or note on this tweet..."
                        rows={3}
                        value={postForm.comment}
                        onChange={(e) => setPostForm({ ...postForm, comment: e.target.value })}
                      />
                    </div>

                    {/* Optional Image */}
                    <div className="form-group">
                      <button
                        type="button"
                        className="btn-toggle-optional"
                        onClick={() => setShowImageField(!showImageField)}
                      >
                        <Image size={14} />
                        <span>{showImageField ? 'Hide Image Field' : '+ Add Image URL (if used)'}</span>
                      </button>

                      {showImageField && (
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://... image link (optional)"
                          value={postForm.media_url}
                          onChange={(e) => setPostForm({ ...postForm, media_url: e.target.value })}
                          style={{ marginTop: '8px' }}
                        />
                      )}
                      {showImageField && postForm.media_url && (
                        <img src={postForm.media_url} alt="Preview" className="mini-media-preview" />
                      )}
                    </div>

                    {/* Simple Folder selector */}
                    <div className="form-group">
                      <label className="form-label">Save in Folder</label>
                      <select
                        className="form-select"
                        value={postForm.folder_id}
                        onChange={(e) => setPostForm({ ...postForm, folder_id: e.target.value })}
                      >
                        <option value="">No Folder (Root Space)</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  /* STORY CREATION FORM */
                  <>
                    <div className="form-group">
                      <label className="form-label">Story Headline</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Architectural Patterns for Resilient Backends"
                        value={postForm.title}
                        onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Story Document (Rich Lexical Docx Editor)</span>
                        <span style={{ fontSize: '0.78rem', color: '#f472b6', textTransform: 'none' }}>
                          Rich formatting: Headings, Quotes, Lists, Code, Styles & .doc export
                        </span>
                      </label>
                      <StoryDocEditor
                        initialContent={postForm.content}
                        storyTitle={postForm.title}
                        onChange={({ html, plainText, readTime }) => {
                          setPostForm((prev) => ({
                            ...prev,
                            content: html || plainText,
                            read_time: readTime || prev.read_time,
                          }))
                        }}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Author Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Author name"
                          value={postForm.author_name}
                          onChange={(e) => setPostForm({ ...postForm, author_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Author Handle</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="@handle"
                          value={postForm.author_handle}
                          onChange={(e) => setPostForm({ ...postForm, author_handle: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Cover Image URL (Optional)</label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://..."
                          value={postForm.media_url}
                          onChange={(e) => setPostForm({ ...postForm, media_url: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Read Time</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 5 min read"
                          value={postForm.read_time}
                          onChange={(e) => setPostForm({ ...postForm, read_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Assign to Folder</label>
                        <select
                          className="form-select"
                          value={postForm.folder_id}
                          onChange={(e) => setPostForm({ ...postForm, folder_id: e.target.value })}
                        >
                          <option value="">No Folder (Root Space)</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              📁 {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tags (comma separated)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Design, Tech, Essay"
                          value={postForm.tags}
                          onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>


              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPostModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingPost ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: DOCX STORY VIEWER (Clean Document View)
          ==================================================== */}
      {readingStory && (
        <StoryDocViewer
          story={readingStory}
          onClose={() => setReadingStory(null)}
        />
      )}

      {/* ====================================================
          MODAL: TWEET VIEWER (Authentic Twitter Design)
          ==================================================== */}
      {viewingTweet && (
        <TweetViewer
          tweet={viewingTweet}
          onClose={() => setViewingTweet(null)}
          onLike={handleLikePost}
        />
      )}

      {/* ====================================================
          MODAL: CREATE SPACE
          ==================================================== */}
      {showSpaceModal && (
        <div className="modal-overlay" onClick={() => setShowSpaceModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Space</h3>
              <button className="modal-close-btn" onClick={() => setShowSpaceModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSpace}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Space Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Space 4 - Product & Startup"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Short description of this workspace"
                    value={newSpaceDesc}
                    onChange={(e) => setNewSpaceDesc(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Theme Color</label>
                  <input
                    type="color"
                    className="form-input"
                    style={{ height: '44px', cursor: 'pointer' }}
                    value={newSpaceColor}
                    onChange={(e) => setNewSpaceColor(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSpaceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: CREATE FOLDER
          ==================================================== */}
      {showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Folder in {activeSpace?.name}</h3>
              <button className="modal-close-btn" onClick={() => setShowFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Folder Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Startup Ideas, LLM Prompts, Bookmarks"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <div className="color-presets-row">
                    {COLOR_PRESETS.map((color) => (
                      <div
                        key={color}
                        className={`color-preset-dot ${newFolderColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setNewFolderColor(color)}
                        title={color}
                      />
                    ))}
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(e) => setNewFolderColor(e.target.value)}
                      style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFolderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: CREATE COLLECTION
          ==================================================== */}
      {showCollectionModal && (
        <div className="modal-overlay" onClick={() => setShowCollectionModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Collection in {activeSpace?.name}</h3>
              <button className="modal-close-btn" onClick={() => setShowCollectionModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCollection}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Collection Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Best of 2026, Deep Reading List"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <div className="color-presets-row">
                    {COLOR_PRESETS.map((color) => (
                      <div
                        key={color}
                        className={`color-preset-dot ${newCollectionColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setNewCollectionColor(color)}
                        title={color}
                      />
                    ))}
                    <input
                      type="color"
                      value={newCollectionColor}
                      onChange={(e) => setNewCollectionColor(e.target.value)}
                      style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCollectionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: EDIT / RENAME / MOVE FOLDER
          ==================================================== */}
      {showEditFolderModal && editingFolder && (
        <div className="modal-overlay" onClick={() => setShowEditFolderModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={20} color={editFolderColor} />
                <h3 className="modal-title">Edit & Move Folder</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Folder Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Move to Space</label>
                  <select
                    className="form-input"
                    value={editFolderSpaceId}
                    onChange={(e) => setEditFolderSpaceId(e.target.value)}
                  >
                    {spaces.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.id === activeSpace?.id ? '(Current Space)' : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Moving this folder will also move all {editingFolder.posts_count || 0} saved posts inside it to the selected space.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <div className="color-presets-row">
                    {COLOR_PRESETS.map((color) => (
                      <div
                        key={color}
                        className={`color-preset-dot ${editFolderColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setEditFolderColor(color)}
                        title={color}
                      />
                    ))}
                    <input
                      type="color"
                      value={editFolderColor}
                      onChange={(e) => setEditFolderColor(e.target.value)}
                      style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="sidebar-action-btn danger"
                  style={{ width: 'auto', padding: '8px 14px', borderRadius: '8px', gap: '6px', fontSize: '0.82rem' }}
                  onClick={() => {
                    setShowEditFolderModal(false)
                    handleDeleteFolder(editingFolder.id)
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Folder</span>
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowEditFolderModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: EDIT / RENAME / MOVE COLLECTION
          ==================================================== */}
      {showEditCollectionModal && editingCollection && (
        <div className="modal-overlay" onClick={() => setShowEditCollectionModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color={editCollectionColor} />
                <h3 className="modal-title">Edit & Move Collection</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditCollectionModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditCollection}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Collection Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCollectionName}
                    onChange={(e) => setEditCollectionName(e.target.value)}
                    placeholder="Enter collection name..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Move to Space</label>
                  <select
                    className="form-input"
                    value={editCollectionSpaceId}
                    onChange={(e) => setEditCollectionSpaceId(e.target.value)}
                  >
                    {spaces.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.id === activeSpace?.id ? '(Current Space)' : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Moving this collection will also move all {editingCollection.posts_count || 0} saved posts inside it.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <div className="color-presets-row">
                    {COLOR_PRESETS.map((color) => (
                      <div
                        key={color}
                        className={`color-preset-dot ${editCollectionColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setEditCollectionColor(color)}
                        title={color}
                      />
                    ))}
                    <input
                      type="color"
                      value={editCollectionColor}
                      onChange={(e) => setEditCollectionColor(e.target.value)}
                      style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="sidebar-action-btn danger"
                  style={{ width: 'auto', padding: '8px 14px', borderRadius: '8px', gap: '6px', fontSize: '0.82rem' }}
                  onClick={() => {
                    setShowEditCollectionModal(false)
                    handleDeleteCollection(editingCollection.id)
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Collection</span>
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowEditCollectionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: MOVE ITEM / POST
          ==================================================== */}
      {showMovePostModal && movingPost && (
        <div className="modal-overlay" onClick={() => setShowMovePostModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderInput size={20} color="#38bdf8" />
                <h3 className="modal-title">Move Item to Folder or Space</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowMovePostModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveMovePost}>
              <div className="modal-body">
                <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Selected Item:</div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {movingPost.title || movingPost.content.substring(0, 80)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    By {movingPost.author_name} ({movingPost.author_handle})
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Space</label>
                  <select
                    className="form-input"
                    value={movePostTargetSpaceId}
                    onChange={(e) => handleMoveSpaceChange(e.target.value)}
                  >
                    {spaces.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Folder</label>
                  <select
                    className="form-input"
                    value={movePostTargetFolderId}
                    onChange={(e) => setMovePostTargetFolderId(e.target.value)}
                  >
                    <option value="">(No Folder - In Root Space)</option>
                    {moveAvailableFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Collection</label>
                  <select
                    className="form-input"
                    value={movePostTargetCollectionId}
                    onChange={(e) => setMovePostTargetCollectionId(e.target.value)}
                  >
                    <option value="">(No Collection)</option>
                    {moveAvailableCollections.map((c) => (
                      <option key={c.id} value={c.id}>
                        🗂️ {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowMovePostModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Move Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
