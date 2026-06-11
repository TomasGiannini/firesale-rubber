import { NextRequest, NextResponse } from 'next/server'

async function deleteCampaign(apiKey: string, campaignId: string) {
  try {
    await fetch(`https://connect.mailerlite.com/api/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    })
  } catch {
    /* ignore cleanup errors */
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.MAILERLITE_API_KEY
    if (!apiKey) {
      console.error('[NOTIFY] MAILERLITE_API_KEY missing')
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const fromEmail = process.env.MAILERLITE_FROM_EMAIL || 'tomasjgiannini@gmail.com'
    const fromName = process.env.MAILERLITE_FROM_NAME || 'Firesale Rubber'
    const groupId = process.env.MAILERLITE_GROUP_ID

    const campaignName = `New Stock Alert - ${new Date().toLocaleDateString('en-CA')}`

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

    // 1. Create campaign draft with content included
    const campaignBody: Record<string, unknown> = {
      name: campaignName,
      type: 'regular',
      emails: [
        {
          subject: 'New stock just dropped at Firesale Rubber',
          from: fromEmail,
          from_name: fromName,
          content: htmlContent,
        },
      ],
    }

    if (groupId) {
      campaignBody.groups = [String(groupId)]
    }

    console.log('[NOTIFY] Step 1 — Creating campaign. Body:', JSON.stringify(campaignBody, null, 2))

    const campaignRes = await fetch('https://connect.mailerlite.com/api/campaigns', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(campaignBody),
    })

    const campaignText = await campaignRes.text()
    console.log('[NOTIFY] Step 1 — Response status:', campaignRes.status)
    console.log('[NOTIFY] Step 1 — Raw response:', campaignText)

    if (!campaignRes.ok) {
      let data
      try { data = JSON.parse(campaignText) } catch { data = {} }
      return NextResponse.json(
        {
          step: 'create_campaign',
          status: campaignRes.status,
          error: data.message || 'Failed to create campaign.',
          fullResponse: data,
        },
        { status: 400 }
      )
    }

    // Extract campaign ID from raw text to avoid JS integer precision loss
    const idMatch = campaignText.match(/"id"\s*:\s*"?(\d+)"?/)
    const campaignId = idMatch ? idMatch[1] : null

    if (!campaignId) {
      console.error('[NOTIFY] Could not extract campaign ID from raw response:', campaignText)
      return NextResponse.json(
        {
          step: 'extract_campaign_id',
          error: 'Campaign created but no ID found in response.',
          rawResponse: campaignText,
        },
        { status: 500 }
      )
    }

    console.log('[NOTIFY] Step 1 — Campaign ID:', campaignId)

    // 2. Send campaign (new API uses /send, not /actions/send)
    const sendUrl = `https://connect.mailerlite.com/api/campaigns/${campaignId}/send`
    console.log('[NOTIFY] Step 2 — Sending campaign. URL:', sendUrl)

    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    const sendText = await sendRes.text()
    console.log('[NOTIFY] Step 2 — Response status:', sendRes.status)
    console.log('[NOTIFY] Step 2 — Raw response:', sendText)

    if (!sendRes.ok) {
      let data
      try { data = JSON.parse(sendText) } catch { data = {} }
      await deleteCampaign(apiKey, campaignId)
      return NextResponse.json(
        {
          step: 'send_campaign',
          status: sendRes.status,
          campaignId,
          error: data.message || 'Failed to send campaign.',
          fullResponse: data,
        },
        { status: 400 }
      )
    }

    console.log('[NOTIFY] Success — Campaign sent. ID:', campaignId)
    await deleteCampaign(apiKey, campaignId)
    console.log('[NOTIFY] Campaign deleted after send. ID:', campaignId)
    return NextResponse.json({ success: true, campaignId })
  } catch (err) {
    console.error('[NOTIFY] Unhandled exception:', err)
    return NextResponse.json(
      { error: 'Server error. Please try again.', detail: String(err) },
      { status: 500 }
    )
  }
}
