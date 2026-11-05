import React, { useState, useCallback } from 'react'
import { Info } from 'lucide-react'

// Layout components
import TopHeader from './components/layout/TopHeader'
import Sidebar from './components/layout/Sidebar'
import BulkActionBar from './components/layout/BulkActionBar'

// View components
import HomeView from './components/views/HomeView'
import SubView from './components/views/SubView'

// Modals
import CreateTweetModal from './components/modals/CreateTweetModal'
import FolderFormModal from './components/modals/FolderFormModal'
import MovePostModal from './components/modals/MovePostModal'
import BulkMoveModal from './components/modals/BulkMoveModal'
import BulkDeleteModal from './components/modals/BulkDeleteModal'
import SettingsModal from './components/SettingsModal'

// Detail Viewers
import StoryDocViewer from './components/StoryDocViewer'
import TweetViewer from './components/TweetViewer'
import ErrorBoundary from './components/ErrorBoundary'

// Custom Hooks & APIs
import {
  useSpaces,
  useFolders,
  usePosts,
  useBulkSelection,
  useKeyboardShortcuts,
} from './hooks'
import { batchUpdatePosts, batchDeletePosts } from './api/posts'
import { fetchTweetByUrl } from './api/tweets'
import { sanitizeM3Color } from './utils/colors'

export { sanitizeM3Color }

export default function App() {
  // Navigation & View layout
  const [layoutMode, setLayoutMode] = useState('list')
  const [folderColumns, setFolderColumns] = useState(() => {
    const saved = localStorage.getItem('tweetvault_folder_columns')
    return saved ? Math.min(8, Math.max(2, Number(saved))) : 4
  })

  // Filters & Search
  const [filterType, setFilterType] = useState('all') // 'all' | 'tweet' | 'story' | 'media' | 'favorite'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Under the hood space provider (defaults to main vault space)
  const { spaces, activeSpace, setActiveSpace, loadSpaces } = useSpaces()

  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useFolders(activeSpace)

  const {
    posts,
    loadPosts,
    createPost,
    updatePost,
    deletePost,
  } = usePosts({
    activeSpace,
    activeFolderId,
    activeCollectionId: 'all',
    filterType,
    searchQuery,
    sortBy,
  })

  const {
    selectedPostIds,
    toggleSelectPost,
    handleSelectAllVisible,
    clearSelection,
  } = useBulkSelection(posts, [activeFolderId, filterType, searchQuery, activeSpace?.id])

  // Modals & Viewers State
  const [showPostModal, setShowPostModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [readingStory, setReadingStory] = useState(null)
  const [viewingTweet, setViewingTweet] = useState(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Move post modal state
  const [movingPost, setMovingPost] = useState(null)
  const [showMovePostModal, setShowMovePostModal] = useState(false)

  // Bulk operation states
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isBulkOperating, setIsBulkOperating] = useState(false)

  // Post form state
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
    read_time: '',
    tags: '',
    folder_id: '',
  })

  // Keyboard Shortcuts (Esc closes modals/deselects, Ctrl+, opens settings, Ctrl+N creates tweet)
  useKeyboardShortcuts({
    onEscape: () => {
      if (showSettingsModal) setShowSettingsModal(false)
      else if (showBulkMoveModal) setShowBulkMoveModal(false)
      else if (showBulkDeleteModal) setShowBulkDeleteModal(false)
      else if (showPostModal) setShowPostModal(false)
      else if (showFolderModal) setShowFolderModal(false)
      else if (editingFolder) setEditingFolder(null)
      else if (showMovePostModal) setShowMovePostModal(false)
      else if (readingStory) setReadingStory(null)
      else if (viewingTweet) setViewingTweet(null)
      else if (selectedPostIds.length > 0) clearSelection()
    },
    onOpenSettings: () => setShowSettingsModal((prev) => !prev),
    onNewPost: () => handleOpenCreatePost(),
    onSearch: () => {
      document.querySelector('.gdrive-search-input')?.focus()
    },
  })

  // Handlers for Posts
  const handleOpenCreatePost = () => {
    setEditingPost(null)
    setPostForm({
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
      read_time: '',
      tags: '',
      folder_id: activeFolderId !== 'all' ? activeFolderId : (folders[0]?.id || ''),
    })
    setShowPostModal(true)
  }

  const handleCreateNewStoryDoc = async () => {
    const chosenFolderId = activeFolderId !== 'all' ? parseInt(activeFolderId) : null
    const targetFolder = folders.find((f) => f.id === chosenFolderId)
    const targetSpaceId =
      targetFolder?.space_id ||
      (activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : (spaces[0]?.id || 7))

    try {
      const created = await createPost({
        space_id: targetSpaceId,
        folder_id: chosenFolderId,
        type: 'story',
        title: 'Untitled Thread',
        content: '<p>Paste your thread tweets or document here...</p>',
        comment: '',
        author_name: 'Thread Author',
        author_handle: '@author',
        author_avatar: '',
        media_url: '',
        original_url: '',
        likes_count: 0,
        retweets_count: 0,
        bookmarks_count: 0,
        read_time: '1 min read',
        tags: ['Thread'],
      })
      await loadPosts()
      setReadingStory(created)
    } catch (err) {
      console.error(err)
      alert('Error creating thread: ' + err.message)
    }
  }

  const handleSavePost = async (e) => {
    if (e) e.preventDefault()
    if (!postForm.content.trim() && !postForm.media_url) return

    let finalContent = postForm.content.trim()
    const hashtagMatches = finalContent.match(/#[a-zA-Z0-9_\p{L}]+/gu) || []
    const extractedTags = Array.from(new Set(hashtagMatches.map((t) => t.replace('#', '').trim()).filter(Boolean)))

    let finalHandle = postForm.author_handle || '@saved'
    let finalOriginalUrl = postForm.original_url || ''
    let finalMediaUrl = postForm.media_url || ''
    let finalAuthorAvatar = postForm.author_avatar || ''
    let finalAuthorName = postForm.author_name || (finalHandle !== '@saved' ? finalHandle.replace('@', '') : 'Author')
    let finalLikes = parseInt(postForm.likes_count) || 0
    let finalRetweets = parseInt(postForm.retweets_count) || 0
    let finalTags = extractedTags

    const urlMatch = finalContent.match(/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/\d+/)
    if (urlMatch) {
      finalHandle = '@' + urlMatch[1]
      finalOriginalUrl = urlMatch[0]

      // Auto-fetch if user pasted a Twitter link directly without clicking the fetch button
      if (!finalMediaUrl) {
        try {
          const fetched = await fetchTweetByUrl(urlMatch[0])
          if (fetched?.success && fetched.tweet) {
            const tw = fetched.tweet
            finalContent = tw.content || finalContent
            finalHandle = tw.author_handle || finalHandle
            finalAuthorName = tw.author_name || finalAuthorName
            finalAuthorAvatar = tw.author_avatar || finalAuthorAvatar
            finalMediaUrl = tw.media_url || ''
            finalLikes = tw.likes_count || finalLikes
            finalRetweets = tw.retweets_count || finalRetweets
            if (tw.tags && tw.tags.length > 0) {
              finalTags = Array.from(new Set([...finalTags, ...tw.tags]))
            }
          }
        } catch (fetchErr) {
          console.warn('Auto-fetch tweet error on save:', fetchErr)
        }
      }
    }

    const chosenFolderId = postForm.folder_id ? parseInt(postForm.folder_id) : (activeFolderId !== 'all' ? parseInt(activeFolderId) : null)
    const targetFolder = folders.find((f) => f.id === chosenFolderId)
    const targetSpaceId =
      targetFolder?.space_id ||
      (activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : (spaces[0]?.id || 7))

    const payload = {
      space_id: targetSpaceId,
      folder_id: chosenFolderId,
      type: 'tweet',
      title: finalContent.length > 60 ? finalContent.slice(0, 60) + '...' : (finalContent || 'Tweet'),
      content: finalContent,
      comment: '',
      author_name: finalAuthorName,
      author_handle: finalHandle,
      author_avatar: finalAuthorAvatar,
      media_url: finalMediaUrl,
      original_url: finalOriginalUrl,
      likes_count: finalLikes,
      retweets_count: finalRetweets,
      bookmarks_count: parseInt(postForm.bookmarks_count) || 0,
      read_time: '',
      tags: finalTags.length > 0 ? finalTags : ['Tweet'],
      is_favorite: editingPost ? Boolean(editingPost.is_favorite) : false,
    }

    try {
      if (editingPost) {
        await updatePost(editingPost.id, payload)
      } else {
        await createPost(payload)
      }
      setShowPostModal(false)
      loadPosts()
      loadFolders()
    } catch (err) {
      console.error(err)
    }
  }

  // Single post move
  const handleOpenMovePost = useCallback((post, e) => {
    if (e) e.stopPropagation()
    setMovingPost(post)
    setShowMovePostModal(true)
  }, [])

  const handleOpenPost = useCallback((post) => {
    if (post?.type === 'story') setReadingStory(post)
    else setViewingTweet(post)
  }, [])

  const handleSaveMovePost = async (updatedPost) => {
    try {
      await updatePost(updatedPost.id, updatedPost)
      setShowMovePostModal(false)
      setMovingPost(null)
      loadPosts()
      loadFolders()
    } catch (err) {
      console.error(err)
      alert('Error moving item: ' + err.message)
    }
  }

  // Bulk Operations
  const handleSaveBulkMove = async ({ targetFolderId, targetSpaceId }) => {
    setIsBulkOperating(true)
    try {
      const targetFolder = folders.find((f) => f.id === parseInt(targetFolderId))
      const spaceToUse =
        targetSpaceId ||
        targetFolder?.space_id ||
        (activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : (spaces[0]?.id || 7))

      await batchUpdatePosts(selectedPostIds, {
        space_id: spaceToUse,
        folder_id: targetFolderId,
        collection_id: null,
      })
      setShowBulkMoveModal(false)
      clearSelection()
      loadPosts()
      loadFolders()
    } catch (err) {
      console.error(err)
      alert('Error during bulk move: ' + err.message)
    } finally {
      setIsBulkOperating(false)
    }
  }

  const handleConfirmBulkDelete = async () => {
    setIsBulkOperating(true)
    try {
      await batchDeletePosts(selectedPostIds)
      setShowBulkDeleteModal(false)
      clearSelection()
      loadPosts()
      loadFolders()
    } catch (err) {
      console.error(err)
      alert('Error during bulk delete: ' + err.message)
    } finally {
      setIsBulkOperating(false)
    }
  }

  const handleFolderColumnsChange = (val) => {
    setFolderColumns(val)
    localStorage.setItem('tweetvault_folder_columns', val)
  }

  const isHomeView = activeFolderId === 'all' && filterType === 'all' && !searchQuery.trim()

  const getActiveViewTitle = () => {
    if (searchQuery.trim()) return `Search: "${searchQuery}"`
    if (activeFolderId !== 'all') {
      const f = folders.find((item) => item.id.toString() === activeFolderId.toString())
      return f ? f.name : 'Folder'
    }
    if (filterType === 'tweet') return 'Tweets'
    if (filterType === 'story') return 'Threads'
    if (filterType === 'media') return 'Media Vault'
    if (filterType === 'favorite') return 'Starred Tweets'
    return 'All Archived Tweets'
  }

  return (
    <div className="gdrive-app">
      {/* Top Bar */}
      <TopHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSettings={() => setShowSettingsModal(true)}
        spaces={spaces}
        activeSpace={activeSpace}
        onSelectSpace={setActiveSpace}
      />

      <div className="gdrive-workspace-body">
        <Sidebar
          posts={posts}
          folders={folders}
          filterType={filterType}
          setFilterType={setFilterType}
          activeFolderId={activeFolderId}
          setActiveFolderId={setActiveFolderId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenNewPost={handleOpenCreatePost}
          onCreateNewStoryDoc={handleCreateNewStoryDoc}
          onOpenFolderModal={() => setShowFolderModal(true)}
          activeSpace={activeSpace}
          spaces={spaces}
          onSelectSpace={setActiveSpace}
        />

        <main className="gdrive-main-canvas">
          <div className="gdrive-canvas-header">
            <div className="gdrive-title-row">
              <h1 className="gdrive-canvas-title">{getActiveViewTitle()}</h1>
              <Info size={18} className="gdrive-info-icon" title="View details" />
            </div>
          </div>

          {isHomeView && folders.length > 0 ? (
            <HomeView
              folders={folders}
              folderColumns={folderColumns}
              onFolderColumnsChange={handleFolderColumnsChange}
              onSelectFolder={(folder) => {
                setActiveFolderId(folder.id.toString())
                setFilterType('all')
              }}
              onEditFolder={(folder, e) => {
                if (e) e.stopPropagation()
                setEditingFolder(folder)
              }}
              onOpenCreateFolder={() => setShowFolderModal(true)}
            />
          ) : (
            <SubView
              posts={posts}
              selectedPostIds={selectedPostIds}
              layoutMode={layoutMode}
              setLayoutMode={setLayoutMode}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filterType={filterType}
              activeViewTitle={getActiveViewTitle()}
              activeSpaceName={activeSpace?.name || 'Main Vault'}
              onBackToHome={() => {
                setActiveFolderId('all')
                setFilterType('all')
                setSearchQuery('')
              }}
              onCreateNewStoryDoc={handleCreateNewStoryDoc}
              onSelectPost={toggleSelectPost}
              onSelectAllVisible={handleSelectAllVisible}
              onOpenPost={handleOpenPost}
              onOpenMovePost={handleOpenMovePost}
            />
          )}
        </main>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedPostIds.length}
        totalCount={posts.length}
        onClearSelection={clearSelection}
        onSelectAllVisible={handleSelectAllVisible}
        onOpenBulkMove={() => setShowBulkMoveModal(true)}
        onOpenBulkDelete={() => setShowBulkDeleteModal(true)}
      />

      {/* Modals */}
      <CreateTweetModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        editingPost={editingPost}
        postForm={postForm}
        setPostForm={setPostForm}
        folders={folders}
        onSavePost={handleSavePost}
      />

      <FolderFormModal
        isOpen={showFolderModal || Boolean(editingFolder)}
        onClose={() => {
          setShowFolderModal(false)
          setEditingFolder(null)
        }}
        editingFolder={editingFolder}
        onSubmit={async (data) => {
          if (editingFolder) {
            await updateFolder(editingFolder.id, data)
            setEditingFolder(null)
            loadPosts()
          } else {
            await createFolder(data)
            setShowFolderModal(false)
          }
        }}
        onDeleteFolder={async (folderId) => {
          if (confirm('Are you sure you want to delete this folder? Tweets will remain in your vault.')) {
            await deleteFolder(folderId)
            setEditingFolder(null)
            loadPosts()
          }
        }}
      />

      <MovePostModal
        isOpen={showMovePostModal}
        onClose={() => {
          setShowMovePostModal(false)
          setMovingPost(null)
        }}
        movingPost={movingPost}
        activeSpace={activeSpace}
        onSaveMove={handleSaveMovePost}
      />

      <BulkMoveModal
        isOpen={showBulkMoveModal}
        onClose={() => setShowBulkMoveModal(false)}
        selectedPostIds={selectedPostIds}
        activeSpace={activeSpace}
        isOperating={isBulkOperating}
        onConfirmBulkMove={handleSaveBulkMove}
      />

      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        selectedCount={selectedPostIds.length}
        isOperating={isBulkOperating}
        onConfirmBulkDelete={handleConfirmBulkDelete}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        spaces={spaces}
        folders={folders}
        collections={[]}
        posts={posts}
        folderColumns={folderColumns}
        onFolderColumnsChange={handleFolderColumnsChange}
        onRefreshData={() => {
          loadPosts()
          loadSpaces()
          loadFolders()
        }}
      />

      {/* Thread Reader */}
      {readingStory && (
        <StoryDocViewer
          story={readingStory}
          onClose={() => setReadingStory(null)}
          onUpdateStory={(updated) => {
            setReadingStory(updated)
            loadPosts()
          }}
        />
      )}

      {/* Tweet Carousel / Minimal Viewer */}
      {viewingTweet && (
        <ErrorBoundary name="TweetViewer" onClose={() => setViewingTweet(null)}>
          <TweetViewer
            tweet={viewingTweet}
            onClose={() => setViewingTweet(null)}
            onUpdateTweet={(updated) => {
              setViewingTweet(updated)
              loadPosts()
            }}
            onDeleteTweet={() => {
              setViewingTweet(null)
              loadPosts()
            }}
            onNavigateToFolder={(folderId) => {
              setViewingTweet(null)
              if (folderId) {
                setActiveFolderId(folderId)
              }
            }}
            folders={folders}
            spaces={spaces}
            activeSpace={activeSpace}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
