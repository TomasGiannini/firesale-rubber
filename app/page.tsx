import type { Metadata } from 'next'
import Link from 'next/link'
import { SEO_CONFIG } from '@/lib/seo'
import CatalogClient from '@/components/CatalogClient'

export const metadata: Metadata = {
  title: 'Overstock Rubber Gym Flooring | Firesale Rubber',
  description:
    'Overstock and defective rubber gym flooring at clearance prices. Puzzle tiles, rolls, sheets, and acoustic underlayment. Pickup only in Vaughan, Ontario. Call 416-788-1629.',
  keywords: SEO_CONFIG.keywords.home,
  alternates: {
    canonical: 'https://www.firesalerubber.com',
  },
  openGraph: {
    title: 'Overstock Rubber Gym Flooring | Firesale Rubber',
    description:
      'Clearance pricing on overstock rubber gym flooring — puzzle tiles, rolls, sheets, and acoustic underlayment. Pickup in Vaughan, Ontario.',
    url: 'https://www.firesalerubber.com',
    images: [
      {
        url: '/og/default-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Firesale Rubber — Overstock Rubber Products',
      },
    ],
  },
}

export default function HomePage() {
  return (
    <div className="site-wrapper">
      {/* HEADER */}
      <header className="header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '50%', padding: 4, flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="Firesale Rubber"
              style={{ height: 72, width: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <div>
            <div className="logo-main">
              FIRESALE <span>RUBBER</span>
            </div>
            <div className="logo-sub">Overstock rubber gym flooring — clearance pricing</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-cta-label">Interested? Call Tomas</div>
          <a href="tel:4167881629" className="header-phone">416 788 1629</a>
        </div>
      </header>

      {/* PICKUP BANNER */}
      <div className="pickup-banner">
        <span className="pickup-pin">📍</span>
        <span className="pickup-text">
          PICKUP — <strong>VAUGHAN, ONTARIO</strong>
        </span>
        <span className="pickup-divider">|</span>
        <span className="pickup-sub" style={{ color: '#5db87a', fontWeight: 600 }}>
          Shipping available
        </span>
      </div>

      {/* CATALOG */}
      <CatalogClient />

      {/* CONTACT STRIP */}
      <div className="contact-strip">
        <div className="contact-strip-left">
          <h2 className="contact-strip-heading">See something you want?</h2>
          <p className="contact-strip-sub">
            All prices negotiated — call or text to discuss quantities and
            availability
          </p>
        </div>
        <div className="contact-strip-right">
          <div className="contact-strip-name">Tomas Giannini</div>
          <a href="tel:4167881629" className="contact-strip-number">
            416 788 1629
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <div style={{ backgroundColor: 'white', borderRadius: '50%', padding: 3, display: 'inline-block' }}>
            <img src="/logo.png" alt="Firesale Rubber" style={{ height: 36, width: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>
        <div className="footer-right">
          <p>
            Tomas Giannini — <a href="tel:4167881629">416 788 1629</a>
          </p>
          <p>📍 Pickup only — Vaughan, Ontario</p>
          <p>New overstock rubber gym flooring, minor cosmetic variations only</p>
        </div>
      </footer>
    </div>
  )
}
