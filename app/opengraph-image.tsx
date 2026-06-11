import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const alt = 'Firesale Rubber'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'))
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #1a0f00 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: '50%',
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <img
            src={logoSrc}
            alt="Firesale Rubber"
            width={120}
            height={120}
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%',
              transform: 'scale(1.15)',
            }}
          />
        </div>
        <div
          style={{
            color: '#f0c040',
            fontSize: 24,
            letterSpacing: '0.2em',
            marginBottom: 16,
          }}
        >
          FIRESALE RUBBER
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: 56,
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Overstock & Defective Rubber Products
        </div>
        <div
          style={{
            color: '#888888',
            fontSize: 22,
            marginTop: 20,
          }}
        >
          firesalerubber.com
        </div>
      </div>
    ),
    { ...size }
  )
}
