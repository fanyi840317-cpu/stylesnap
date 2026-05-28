import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Copy, Check, Edit2, X, RotateCcw } from 'lucide-react'

interface PropertyRowProps {
  property: string
  value: string
  /** Show color swatch when value is a color */
  showSwatch?: boolean
  /** Allow inline editing; fires onEdit when changed */
  editable?: boolean
  onEdit?: (property: string, newValue: string) => void
  onCopy?: (text: string) => void
  /** Dim out the row (e.g. unchanged from default) */
  dimmed?: boolean
  className?: string
}

const COLOR_REGEX =
  /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|transparent|currentColor|inherit)$/

function isColor(value: string): boolean {
  return COLOR_REGEX.test(value.trim())
}

/** Parse color string into a CSS-usable value for the swatch */
function swatchColor(value: string): string {
  return value.trim()
}

export const PropertyRow: React.FC<PropertyRowProps> = ({
  property,
  value,
  showSwatch = true,
  editable = false,
  onEdit,
  onCopy,
  dimmed = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [originalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const isColorValue = showSwatch && isColor(value)
  const isModified = editable && editValue !== originalValue

  // Sync external value changes when not editing
  useEffect(() => {
    if (!editing) setEditValue(value)
  }, [value, editing])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    onCopy?.(text)
    setTimeout(() => setCopied(false), 1500)
  }, [onCopy])

  const handleStartEdit = () => {
    setEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleCommit = () => {
    setEditing(false)
    if (editValue !== value) {
      onEdit?.(property, editValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommit()
    if (e.key === 'Escape') {
      setEditValue(value)
      setEditing(false)
    }
  }

  const handleReset = () => {
    setEditValue(originalValue)
    onEdit?.(property, originalValue)
  }

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/60 transition-colors ${
        dimmed ? 'opacity-40' : ''
      } ${isModified ? 'bg-amber-900/10 border-l-2 border-amber-500/60' : ''} ${className}`}
    >
      {/* Color swatch */}
      {isColorValue && (
        <div
          className="flex-none w-3.5 h-3.5 rounded-sm border border-gray-600 shadow-sm"
          style={{ backgroundColor: swatchColor(editing ? editValue : value) }}
          title={value}
        />
      )}

      {/* Property name */}
      <span
        className="flex-none text-xs font-mono text-blue-300 min-w-[100px] max-w-[130px] truncate"
        title={property}
      >
        {property}:
      </span>

      {/* Value — editable or static */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono text-gray-100 outline-none focus:ring-1 focus:ring-indigo-400"
          />
        ) : (
          <span
            className="block text-xs font-mono text-gray-300 truncate cursor-default"
            title={editValue}
            onDoubleClick={editable ? handleStartEdit : undefined}
          >
            {editValue}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-none flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Reset (only when modified) */}
        {isModified && !editing && (
          <button
            onClick={handleReset}
            className="p-0.5 rounded hover:bg-gray-700 text-amber-400 hover:text-amber-300 transition-colors"
            title="Reset to original"
          >
            <RotateCcw size={11} />
          </button>
        )}

        {/* Edit */}
        {editable && !editing && (
          <button
            onClick={handleStartEdit}
            className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            title="Edit value"
          >
            <Edit2 size={11} />
          </button>
        )}

        {/* Cancel edit */}
        {editing && (
          <button
            onClick={() => { setEditValue(value); setEditing(false) }}
            className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
            title="Cancel"
          >
            <X size={11} />
          </button>
        )}

        {/* Copy single property */}
        <button
          onClick={() => handleCopy(`${property}: ${editValue};`)}
          className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
          title="Copy declaration"
        >
          {copied ? (
            <Check size={11} className="text-green-400" />
          ) : (
            <Copy size={11} />
          )}
        </button>
      </div>
    </div>
  )
}

export default PropertyRow
