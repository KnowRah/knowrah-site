import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  return res
}
