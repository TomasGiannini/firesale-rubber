'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

function escapeHTML(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatThickness(val: string): string {
  if (!val) return ''
  const mm = parseFloat(val)
  if (isNaN(mm)) return escapeHTML(val)
  return `${mm}mm`
}

const FILTERS = [
  { key: 'all', label: 'All Products' },
  { key: 'hot-limited', label: 'Hot & Limited' },
  { key: 'Puzzle Tiles', label: 'Puzzle Tiles' },
  { key: 'Rolls', label: 'Rolls' },
  { key: 'Sheets', label: 'Sheets' },
  { key: 'Acoustic Underlayment', label: 'Acoustic Underlayment' },
  { key: 'Master Rolls', label: 'Master Rolls' },
]

export default function CatalogClient() {
  const [items, setItems] = useState<Item[]>([])
  const [filtered, setFiltered] = useState<Item[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lightboxItem, setLightboxItem] = useState<Item | null>(null)

  useEffect(() => {
    async function fetchInventory() {
      const { data, error } = await sb
        .from('inventory')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true })

      if (error) {
        setError(true)
        setLoading(false)
        return
      }

      setItems(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchInventory()
  }, [])

  useEffect(() => {
    if (activeFilter === 'all') {
      setFiltered(items)
    } else if (activeFilter === 'hot-limited') {
      setFiltered(
        items.filter(
          (i) =>
            i.badge &&
            (i.badge.toLowerCase() === 'hot' ||
              i.badge.toLowerCase() === 'limited')
        )
      )
    } else if (activeFilter === 'Master Rolls') {
      setFiltered(
        items.filter((i) => (i.category || '').trim() === 'Master Rolls')
      )
    } else {
      setFiltered(items.filter((i) => (i.category || '').trim() === activeFilter))
    }
  }, [activeFilter, items])

  const categories = new Set(items.map((i) => (i.category || '').trim()).filter(Boolean))
  const totalItems = items.length

  // Group items
  const grouped = new Map<string, Map<string, Item[]>>()
  for (const item of filtered) {
    const cat = (item.category || '').trim()
    const thick = (item.thickness || '').trim()
    if (!grouped.has(cat)) grouped.set(cat, new Map())
    const catMap = grouped.get(cat)!
    if (!catMap.has(thick)) catMap.set(thick, [])
    catMap.get(thick)!.push(item)
  }

  // Sort thickness within each category
  for (const [, thicknessMap] of grouped) {
    const sorted = [...thicknessMap.entries()].sort(
      (a, b) => (parseFloat(a[0]) || 0) - (parseFloat(b[0]) || 0)
    )
    thicknessMap.clear()
    for (const [k, v] of sorted) thicknessMap.set(k, v)
  }

  const isMasterRolls = activeFilter === 'Master Rolls'
  const masterRollItems = isMasterRolls
    ? filtered
    : filtered.filter((i) => (i.category || '').trim() === 'Master Rolls')

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-headline">
            Commercial-grade rubber flooring.
            <br />
            <span>Clearance prices.</span>
          </h1>
          <p className="hero-desc" style={{ marginBottom: 12 }}>
            Our inventory is a mix of overstock, discontinued custom orders, and
            cosmetically imperfect pieces that didn't meet our shipping standards.
            Functionally solid.
          </p>

          <p className="hero-desc" style={{ color: '#f0c040', fontWeight: 700 }}>
            All items sold as-is. Deep discounts available for bulk orders.
          </p>
        </div>
        <div className="hero-right">
          <div className="stat">
            <div className="stat-num">{loading ? '—' : totalItems}</div>
            <div className="stat-label">Items Available</div>
          </div>
          <div className="stat">
            <div className="stat-num">{loading ? '—' : categories.size}</div>
            <div className="stat-label">Product Types</div>
          </div>
        </div>
      </section>

      <nav className="filter-bar" id="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${activeFilter === f.key ? 'active' : ''}`}
            data-filter={f.key}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <main className="content" id="catalog">
        {loading && (
          <div className="loading-msg">Loading inventory...</div>
        )}

        {error && (
          <p className="error-msg">
            Unable to load inventory at this time. Please call Tomas at{' '}
            <a href="tel:4167881629">416 788 1629</a>.
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="loading-msg">
            No inventory available at this time. Check back soon or call Tomas at{' '}
            <a href="tel:4167881629">416 788 1629</a>.
          </p>
        )}

        {!loading &&
          !error &&
          [...grouped.entries()].map(([category, thicknessMap]) => {
            if (category === 'Master Rolls') {
              const allImages = [...thicknessMap.values()].flat()
              return (
                <section
                  key={category}
                  className="category-section master-rolls-section"
                  data-category="Master Rolls"
                >
                  <div className="master-rolls-header">
                    <h2 className="master-rolls-title">Master Rolls</h2>
                    <p className="master-rolls-cta">
                      Inquire with Tomas about master roll availability and pricing
                    </p>
                    <a
                      href="tel:4167881629"
                      className="master-rolls-phone"
                    >
                      416 788 1629
                    </a>
                  </div>
                  {allImages.length > 0 && (
                    <div className="master-rolls-grid">
                      {allImages.map((item) => {
                        const urls = parseImageUrls(item.image_url)
                        return urls.map((url, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="master-roll-thumb"
                            data-item-id={item.id}
                            onClick={() => setLightboxItem(item)}
                          >
                            <img
                              src={url}
                              alt={item.name || 'Master Roll'}
                              loading="lazy"
                              onError={(e) => {
                                ;(e.currentTarget.parentElement!.style.display =
                                  'none')
                              }}
                            />
                          </div>
                        ))
                      })}
                    </div>
                  )}
                </section>
              )
            }

            const totalInCategory = [...thicknessMap.values()].flat().length
            return (
              <section
                key={category}
                className="category-section"
                data-category={category}
              >
                <div className="category-header">
                  <h2 className="category-title">{category}</h2>
                  <span className="category-count">
                    {totalInCategory} item
                    {totalInCategory !== 1 ? 's' : ''} available
                  </span>
                </div>
                {[...thicknessMap.entries()].map(([thickness, groupItems]) => (
                  <div key={thickness} className="thickness-group">
                    <div className="thickness-label">{formatThickness(thickness)}</div>
                    <div className="product-grid">
                      {groupItems.map((item) => (
                        <ProductCard
                          key={item.id}
                          item={item}
                          onOpen={() => setLightboxItem(item)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
      </main>

      {/* LIGHTBOX */}
      {lightboxItem && (
        <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      )}
    </>
  )
}

function ProductCard({
  item,
  onOpen,
}: {
  item: Item
  onOpen: () => void
}) {
  const badge = (item.badge || '').trim()
  const imageUrls = parseImageUrls(item.image_url)

  return (
    <div className="product-card" data-item-id={item.id} onClick={onOpen}>
      <div className="card-img">
        {imageUrls.length > 0 &&
          imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={item.name || ''}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className={i > 0 ? 'card-img-extra' : ''}
            />
          ))}
        {badge && (
          <span className={`card-badge ${badge.toLowerCase()}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{escapeHTML(item.name || '')}</div>
        <div className="card-color">Color: {escapeHTML(item.color || '')}</div>
        {item.size && (
          <div className="card-size">Size: {escapeHTML(item.size)}</div>
        )}
        <div className="card-qty">{escapeHTML(item.quantity || '')}</div>
        {item.notes && (
          <div className="card-note">{escapeHTML(item.notes)}</div>
        )}
      </div>
    </div>
  )
}

function Lightbox({
  item,
  onClose,
}: {
  item: Item
  onClose: () => void
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const imageUrls = parseImageUrls(item.image_url)

  return (
    <div
      className="lightbox-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button className="lightbox-close" onClick={onClose}>
        ×
      </button>
      <div className="lightbox-content">
        {imageUrls.length > 0 && (
          <div className="lightbox-images">
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={item.name || ''}
              />
            ))}
          </div>
        )}
        <div className="lightbox-info">
          <div className="lightbox-name">
            {escapeHTML(item.name || 'Untitled')}
          </div>
          {item.category && (
            <div className="lightbox-detail">
              <span>Category:</span> {escapeHTML(item.category)}
            </div>
          )}
          {item.thickness && (
            <div className="lightbox-detail">
              <span>Thickness:</span> {formatThickness(item.thickness)}
            </div>
          )}
          {item.size && (
            <div className="lightbox-detail">
              <span>Size:</span> {escapeHTML(item.size)}
            </div>
          )}
          {item.color && (
            <div className="lightbox-detail">
              <span>Color:</span> {escapeHTML(item.color)}
            </div>
          )}
          {item.quantity && (
            <div className="lightbox-detail">
              <span>Quantity:</span> {escapeHTML(item.quantity)}
            </div>
          )}
          {item.notes && (
            <div className="lightbox-note">{escapeHTML(item.notes)}</div>
          )}
          <div className="lightbox-cta">
            Interested? Call or text{' '}
            <a href="tel:4167881629">416 788 1629</a>
          </div>
        </div>
      </div>
    </div>
  )
}
