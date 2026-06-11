'use client'

import { useState } from 'react'

export default function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      } else {
        setStatus('success')
        setMessage("You're on the list. We'll notify you when new stock drops.")
        setEmail('')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="subscribe-section">
      <div className="subscribe-inner">
        <h3 className="subscribe-heading">Get notified when new stock drops</h3>
        <p className="subscribe-sub">No spam. Unsubscribe anytime.</p>
        <form className="subscribe-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="subscribe-input"
          />
          <button type="submit" disabled={status === 'loading'} className="subscribe-button">
            {status === 'loading' ? 'Subscribing...' : 'Notify Me'}
          </button>
        </form>
        {message && (
          <p className={`subscribe-message ${status}`}>{message}</p>
        )}
      </div>
    </div>
  )
}
