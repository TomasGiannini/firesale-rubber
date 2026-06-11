import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.MAILERLITE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const fromEmail = process.env.MAILERLITE_FROM_EMAIL || 'tomasjgiannini@gmail.com'
    const fromName = process.env.MAILERLITE_FROM_NAME || 'Firesale Rubber'
    const groupId = process.env.MAILERLITE_GROUP_ID

    // 1. Create campaign draft
    const campaignBody: Record<string, unknown> = {
      name: `New Stock Alert - ${new Date().toLocaleDateString('en-CA')}`,
      type: 'regular',
      language_id: 21,
      emails: [
        {
          subject: 'New stock just dropped at Firesale Rubber',
          from: fromEmail,
          from_name: fromName,
        },
      ],
    }

    if (groupId) {
      campaignBody.groups = [groupId]
    }

    const campaignRes = await fetch('https://connect.mailerlite.com/api/campaigns', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(campaignBody),
    })

    if (!campaignRes.ok) {
      const data = await campaignRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: data.message || 'Failed to create campaign.' },
        { status: 400 }
      )
    }

    const campaignData = await campaignRes.json()
    const campaignId = campaignData.data.id

    // 2. Set campaign content
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
          You're receiving this because you subscribed to stock alerts at Firesale Rubber.<br/>
          <a href="{$unsubscribe}" style="color: #888;">Unsubscribe</a>
        </p>
      </div>
    `

    const contentRes = await fetch(
      `https://connect.mailerlite.com/api/campaigns/${campaignId}/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          plain: 'New stock just dropped at Firesale Rubber. Browse now: https://www.firesalerubber.com',
        }),
      }
    )

    if (!contentRes.ok) {
      const data = await contentRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: data.message || 'Failed to set campaign content.' },
        { status: 400 }
      )
    }

    // 3. Send campaign
    const sendRes = await fetch(
      `https://connect.mailerlite.com/api/campaigns/${campaignId}/actions/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    )

    if (!sendRes.ok) {
      const data = await sendRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: data.message || 'Failed to send campaign.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, campaignId })
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
