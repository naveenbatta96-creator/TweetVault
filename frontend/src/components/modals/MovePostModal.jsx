import React, { useState, useEffect } from 'react'
import { FolderInput, Folder } from 'lucide-react'
import Modal from '../shared/Modal'
import { getFolders } from '../../api/folders'

export default function MovePostModal({
  isOpen,
  onClose,
  movingPost,
  activeSpace,
  onSaveMove,
}) {
  const [targetFolderId, setTargetFolderId] = useState('')
  const [availableFolders, setAvailableFolders] = useState([])

  useEffect(() => {
    if (!movingPost || !isOpen) return
    setTargetFolderId(movingPost.folder_id ? movingPost.folder_id.toString() : '')

    const spaceParam =
      activeSpace?.id && activeSpace.id !== 'all' ? activeSpace.id : undefined
    getFolders(spaceParam)
      .then((fData) => setAvailableFolders(fData || []))
      .catch(console.error)
  }, [movingPost, activeSpace, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!movingPost) return
    const targetFolder = availableFolders.find(
      (f) => f.id === parseInt(targetFolderId)
    )
    onSaveMove({
      ...movingPost,
      space_id: targetFolder?.space_id || movingPost.space_id,
      folder_id: targetFolderId ? parseInt(targetFolderId) : null,
    })
  }

  if (!isOpen || !movingPost) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move to folder"
      icon={<FolderInput size={18} />}
      iconColor="var(--md-sys-color-primary, #a8c7fa)"
      dialogClassName="md3-dialog"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="m3-preview-card">
            <div className="m3-preview-card-label">Selected Tweet</div>
            <div className="m3-preview-card-title truncate">
              {movingPost.title || movingPost.content.substring(0, 80)}
            </div>
            <div className="m3-preview-card-sub">
              By {movingPost.author_name} ({movingPost.author_handle})
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Destination Folder</label>
            <select
              className="form-input"
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
            >
              <option value="">No folder (Root Vault)</option>
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Move
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
