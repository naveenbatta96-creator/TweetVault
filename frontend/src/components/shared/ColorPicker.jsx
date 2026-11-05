import React from 'react'
import { COLOR_PRESETS } from '../../utils/colors'

export default function ColorPicker({
  value = '#a8c7fa',
  onChange,
  label = 'Theme Color',
  presets = COLOR_PRESETS,
}) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="color-presets-row">
        {presets.map((color) => (
          <div
            key={color}
            className={`color-preset-dot ${value === color ? 'active' : ''}`}
            style={{ background: color }}
            onClick={() => onChange?.(color)}
            title={color}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            width: '32px',
            height: '32px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '50%',
          }}
          title="Custom color"
        />
      </div>
    </div>
  )
}

