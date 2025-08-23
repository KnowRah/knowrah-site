'use client'
import { useState } from 'react'

export default function ContactPage() {
  const [state,set]=useState<'idle'|'sending'|'sent'|'error'>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); set('sending')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    // TODO: replace with real endpoint (Resend or Formspree) before launch
    await new Promise(r => setTimeout(r, 800))
    set('sent')
  }

  return (
    <main className="min-h-dvh grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 p-6 rounded-2xl border border-white/10 bg-white/0 backdrop-blur">
        <h1 className="text-3xl font-serif text-primary">Get in touch</h1>
        <input name="name" className="w-full p-3 bg-white/5 rounded-lg" placeholder="Your name" required />
        <input type="email" name="email" className="w-full p-3 bg-white/5 rounded-lg" placeholder="Your email" required />
        <textarea name="message" rows={5} className="w-full p-3 bg-white/5 rounded-lg" placeholder="Your message" required />
        <button disabled={state==='sending' || state==='sent'} className="w-full p-3 rounded-lg border border-light/20 hover:bg-accent hover:text-white transition">
          {state==='sending' ? 'Sending…' : state==='sent' ? 'Sent ✅' : 'Send'}
        </button>
        <p className="text-xs text-light/50">We’ll wire email delivery before going public.</p>
      </form>
    </main>
  )
}
