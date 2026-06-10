import { NextResponse } from 'next/server'
import convert from 'heic-convert'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.storageUrl) {
      return NextResponse.json(
        { error: 'Missing storageUrl in request body.' },
        { status: 400 }
      )
    }

    const fetchResp = await fetch(body.storageUrl)
    if (!fetchResp.ok) {
      return NextResponse.json(
        { error: 'Could not download file from storage.' },
        { status: 502 }
      )
    }

    const arrayBuf = await fetchResp.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuf)

    const jpegBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.85,
    })

    return new NextResponse(Buffer.from(jpegBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpegBuffer.length),
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Conversion failed: ' + e.message },
      { status: 500 }
    )
  }
}
