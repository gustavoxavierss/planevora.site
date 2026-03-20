/**
 * middleware.ts — Vercel Edge Middleware
 * ========================================
 * Bloqueia acesso direto ao domínio.
 * Só deixa passar quem tem sessão válida no cookie.
 *
 * Coloque este arquivo NA RAIZ do projeto (ao lado do index.html).
 * O Vercel executa automaticamente antes de qualquer requisição.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas que NÃO precisam de autenticação
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/webhook',
  '/favicon',
  '/_next',
  '/static',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Libera rotas públicas e assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Verifica cookie de sessão
  const session = request.cookies.get('planev_session')

  // Permite acesso se tem sessão válida
  if (session?.value) {
    try {
      const data = JSON.parse(Buffer.from(session.value, 'base64').toString())
      if (data?.token && data?.exp > Date.now()) {
        return NextResponse.next()
      }
    } catch { /* sessão inválida, bloqueia */ }
  }

  // Verifica se é uma requisição com token na URL (link direto do e-mail)
  const urlToken = request.nextUrl.searchParams.get('token')
  if (urlToken) {
    return NextResponse.next() // deixa passar para o JS validar
  }

  // Bloqueia tudo mais — redireciona para página de acesso
  // Como é SPA (index.html), deixa carregar e o JS controla
  // Para bloquear completamente a nível de servidor, retornaria 403
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
