import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  const logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'))
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e1a',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <img
          src={logoSrc}
          alt="Firesale Rubber"
          width={32}
          height={32}
          style={{
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            transform: 'scale(1.15)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
