'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CORRECT_PASSWORD = 'citybassboy'

interface Item {
  id: string
  category: string
  thickness: string
  name: string
  color: string
  size: string | null
  quantity: string
  badge: string
  notes: string | null
  image_url: string | null
  active: boolean
  created_at: string
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function parseImageUrls(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch {
    /* not JSON */
  }
  return [value]
}

function escHTML(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getStoragePath(imageUrl: string): string | null {
  if (!imageUrl) return null
  const marker = '/product-images/'
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

async function deleteStorageImage(imageUrl: string): Promise<boolean> {
  const path = getStoragePath(imageUrl)
  if (!path) return true
  const { error } = await sb.storage.from('product-images').remove([path])
  return !error
}

export default function AdminClient() {
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin-auth') === '1') {
      setAuthenticated(true)
    }
  }, [])

  function checkPassword() {
    if (passwordInput === CORRECT_PASSWORD) {
      sessionStorage.setItem('admin-auth', '1')
      setAuthenticated(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
      setPasswordInput('')
    }
  }

  if (!authenticated) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0a0e1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: 32,
            borderRadius: 8,
            maxWidth: 320,
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
              color: '#0a0e1a',
            }}
          >
            Admin Access
          </h2>
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') checkPassword()
            }}
            autoFocus
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 4,
              marginBottom: 12,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={checkPassword}
            style={{
              width: '100%',
              padding: 10,
              background: '#f0c040',
              color: '#0a0e1a',
              fontWeight: 700,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Enter
          </button>
          {passwordError && (
            <p
              style={{
                color: '#c0392b',
                fontSize: 13,
                marginTop: 8,
                fontWeight: 600,
              }}
            >
              Incorrect password.
            </p>
          )}
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([])
  const [lightboxName, setLightboxName] = useState('')
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [notifyMessage, setNotifyMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLightboxUrls([])
        document.body.style.overflow = ''
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  async function loadInventory() {
    setLoading(true)
    const { data, error } = await sb
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      const isRLS =
        error.message &&
        error.message.toLowerCase().includes('row-level security')
      setFormError(
        isRLS
          ? 'Failed to load: RLS policy blocked the read.'
          : 'Failed to load inventory.'
      )
      setLoading(false)
      return
    }

    const sorted = (data || []).sort(
      (a, b) => (parseFloat(a.thickness) || 0) - (parseFloat(b.thickness) || 0)
    )
    setItems(sorted)
    setLoading(false)
  }

  function clearMessages() {
    setFormError('')
    setFormSuccess('')
  }

  async function notifySubscribers() {
    if (!confirm('Send a "New Stock" email to all subscribers?')) return
    setNotifyStatus('loading')
    setNotifyMessage('')

    try {
      const res = await fetch('/api/notify', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setNotifyStatus('error')
        setNotifyMessage(data.error || 'Failed to send notification.')
      } else {
        setNotifyStatus('success')
        setNotifyMessage('Notification sent successfully.')
      }
    } catch {
      setNotifyStatus('error')
      setNotifyMessage('Network error. Please try again.')
    }
  }

  function getFormData(): Record<string, any> {
    return {
      category: (document.getElementById('f-category') as HTMLSelectElement)
        ?.value,
      thickness: (
        document.getElementById('f-thickness') as HTMLInputElement
      )?.value.trim(),
      name: (document.getElementById('f-name') as HTMLInputElement)?.value.trim(),
      color: (document.getElementById('f-color') as HTMLInputElement)?.value.trim(),
      size:
        (document.getElementById('f-size') as HTMLInputElement)?.value.trim() ||
        null,
      quantity: (
        document.getElementById('f-quantity') as HTMLInputElement
      )?.value.trim(),
      badge: (document.getElementById('f-badge') as HTMLSelectElement)?.value,
      notes:
        (document.getElementById('f-notes') as HTMLTextAreaElement)?.value.trim() ||
        null,
      image_url: currentImageUrls.length
        ? JSON.stringify(currentImageUrls)
        : null,
      active: (document.getElementById('f-active') as HTMLInputElement)?.checked,
    }
  }

  function resetForm() {
    ;(document.getElementById('f-category') as HTMLSelectElement).value = ''
    ;(document.getElementById('f-thickness') as HTMLInputElement).value = ''
    ;(document.getElementById('f-name') as HTMLInputElement).value = ''
    ;(document.getElementById('f-color') as HTMLInputElement).value = ''
    ;(document.getElementById('f-size') as HTMLInputElement).value = ''
    ;(document.getElementById('f-quantity') as HTMLInputElement).value = ''
    ;(document.getElementById('f-badge') as HTMLSelectElement).value = ''
    ;(document.getElementById('f-notes') as HTMLTextAreaElement).value = ''
    ;(document.getElementById('f-active') as HTMLInputElement).checked = true
    setCurrentImageUrls([])
    setEditingId(null)
    clearMessages()
  }

  async function saveItem() {
    clearMessages()
    const data = getFormData()
    const btn = document.getElementById('btn-save') as HTMLButtonElement
    if (btn) {
      btn.disabled = true
      btn.textContent = 'Saving...'
    }

    let error
    if (editingId) {
      ;({ error } = await sb
        .from('inventory')
        .update(data)
        .eq('id', editingId))
    } else {
      ;({ error } = await sb.from('inventory').insert(data))
    }

    if (btn) {
      btn.disabled = false
      btn.textContent = 'Save Item'
    }

    if (error) {
      const isRLS =
        error.message &&
        error.message.toLowerCase().includes('row-level security')
      setFormError(
        isRLS
          ? 'Save failed: RLS policy blocked the write.'
          : 'Save failed. Check your connection and try again.'
      )
      return
    }

    setFormSuccess(editingId ? 'Item updated.' : 'Item added.')
    resetForm()
    loadInventory()
  }

  async function startEdit(id: string) {
    clearMessages()
    const { data, error } = await sb
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setFormError('Could not load item. Try again.')
      return
    }

    setEditingId(id)
    setCurrentImageUrls(parseImageUrls(data.image_url))

    ;(document.getElementById('f-category') as HTMLSelectElement).value =
      data.category || ''
    ;(document.getElementById('f-thickness') as HTMLInputElement).value =
      String(parseFloat(data.thickness) || '')
    ;(document.getElementById('f-name') as HTMLInputElement).value =
      data.name || ''
    ;(document.getElementById('f-color') as HTMLInputElement).value =
      data.color || ''
    ;(document.getElementById('f-size') as HTMLInputElement).value =
      data.size || ''
    ;(document.getElementById('f-quantity') as HTMLInputElement).value =
      data.quantity || ''
    ;(document.getElementById('f-badge') as HTMLSelectElement).value =
      data.badge || ''
    ;(document.getElementById('f-notes') as HTMLTextAreaElement).value =
      data.notes || ''
    ;(document.getElementById('f-active') as HTMLInputElement).checked =
      data.active

    document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return

    const { data: item } = await sb
      .from('inventory')
      .select('image_url')
      .eq('id', id)
      .single()
    if (item) {
      const urls = parseImageUrls(item.image_url)
      for (const url of urls) {
        await deleteStorageImage(url)
      }
    }

    const { error } = await sb.from('inventory').delete().eq('id', id)
    if (error) {
      const isRLS =
        error.message &&
        error.message.toLowerCase().includes('row-level security')
      setFormError(
        isRLS
          ? 'Delete failed: RLS policy blocked the write.'
          : 'Delete failed. Try again.'
      )
      return
    }

    loadInventory()
  }

  async function uploadPhoto(file: File) {
    if (uploading) return
    setUploading(true)
    clearMessages()

    let processedFile = file
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      try {
        const tempName = `tmp-${generateId()}.${ext}`
        const { error: tmpErr } = await sb.storage
          .from('product-images')
          .upload(tempName, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          })
        if (tmpErr) throw new Error('Could not upload temp file: ' + tmpErr.message)

        const { data: tmpUrl } = sb.storage
          .from('product-images')
          .getPublicUrl(tempName)

        const resp = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageUrl: tmpUrl.publicUrl }),
        })
        if (!resp.ok) {
          const text = await resp.text()
          let msg = 'Server conversion failed'
          try {
            msg = JSON.parse(text).error || msg
          } catch {
            msg = text.slice(0, 200) || msg
          }
          throw new Error(msg)
        }
        const blob = await resp.blob()
        processedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, '.jpg'),
          { type: 'image/jpeg' }
        )

        await sb.storage.from('product-images').remove([tempName])
      } catch (e) {
        setUploading(false)
        setFormError(`Could not convert image: ${(e as Error).message}`)
        return
      }
    }

    const uploadExt = processedFile.name.split('.').pop()?.toLowerCase()
    const filename = `${generateId()}.${uploadExt}`

    let uploadError
    try {
      const { error } = await sb.storage
        .from('product-images')
        .upload(filename, processedFile, {
          contentType: processedFile.type,
          upsert: false,
        })
      uploadError = error
    } catch (e) {
      uploadError = e as Error
    }

    setUploading(false)

    if (uploadError) {
      const isRLS =
        uploadError.message &&
        uploadError.message.toLowerCase().includes('row-level security')
      setFormError(
        isRLS
          ? 'Photo upload failed: RLS policy blocked the storage write.'
          : `Photo upload failed: ${uploadError.message || 'Check your Supabase storage policies.'}`
      )
      return
    }

    const { data: urlData } = sb.storage
      .from('product-images')
      .getPublicUrl(filename)

    setCurrentImageUrls((prev) => [...prev, urlData.publicUrl])
  }

  async function removePhoto(index: number) {
    const url = currentImageUrls[index]
    await deleteStorageImage(url)
    setCurrentImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function openAdminLightbox(item: Item) {
    const urls = parseImageUrls(item.image_url)
    if (!urls.length) return
    setLightboxUrls(urls)
    setLightboxName(item.name || '')
    document.body.style.overflow = 'hidden'
  }

  function closeAdminLightbox() {
    setLightboxUrls([])
    document.body.style.overflow = ''
  }

  return (
    <>
      <div className="admin-header">
        <h1>
          FIRESALE <span>RUBBER</span> — Admin
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={notifySubscribers}
            disabled={notifyStatus === 'loading'}
            style={{
              background: '#f0c040',
              color: '#0a0e1a',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: notifyStatus === 'loading' ? 0.6 : 1,
            }}
          >
            {notifyStatus === 'loading' ? 'Sending...' : 'Notify Subscribers'}
          </button>
          <a href="/">← View site</a>
        </div>
      </div>
      {notifyMessage && (
        <div
          style={{
            maxWidth: 960,
            margin: '12px auto 0',
            padding: '10px 16px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            background: notifyStatus === 'success' ? '#1a2e1a' : '#3a0808',
            color: notifyStatus === 'success' ? '#5db87a' : '#e74c3c',
            border: `1px solid ${notifyStatus === 'success' ? '#2d5a2d' : '#c0392b'}`,
          }}
        >
          {notifyMessage}
        </div>
      )}

      <div className="admin-body">
        {/* FORM */}
        <div className="form-card">
          <h2>{editingId ? 'Edit Item' : 'Add New Item'}</h2>
          <div className="form-grid">
            <div className="form-group full">
              <label>Photos</label>
              <div className="photo-previews">
                {currentImageUrls.map((url, i) => (
                  <div key={i} className="photo-thumb">
                    <img src={url} alt="" />
                    <button
                      className="remove-photo"
                      onClick={() => removePhoto(i)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (!e.target.files) return
                    for (const file of Array.from(e.target.files)) {
                      uploadPhoto(file)
                    }
                    e.target.value = ''
                  }}
                />
                {uploading && <span className="upload-spinner">Uploading...</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="f-category">Category</label>
              <select id="f-category">
                <option value="">— Select —</option>
                <option value="Puzzle Tiles">Puzzle Tiles</option>
                <option value="Rolls">Rolls</option>
                <option value="Sheets">Sheets</option>
                <option value="Acoustic Underlayment">Acoustic Underlayment</option>
                <option value="Master Rolls">Master Rolls</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="f-thickness">Thickness (mm)</label>
              <input
                type="number"
                id="f-thickness"
                placeholder="e.g. 19"
                min={0}
                step="any"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f-name">Product Name</label>
              <input type="text" id="f-name" placeholder="e.g. Puzzle Tile" />
            </div>

            <div className="form-group">
              <label htmlFor="f-color">Color</label>
              <input type="text" id="f-color" placeholder="e.g. Black" />
            </div>

            <div className="form-group">
              <label htmlFor="f-size">Size</label>
              <input type="text" id="f-size" placeholder="e.g. 24&quot;x24&quot; or 4'x25'" />
            </div>

            <div className="form-group">
              <label htmlFor="f-quantity">Quantity</label>
              <input type="text" id="f-quantity" placeholder="e.g. ~200 sqft" />
            </div>

            <div className="form-group">
              <label htmlFor="f-badge">Badge</label>
              <select id="f-badge">
                <option value="">None</option>
                <option value="Hot">Hot</option>
                <option value="Limited">Limited</option>
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="f-notes">Cosmetic Notes</label>
              <textarea
                id="f-notes"
                placeholder="e.g. Minor discolouration on select edges"
              />
            </div>

            <div className="form-group full">
              <div className="checkbox-group">
                <input type="checkbox" id="f-active" defaultChecked />
                <label htmlFor="f-active">
                  Visible on site (uncheck to hide without deleting)
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-save"
              id="btn-save"
              onClick={saveItem}
            >
              Save Item
            </button>
            {editingId && (
              <button className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            )}
            {formError && <span className="form-error">{formError}</span>}
            {formSuccess && <span className="form-success">{formSuccess}</span>}
          </div>
        </div>

        {/* INVENTORY LIST */}
        <div>
          <div className="list-header">
            <h2>Current Inventory</h2>
            <span className="list-count">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          {loading ? (
            <div className="list-loading">Loading inventory...</div>
          ) : items.length === 0 ? (
            <div className="empty-list">
              No items yet. Add your first item above.
            </div>
          ) : (
            <table className="item-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Thickness</th>
                  <th>Size</th>
                  <th>Badge</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const urls = parseImageUrls(item.image_url)
                  return (
                    <tr
                      key={item.id}
                      className={item.active ? '' : 'inactive'}
                    >
                      <td>
                        {urls.length > 0 ? (
                          <img
                            className="thumb"
                            src={urls[0]}
                            alt=""
                            onClick={() => openAdminLightbox(item)}
                          />
                        ) : (
                          <div className="no-thumb">No photo</div>
                        )}
                      </td>
                      <td>{escHTML(item.name)}</td>
                      <td>{escHTML(item.category)}</td>
                      <td>{escHTML(item.thickness)}</td>
                      <td>{escHTML(item.size || '')}</td>
                      <td>
                        {item.badge ? (
                          <span
                            className={`badge-pill ${item.badge.toLowerCase()}`}
                          >
                            {escHTML(item.badge)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-dot ${item.active ? 'active' : 'inactive'}`}
                        />
                        {item.active ? 'Visible' : 'Hidden'}
                      </td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => startEdit(item.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => deleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADMIN LIGHTBOX */}
      {lightboxUrls.length > 0 && (
        <div
          className="admin-lightbox active"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAdminLightbox()
          }}
        >
          <button
            className="admin-lightbox-close"
            onClick={closeAdminLightbox}
          >
            ×
          </button>
          <div className="admin-lightbox-body">
            {lightboxUrls.map((url, i) => (
              <img key={i} src={url} alt={lightboxName} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
