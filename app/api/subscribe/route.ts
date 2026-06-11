import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const apiKey = process.env.MAILERLITE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const body: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      status: 'active',
    }

    const groupId = process.env.MAILERLITE_GROUP_ID
    if (groupId) {
      body.groups = [groupId]
    }

    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: data.message || 'Failed to subscribe. Please try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
