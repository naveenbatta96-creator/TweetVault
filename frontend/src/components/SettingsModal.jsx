import React, { useState, useEffect } from 'react'
import {
  X,
  Settings,
  HardDrive,
  FileText,
  Sliders,
  Keyboard,
  Info,
  Check,
  Download,
  Upload,
  Database,
  Folder,
  FolderOpen,
  MessageSquare,
  BookOpen,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit3
} from 'lucide-react'
import { migrateLocalSocialArchive } from '../api/migrate'
import { createSpace } from '../api/spaces'
import { createFolder } from '../api/folders'
import { createCollection } from '../api/collections'
import { createPost } from '../api/posts'
import {
  getVaultInfo,
  flushVault,
  openVaultFolder,
  exportVaultFolder,
  selectFolderDialog,
  importVaultFolder
} from '../api/backup'

export default function SettingsModal({
  isOpen,
  onClose,
  spaces = [],
  folders = [],
  collections = [],
  posts = [],
  folderColumns = 4,
  onFolderColumnsChange,
  onDeleteSpace,
  onEditSpace,
  onRefreshData
}) {
  if (!isOpen) return null

  const [activeTab, setActiveTab] = useState('general')
  const [columns, setColumns] = useState(folderColumns)
  const [userName, setUserName] = useState(() => localStorage.getItem('tweetvault_user_name') || 'Naveen')
  const [defaultView, setDefaultView] = useState(() => localStorage.getItem('tweetvault_default_view') || 'workspace')
  const [autoDownloadMedia, setAutoDownloadMedia] = useState(() => localStorage.getItem('tweetvault_auto_download_media') !== 'false')
  const [hideBrokenImages, setHideBrokenImages] = useState(() => localStorage.getItem('tweetvault_hide_broken_images') !== 'false')
  const [autoSaveSpeed, setAutoSaveSpeed] = useState(() => localStorage.getItem('tweetvault_autosave_speed') || '600')
  const [defaultDocExport, setDefaultDocExport] = useState(() => localStorage.getItem('tweetvault_doc_export_format') || 'doc')
  const [isExporting, setIsExporting] = useState(false)
  const [lsaPath, setLsaPath] = useState('C:\\Users\\Naveen\\Documents\\LocalSocialArchive')
  const [isMigrating, setIsMigrating] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Manual Offline Vault states
  const [vaultInfo, setVaultInfo] = useState(null)
  const [isFlushing, setIsFlushing] = useState(false)
  const [isExportingFolder, setIsExportingFolder] = useState(false)
  const [folderActionMsg, setFolderActionMsg] = useState('')

  const loadVaultInfo = async () => {
    try {
      const info = await getVaultInfo()
      setVaultInfo(info)
    } catch (err) {
      console.error('Failed to load vault info:', err)
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'storage') {
      loadVaultInfo()
    }
  }, [isOpen, activeTab])

  const handleOpenFolder = async () => {
    try {
      await openVaultFolder()
      showNotification('Opened vault folder in File Explorer')
    } catch (err) {
      alert('Could not open folder: ' + err.message)
    }
  }

  const handleFlushVault = async () => {
    setIsFlushing(true)
    try {
      const res = await flushVault()
      await loadVaultInfo()
      setFolderActionMsg(res.message || 'Database cleanly flushed!')
      showNotification('Vault flushed cleanly')
    } catch (err) {
      alert('Flush failed: ' + err.message)
    } finally {
      setIsFlushing(false)
    }
  }

  const handleExportVaultFolder = async () => {
    setIsExportingFolder(true)
    try {
      const res = await exportVaultFolder()
      await loadVaultInfo()
      setFolderActionMsg(res.message || 'Vault folder exported!')
      showNotification('Vault folder exported to Desktop')
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setIsExportingFolder(false)
    }
  }

  // Import from backup folder states & handlers
  const [importPath, setImportPath] = useState('')
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)
  const [isImportingFolder, setIsImportingFolder] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleBrowseImportFolder = async () => {
    setIsSelectingFolder(true)
    try {
      const res = await selectFolderDialog()
      if (res && res.selected_path) {
        setImportPath(res.selected_path)
      }
    } catch (err) {
      console.error('Folder selection failed:', err)
    } finally {
      setIsSelectingFolder(false)
    }
  }

  const handleImportFolder = async () => {
    if (!importPath.trim()) return
    if (!confirm('Importing this folder will restore all its tweets, folders, and media. A safety backup of your current database will be saved automatically. Do you want to proceed?')) {
      return
    }
    setIsImportingFolder(true)
    setImportResult(null)
    try {
      const res = await importVaultFolder(importPath.trim())
      setImportResult(res)
      showNotification(res.message || 'Vault restored successfully!')
      await loadVaultInfo()
      onRefreshData?.()
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setIsImportingFolder(false)
    }
  }

  // Sync internal columns state when prop changes
  useEffect(() => {
    setColumns(folderColumns)
  }, [folderColumns])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const showNotification = (msg) => {
    setSaveSuccessMsg(msg)
    setTimeout(() => setSaveSuccessMsg(''), 2200)
  }

  const handleColumnSliderChange = (e) => {
    const val = parseInt(e.target.value, 10)
    setColumns(val)
    onFolderColumnsChange?.(val)
    localStorage.setItem('tweetvault_folder_columns', val)
  }

  const handleSaveGeneral = () => {
    localStorage.setItem('tweetvault_user_name', userName)
    localStorage.setItem('tweetvault_default_view', defaultView)
    showNotification('General preferences saved')
  }

  const handleToggleAutoDownload = () => {
    const next = !autoDownloadMedia
    setAutoDownloadMedia(next)
    localStorage.setItem('tweetvault_auto_download_media', String(next))
    showNotification(`Auto-download external images: ${next ? 'Enabled' : 'Disabled'}`)
  }

  const handleToggleHideBroken = () => {
    const next = !hideBrokenImages
    setHideBrokenImages(next)
    localStorage.setItem('tweetvault_hide_broken_images', String(next))
    showNotification(`MS Word image error hiding: ${next ? 'Enabled' : 'Disabled'}`)
  }

  const handleSaveEditor = () => {
    localStorage.setItem('tweetvault_autosave_speed', autoSaveSpeed)
    localStorage.setItem('tweetvault_doc_export_format', defaultDocExport)
    showNotification('Document editor settings saved')
  }

  // Export full vault as JSON
  const handleExportBackup = () => {
    setIsExporting(true)
    const backupData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      user: userName,
      stats: {
        spaces_count: spaces.length,
        folders_count: folders.length,
        collections_count: collections.length,
        posts_count: posts.length,
      },
      spaces,
      folders,
      collections,
      posts,
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tweetvault_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIsExporting(false)
    showNotification('Vault backup exported successfully')
  }

  // Import JSON backup
  const handleImportBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (!data.posts && !data.spaces && !data.folders) {
          alert('Invalid TweetVault backup file structure.')
          return
        }

        showNotification('Importing backup items...')
        
        // Import spaces if present
        const spaceIdMap = {}
        if (Array.isArray(data.spaces)) {
          for (const sp of data.spaces) {
            const existing = spaces.find((s) => s.name === sp.name)
            if (existing) {
              spaceIdMap[sp.id] = existing.id
            } else {
              try {
                const created = await createSpace({
                  name: sp.name,
                  description: sp.description,
                  color: sp.color,
                  icon: sp.icon,
                })
                spaceIdMap[sp.id] = created.id
              } catch (e) {
                console.error('Error importing space:', e)
              }
            }
          }
        }

        // Import folders if present
        const folderIdMap = {}
        if (Array.isArray(data.folders)) {
          for (const f of data.folders) {
            const mappedSpaceId = spaceIdMap[f.space_id] || f.space_id || spaces[0]?.id
            try {
              const created = await createFolder({
                space_id: mappedSpaceId,
                name: f.name,
                color: f.color,
              })
              folderIdMap[f.id] = created.id
            } catch (e) {
              console.error('Error importing folder:', e)
            }
          }
        }

        // Import collections if present
        const collectionIdMap = {}
        if (Array.isArray(data.collections)) {
          for (const c of data.collections) {
            const mappedSpaceId = spaceIdMap[c.space_id] || c.space_id || spaces[0]?.id
            try {
              const created = await createCollection({
                space_id: mappedSpaceId,
                name: c.name,
                color: c.color,
              })
              collectionIdMap[c.id] = created.id
            } catch (e) {
              console.error('Error importing collection:', e)
            }
          }
        }

        // Import posts if present
        if (Array.isArray(data.posts)) {
          for (const p of data.posts) {
            try {
              await createPost({
                ...p,
                id: undefined, // let DB assign new ID
                space_id: spaceIdMap[p.space_id] || p.space_id || spaces[0]?.id || 1,
                folder_id: folderIdMap[p.folder_id] || p.folder_id || null,
                collection_id: collectionIdMap[p.collection_id] || p.collection_id || null,
              })
            } catch (e) {
              console.error('Error importing post:', e)
            }
          }
        }

        showNotification(`Backup restored: ${data.posts?.length || 0} items imported.`)
        onRefreshData?.()
      } catch (err) {
        alert('Failed to parse backup file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // Migrate from LocalSocialArchive (Old PC app folder)
  const handleMigrateLsa = async () => {
    if (!lsaPath.trim()) {
      alert('Please enter the folder path to LocalSocialArchive')
      return
    }
    setIsMigrating(true)
    try {
      const data = await migrateLocalSocialArchive(lsaPath.trim())
      if (data.success) {
        showNotification(data.message || 'Migration completed successfully!')
        onRefreshData?.()
      } else {
        alert('Migration failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Network or server error: ' + err.message)
    } finally {
      setIsMigrating(false)
    }
  }

  const tweetsCount = posts.filter((p) => p.type === 'tweet').length
  const storiesCount = posts.filter((p) => p.type === 'story').length

  return (
    <div className="modal-overlay md3-modal-overlay" onClick={onClose}>
      <div className="md3-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="md3-settings-header">
          <div className="md3-settings-title-row">
            <div className="md3-settings-icon-badge">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="md3-settings-title">Settings</h2>
              <p className="md3-settings-subtitle">Manage workspace preferences, storage, and editor configurations</p>
            </div>
          </div>
          <button type="button" className="md3-icon-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Left Tab Nav + Right Content Area */}
        <div className="md3-settings-body">
          {/* Left Navigation Sidebar */}
          <nav className="md3-settings-sidebar">
            <button
              type="button"
              className={`md3-settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Sliders size={16} />
              <span>General</span>
            </button>
            <button
              type="button"
              className={`md3-settings-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <FileText size={16} />
              <span>Editor & Docs</span>
            </button>
            <button
              type="button"
              className={`md3-settings-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
              onClick={() => setActiveTab('storage')}
            >
              <HardDrive size={16} />
              <span>Storage & Vault</span>
            </button>
            <button
              type="button"
              className={`md3-settings-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              <Keyboard size={16} />
              <span>Shortcuts</span>
            </button>
            <button
              type="button"
              className={`md3-settings-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <Info size={16} />
              <span>About</span>
            </button>
          </nav>

          {/* Right Content Area */}
          <main className="md3-settings-content">
            {saveSuccessMsg && (
              <div className="md3-settings-alert-banner">
                <CheckCircle2 size={16} color="#81c995" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="md3-settings-section">
                <h3 className="md3-section-title">General Preferences</h3>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Display Name</label>
                    <span className="md3-setting-desc">Author handle name used when archiving or creating threads</span>
                  </div>
                  <input
                    type="text"
                    className="md3-input-field"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={handleSaveGeneral}
                    placeholder="Naveen"
                  />
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Folder Grid Density</label>
                    <span className="md3-setting-desc">Default column count for folder cards in Home view</span>
                  </div>
                  <div className="md3-slider-group">
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={columns}
                      onChange={handleColumnSliderChange}
                      className="md3-range-slider"
                    />
                    <span className="md3-slider-pill">{columns} cols</span>
                  </div>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Default Startup View</label>
                    <span className="md3-setting-desc">Choose which screen opens when launching TweetVault</span>
                  </div>
                  <select
                    className="md3-select-field"
                    value={defaultView}
                    onChange={(e) => {
                      setDefaultView(e.target.value)
                      localStorage.setItem('tweetvault_default_view', e.target.value)
                      showNotification('Startup view updated')
                    }}
                  >
                    <option value="workspace">Workspace (Files & Folders)</option>
                    <option value="spaces">Spaces Overview (Node Orbit View)</option>
                  </select>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Visual Theme</label>
                    <span className="md3-setting-desc">Curated Google Material Design 3 tonal dark palette</span>
                  </div>
                  <div className="md3-theme-badge">
                    <span className="md3-theme-dot" />
                    <span>M3 Dark Tonal (#131314 / #1e1f20)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDITOR & DOCS */}
            {activeTab === 'editor' && (
              <div className="md3-settings-section">
                <h3 className="md3-section-title">Word Document & Thread Editor</h3>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Auto-Download Remote Images</label>
                    <span className="md3-setting-desc">
                      Automatically fetch and save external image links into local vault storage for offline retention
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`md3-switch-toggle ${autoDownloadMedia ? 'active' : ''}`}
                    onClick={handleToggleAutoDownload}
                  >
                    <span className="md3-switch-thumb" />
                  </button>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Hide Broken Images (MS Word Behavior)</label>
                    <span className="md3-setting-desc">
                      Seamlessly hide 404 or missing images in reading view without rendering empty broken boxes
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`md3-switch-toggle ${hideBrokenImages ? 'active' : ''}`}
                    onClick={handleToggleHideBroken}
                  >
                    <span className="md3-switch-thumb" />
                  </button>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Document AutoSave Frequency</label>
                    <span className="md3-setting-desc">Interval for debounced synchronization to local SQLite database</span>
                  </div>
                  <select
                    className="md3-select-field"
                    value={autoSaveSpeed}
                    onChange={(e) => {
                      setAutoSaveSpeed(e.target.value)
                      localStorage.setItem('tweetvault_autosave_speed', e.target.value)
                      showNotification('AutoSave frequency updated')
                    }}
                  >
                    <option value="300">Instant (300 ms)</option>
                    <option value="600">Standard (600 ms - Recommended)</option>
                    <option value="1500">Relaxed (1.5 seconds)</option>
                  </select>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Primary Document Export Format</label>
                    <span className="md3-setting-desc">Default action button in the Word Document top titlebar</span>
                  </div>
                  <select
                    className="md3-select-field"
                    value={defaultDocExport}
                    onChange={(e) => {
                      setDefaultDocExport(e.target.value)
                      localStorage.setItem('tweetvault_doc_export_format', e.target.value)
                      showNotification('Default export format updated')
                    }}
                  >
                    <option value="doc">Microsoft Word (.doc)</option>
                    <option value="md">Markdown (.md)</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 3: STORAGE & VAULT */}
            {activeTab === 'storage' && (
              <div className="md3-settings-section">
                <h3 className="md3-section-title">Storage & SQLite Database</h3>

                {/* Storage Health Cards */}
                <div className="md3-storage-grid">
                  <div className="md3-stat-card">
                    <Database size={18} color="#a8c7fa" />
                    <span className="md3-stat-val">{posts.length}</span>
                    <span className="md3-stat-label">Total Items</span>
                  </div>
                  <div className="md3-stat-card">
                    <MessageSquare size={18} color="#78d9ec" />
                    <span className="md3-stat-val">{tweetsCount}</span>
                    <span className="md3-stat-label">Saved Tweets</span>
                  </div>
                  <div className="md3-stat-card">
                    <BookOpen size={18} color="#81c995" />
                    <span className="md3-stat-val">{storiesCount}</span>
                    <span className="md3-stat-label">Threads & Docs</span>
                  </div>
                  <div className="md3-stat-card">
                    <Folder size={18} color="#fdd663" />
                    <span className="md3-stat-val">{folders.length}</span>
                    <span className="md3-stat-label">Active Folders</span>
                  </div>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Persistence Engine</label>
                    <span className="md3-setting-desc">Pure Go SQLite with Write-Ahead Logging (WAL) enabled</span>
                  </div>
                  <div className="md3-status-chip ok">
                    <ShieldCheck size={14} />
                    <span>WAL Active</span>
                  </div>
                </div>

                <div className="md3-setting-row">
                  <div className="md3-setting-info">
                    <label className="md3-setting-label">Vault Storage Directory</label>
                    <span className="md3-setting-desc">{vaultInfo?.vault_path || '%APPDATA%\\TweetVault'}</span>
                  </div>
                  <span className="md3-path-badge">{vaultInfo?.is_portable ? 'Portable (USB/Local)' : 'AppData (Default)'}</span>
                </div>

                {/* Manual Offline Folder Backup Deck */}
                <div className="md3-backup-deck" style={{ borderColor: 'rgba(168, 199, 250, 0.4)' }}>
                  <div className="md3-backup-info">
                    <h4 className="md3-backup-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderOpen size={17} color="#a8c7fa" />
                      <span>Manual Offline Folder Backup & Portability</span>
                    </h4>
                    <p className="md3-backup-desc">
                      Your vault is 100% offline and file-based. All tweets and downloaded media live in this single folder. You can copy this folder to a USB drive or move it to another PC at any time without any cloud accounts.
                    </p>
                  </div>

                  {/* Active Vault Location Card */}
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-outline-variant, #444746)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--md-sys-color-outline)', fontWeight: 500 }}>
                        Active Vault Directory on Disk:
                      </span>
                      {vaultInfo?.is_portable && (
                        <span className="md3-status-chip ok" style={{ fontSize: '11px' }}>Portable Mode</span>
                      )}
                    </div>
                    <code style={{
                      fontSize: '12px',
                      color: 'var(--md-sys-color-primary, #a8c7fa)',
                      background: 'rgba(168, 199, 250, 0.08)',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      wordBreak: 'break-all',
                    }}>
                      {vaultInfo?.vault_path || 'Loading vault path...'}
                    </code>
                    {vaultInfo && (
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-outline)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>Database: {(vaultInfo.db_size_bytes / 1024).toFixed(1)} KB</span>
                        <span>Offline Media: {vaultInfo.media_files_count} files ({(vaultInfo.media_size_bytes / (1024 * 1024)).toFixed(1)} MB)</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="md3-backup-actions" style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button
                      type="button"
                      className="md3-btn-filled"
                      onClick={handleOpenFolder}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FolderOpen size={15} />
                      <span>Reveal Vault Folder in Explorer</span>
                    </button>

                    <button
                      type="button"
                      className="md3-btn-outlined"
                      onClick={handleFlushVault}
                      disabled={isFlushing}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Safely commits all database changes so you can copy the folder safely"
                    >
                      <ShieldCheck size={15} color="#81c995" />
                      <span>{isFlushing ? 'Flushing...' : 'Prepare Folder for Safe Copy'}</span>
                    </button>

                    <button
                      type="button"
                      className="md3-btn-outlined"
                      onClick={handleExportVaultFolder}
                      disabled={isExportingFolder}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Copies the entire vault folder directly to your Desktop"
                    >
                      <Download size={15} />
                      <span>{isExportingFolder ? 'Exporting...' : 'Export Vault Folder to Desktop'}</span>
                    </button>
                  </div>

                  {folderActionMsg && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#81c995', fontWeight: 500 }}>
                      ✓ {folderActionMsg}
                    </div>
                  )}

                  {/* Restore / Import from Backup Folder Sub-Section */}
                  <div style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--md-sys-color-outline-variant, #444746)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={16} color="#81c995" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                        Import / Restore from Backup Folder
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--md-sys-color-outline)' }}>
                      Select or paste the path to a previous TweetVault backup folder (from USB drive, external drive, or another PC).
                    </p>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. D:\TweetVault_Backup or E:\TweetVault"
                        value={importPath}
                        onChange={(e) => setImportPath(e.target.value)}
                        style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
                      />
                      <button
                        type="button"
                        className="md3-btn-outlined"
                        onClick={handleBrowseImportFolder}
                        disabled={isSelectingFolder}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                        title="Browse folders on this PC"
                      >
                        <FolderOpen size={14} />
                        <span>{isSelectingFolder ? 'Browsing...' : 'Browse...'}</span>
                      </button>
                      <button
                        type="button"
                        className="md3-btn-filled"
                        onClick={handleImportFolder}
                        disabled={!importPath.trim() || isImportingFolder}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          background: '#81c995',
                          color: '#042b59',
                          fontWeight: 600,
                        }}
                      >
                        <Check size={14} />
                        <span>{isImportingFolder ? 'Restoring...' : 'Restore Vault'}</span>
                      </button>
                    </div>

                    {importResult && (
                      <div style={{
                        marginTop: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(129, 201, 149, 0.15)',
                        border: '1px solid rgba(129, 201, 149, 0.3)',
                        fontSize: '12px',
                        color: '#81c995',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <CheckCircle2 size={15} />
                        <span>{importResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* How-To Guide Box */}
                  <div style={{
                    marginTop: '14px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: 'var(--md-sys-color-on-surface-variant, #c4c7c5)',
                  }}>
                    <strong style={{ color: '#fff' }}>How to port this folder to another PC:</strong>
                    <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                      <li>Click <strong>Export Vault Folder to Desktop</strong> (or copy the TweetVault folder from AppData).</li>
                      <li>Copy that folder onto your USB drive.</li>
                      <li>On the new PC, paste it into <code style={{ color: '#a8c7fa' }}>%APPDATA%\TweetVault</code> (or keep it right next to <code style={{ color: '#a8c7fa' }}>TweetVault.exe</code> for Portable Mode).</li>
                      <li>Launch TweetVault on the new PC. All tweets, folders, and offline media load instantly.</li>
                    </ol>
                  </div>
                </div>

                {/* Spaces Management Deck */}
                <div className="md3-backup-deck">
                  <div className="md3-backup-info">
                    <h4 className="md3-backup-title">Vault Spaces ({spaces.length})</h4>
                    <p className="md3-backup-desc">
                      Manage or remove creative spaces. Removing a space permanently deletes all its folders, collections, and posts.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {spaces.length === 0 ? (
                      <span style={{ fontSize: '13px', color: 'var(--md-sys-color-outline)' }}>No spaces created yet.</span>
                    ) : (
                      spaces.map((sp) => (
                        <div
                          key={sp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                            border: '1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08))',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: sp.color || '#a8c7fa',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }} className="truncate">
                                {sp.name}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--md-sys-color-outline)' }}>
                                {sp.posts_count || 0} posts • {sp.folders_count || 0} folders
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {onEditSpace && (
                              <button
                                type="button"
                                className="md3-icon-btn"
                                style={{ width: '30px', height: '30px' }}
                                title={`Edit ${sp.name}`}
                                onClick={() => {
                                  onClose?.()
                                  onEditSpace(sp)
                                }}
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            {onDeleteSpace && (
                              <button
                                type="button"
                                className="md3-icon-btn"
                                style={{ width: '30px', height: '30px', color: '#f28b82' }}
                                title={`Delete ${sp.name}`}
                                onClick={() => onDeleteSpace(sp)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Backup & Restore Deck */}
                <div className="md3-backup-deck">
                  <div className="md3-backup-info">
                    <h4 className="md3-backup-title">Vault Backup & Export</h4>
                    <p className="md3-backup-desc">Export your complete archive into a portable JSON document, or restore from a previous backup.</p>
                  </div>
                  <div className="md3-backup-actions">
                    <button
                      type="button"
                      className="md3-btn-outlined"
                      onClick={handleExportBackup}
                      disabled={isExporting}
                    >
                      <Download size={14} />
                      <span>{isExporting ? 'Exporting...' : 'Export Vault Backup (.json)'}</span>
                    </button>
                    <label className="md3-btn-filled-label">
                      <Upload size={14} />
                      <span>Import Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleImportBackup}
                      />
                    </label>
                  </div>
                </div>

                {/* LocalSocialArchive Migration Deck */}
                <div className="md3-backup-deck" style={{ borderColor: 'rgba(168, 199, 250, 0.3)' }}>
                  <div className="md3-backup-info">
                    <h4 className="md3-backup-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Folder size={16} color="#a8c7fa" />
                      <span>Migrate from LocalSocialArchive (Old PC App)</span>
                    </h4>
                    <p className="md3-backup-desc">
                      Copy the <code>LocalSocialArchive</code> folder from your old PC to this computer, paste its folder path below, and click Import. TweetVault will import all your tweets, media assets, spaces, and folders automatically.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="md3-input-field"
                      style={{ flex: 1, minWidth: '240px' }}
                      value={lsaPath}
                      onChange={(e) => setLsaPath(e.target.value)}
                      placeholder="e.g. C:\Users\Naveen\Documents\LocalSocialArchive"
                    />
                    <button
                      type="button"
                      className="md3-btn-filled-label"
                      style={{ border: 'none' }}
                      onClick={handleMigrateLsa}
                      disabled={isMigrating}
                    >
                      <Download size={14} />
                      <span>{isMigrating ? 'Migrating Data...' : 'Import Archive Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="md3-settings-section">
                <h3 className="md3-section-title">Keyboard Shortcuts</h3>
                <div className="md3-shortcuts-list">
                  <div className="md3-shortcut-item">
                    <span className="md3-shortcut-desc">Open / Close Settings</span>
                    <kbd className="md3-kbd">Ctrl + ,</kbd>
                  </div>
                  <div className="md3-shortcut-item">
                    <span className="md3-shortcut-desc">Create New Tweet</span>
                    <kbd className="md3-kbd">Ctrl + N</kbd>
                  </div>
                  <div className="md3-shortcut-item">
                    <span className="md3-shortcut-desc">Global Search in Vault</span>
                    <kbd className="md3-kbd">Ctrl + K</kbd>
                  </div>
                  <div className="md3-shortcut-item">
                    <span className="md3-shortcut-desc">Switch between Spaces and Workspace</span>
                    <kbd className="md3-kbd">Ctrl + Space</kbd>
                  </div>
                  <div className="md3-shortcut-item">
                    <span className="md3-shortcut-desc">Save Document / Thread</span>
                    <kbd className="md3-kbd">Ctrl + S</kbd>
                  </div>
                  <div className="md3-shortcut-item">
                    <span className="md3-shortcut-desc">Close Active Document / Viewer / Modal</span>
                    <kbd className="md3-kbd">Escape</kbd>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ABOUT */}
            {activeTab === 'about' && (
              <div className="md3-settings-section">
                <h3 className="md3-section-title">About TweetVault</h3>
                <div className="md3-about-card">
                  <div className="md3-about-logo">
                    <span>TweetVault</span>
                  </div>
                  <p className="md3-about-description">
                    Modern high-performance desktop workspace for curating tweets, archiving research, and authoring documents with native Microsoft Word fidelity.
                  </p>
                  <div className="md3-about-specs">
                    <div className="md3-spec-row">
                      <span className="md3-spec-key">Version</span>
                      <span className="md3-spec-val">1.0.0 (Production)</span>
                    </div>
                    <div className="md3-spec-row">
                      <span className="md3-spec-key">Desktop Runtime</span>
                      <span className="md3-spec-val">Wails v2 + Microsoft WebView2</span>
                    </div>
                    <div className="md3-spec-row">
                      <span className="md3-spec-key">Backend Core</span>
                      <span className="md3-spec-val">Go 1.22 + SQLite WAL</span>
                    </div>
                    <div className="md3-spec-row">
                      <span className="md3-spec-key">Frontend Engine</span>
                      <span className="md3-spec-val">React 19 + Vite + Lexical Engine</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
