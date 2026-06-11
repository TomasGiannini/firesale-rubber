import { NextRequest, NextResponse } from 'next/server'

interface Subscriber {
  id: string
  email: string
}

async function fetchSubscribersFromGroup(apiKey: string, groupId: string): Promise<string[]> {
  const emails: string[] = []
  let url: string | null = `https://connect.mailerlite.com/api/groups/${groupId}/subscribers?limit=100`

  while (url) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`MailerLite error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const subscribers: Subscriber[] = data.data || []

    for (const sub of subscribers) {
      if (sub.email) emails.push(sub.email)
    }

    url = data.links?.next || null
  }

  return emails
}

export async function POST(request: NextRequest) {
  try {
    const mailerLiteKey = process.env.MAILERLITE_API_KEY
    const resendKey = process.env.RESEND_API_KEY
    const groupId = process.env.MAILERLITE_GROUP_ID
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@firesalerubber.com'
    const fromName = process.env.MAILERLITE_FROM_NAME || 'Firesale Rubber'

    if (!mailerLiteKey || !resendKey) {
      return NextResponse.json({ error: 'Missing API keys.' }, { status: 500 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Missing MailerLite group ID.' }, { status: 500 })
    }

    // 1. Fetch subscribers from MailerLite group
    console.log('[NOTIFY] Fetching subscribers from group:', groupId)
    const emails = await fetchSubscribersFromGroup(mailerLiteKey, groupId)
    console.log('[NOTIFY] Found subscribers:', emails.length)

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No subscribers in group.' }, { status: 400 })
    }

    // 2. Build email payload
    const htmlContent = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
        <h2 style="color: #0a0e1a; font-size: 22px; margin-bottom: 16px;">New Stock Alert</h2>
        <p style="font-size: 15px; line-height: 1.6;">Hey there,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          We just added new inventory to Firesale Rubber. Check out the latest overstock and clearance rubber gym flooring before it's gone.
        </p>
        <p style="margin: 28px 0;">
          <a href="https://www.firesalerubber.com"
             style="background: #f0c040; color: #0a0e1a; padding: 14px 28px; text-decoration: none; font-weight: 700; border-radius: 4px; display: inline-block; font-size: 15px;">
            Browse New Stock
          </a>
        </p>
        <p style="font-size: 13px; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          You're receiving this because you subscribed to stock alerts at Firesale Rubber.
        </p>
      </div>
    `

    const subject = 'New stock just dropped at Firesale Rubber'
    const from = `${fromName} <${fromEmail}>`

    // 3. Send individually via Resend so one bad email doesn't block everyone
    const results = { sent: [] as string[], failed: [] as { email: string; reason: string }[] }

    for (const email of emails) {
      console.log(`[NOTIFY] Sending to: ${email}`)

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject,
          html: htmlContent,
        }),
      })

      const resText = await res.text()
      console.log(`[NOTIFY] Response for ${email}:`, res.status, resText)

      if (!res.ok) {
        let reason = resText
        try {
          const parsed = JSON.parse(resText)
          reason = parsed.message || resText
        } catch {
          /* keep raw text */
        }
        results.failed.push({ email, reason })
      } else {
        results.sent.push(email)
      }
    }

    console.log('[NOTIFY] Done — Sent:', results.sent.length, 'Failed:', results.failed.length)

    if (results.sent.length === 0) {
      return NextResponse.json(
        { error: 'All sends failed.', failed: results.failed },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sentCount: results.sent.length,
      failedCount: results.failed.length,
      sent: results.sent,
      failed: results.failed,
    })
  } catch (err) {
    console.error('[NOTIFY] Unhandled exception:', err)
    return NextResponse.json(
      { error: 'Server error. Please try again.', detail: String(err) },
      { status: 500 }
    )
  }
}
