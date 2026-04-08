import { createBrowserClient } from '@supabase/ssr'

// Client côté navigateur — utilisé dans les pages avec 'use client'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// On exporte aussi une instance directe pour les usages simples
export const supabase = createClient()