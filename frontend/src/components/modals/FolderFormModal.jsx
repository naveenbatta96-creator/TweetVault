import React, { useState, useEffect } from 'react'
import { Folder, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import ColorPicker from '../shared/ColorPicker'
import { sanitizeM3Color } from '../../utils/colors'

export default function FolderFormModal({
  isOpen,
  onClose,
  editingFolder = null,
  onSubmit,
  onDeleteFolder,
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#a8c7fa')

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name || '')
      setColor(sanitizeM3Color(editingFolder.color || '#a8c7fa'))
    } else {
      setName('')
      setColor('#a8c7fa')
    }
  }, [editingFolder, isOpen])

  if (!isOpen) return null

  const isEdit = Boolean(editingFolder)
  const displayColor = sanitizeM3Color(color)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      color,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Folder settings' : 'New Folder'}
      icon={<Folder size={18} />}
      iconColor={displayColor}
      dialogClassName="md3-dialog"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="form-group">
            <label className="form-label">Folder name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. AI Research, Tech Threads, Design Inspo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <ColorPicker
            label="Folder color"
            value={color}
            onChange={setColor}
          />
        </Modal.Body>

        <Modal.Footer
          style={isEdit ? { justifyContent: 'space-between' } : undefined}
        >
          {isEdit && (
            <button
              type="button"
              className="btn-text-danger"
              onClick={() => {
                onClose()
                onDeleteFolder?.(editingFolder.id)
              }}
            >
              <Trash2 size={16} />
              <span>Delete folder</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim()}
            >
              {isEdit ? 'Save changes' : 'Create folder'}
            </button>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
