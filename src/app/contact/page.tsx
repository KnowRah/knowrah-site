'use client'
import { useState } from 'react'

export default function ContactPage() {
  const [state,set]=useState<'idle'|'sending'|'sent'|'error'>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); set('sending')
    // placeholder send; we’ll wire email later
    await new Promise(r => setTimeout(r, 600))
    set('sent')
  }

  return (
    <main className="container min-h-[70vh] grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-lg space-y-4 p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
        <h1 className="text-4xl font-serif text-primary mb-2">Get in touch</h1>
        <input name="name" className="w-full p-3 bg-white/5 rounded-lg" placeholder="Your name" required />
        <input type="email" name="email" className="w-full p-3 bg-white/5 rounded-lg" placeholder="Your email" required />
        <textarea name="message" rows={6} className="w-full p-3 bg-white/5 rounded-lg" placeholder="Your message" required />
        <button disabled={state!=='idle'} className="btn btn-ghost w-full">
          {state==='sent' ? 'Sent ✅' : state==='sending' ? 'Sending…' : 'Send'}
        </button>
        <p className="text-xs text-light/50">Email delivery will be wired before we go public.</p>
      </form>
    </main>
  )
}
