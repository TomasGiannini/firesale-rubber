import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'No RESEND_API_KEY' }, { status: 500 })
  }

  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${resendKey}` },
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json({
    status: res.status,
    keyPrefix: resendKey.slice(0, 8) + '...',
    domains: data,
  })
}
