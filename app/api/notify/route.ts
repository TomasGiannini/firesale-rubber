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
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.MAILERLITE_FROM_NAME || 'Firesale Rubber'

    if (!mailerLiteKey || !resendKey) {
      return NextResponse.json({ error: 'Missing API keys.' }, { status: 500 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Missing MailerLite group ID.' }, { status: 500 })
    }

    // 1. Fetch subscribers from MailerLite group
    console.log('[NOTIFY] Fetching subscribers from group:', groupId)
    const allEmails = await fetchSubscribersFromGroup(mailerLiteKey, groupId)
    console.log('[NOTIFY] Found subscribers:', allEmails.length)

    // Filter out test domains that Resend blocks
    const blockedDomains = ['example.com', 'test.com', 'localhost']
    const emails = allEmails.filter((email) => {
      const domain = email.split('@')[1]?.toLowerCase()
      return domain && !blockedDomains.includes(domain)
    })

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No valid subscribers in group.' }, { status: 400 })
    }

    console.log('[NOTIFY] Valid subscribers after filtering:', emails.length)

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

    // 3. Send via Resend batch API (max 100 per batch)
    const batchSize = 100
    let sentCount = 0

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchPayload = batch.map((email) => ({
        from,
        to: [email],
        subject,
        html: htmlContent,
      }))

      console.log(`[NOTIFY] Sending batch ${Math.floor(i / batchSize) + 1} (${batch.length} emails)`)

      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      })

      const resText = await res.text()
      console.log(`[NOTIFY] Batch response:`, res.status, resText)

      if (!res.ok) {
        return NextResponse.json(
          {
            error: `Failed to send batch ${Math.floor(i / batchSize) + 1}.`,
            detail: resText,
          },
          { status: 500 }
        )
      }

      sentCount += batch.length
    }

    console.log('[NOTIFY] Success — Sent to', sentCount, 'subscribers')
    return NextResponse.json({ success: true, sentCount })
  } catch (err) {
    console.error('[NOTIFY] Unhandled exception:', err)
    return NextResponse.json(
      { error: 'Server error. Please try again.', detail: String(err) },
      { status: 500 }
    )
  }
}
