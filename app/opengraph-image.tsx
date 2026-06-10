import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Firesale Rubber'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
