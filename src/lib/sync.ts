export interface CloudSession {
  accessToken: string
  userId: string
  email: string
}

export interface CloudSnapshot<T> {
  updatedAt: number
  data: T
}

const SESSION_KEY = 'hy-cloud-session'

const CONFIG_KEY = 'hy-supabase-config'

export function loadSupabaseConfig(): { url: string; key: string } | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { url?: string; key?: string }
    if (!parsed.url?.trim() || !parsed.key?.trim()) return null
    return { url: parsed.url.trim().replace(/\/$/, ''), key: parsed.key.trim() }
  } catch {
    return null
  }
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
}

export function supabaseConfig(): { url: string; key: string } | null {
  const stored = loadSupabaseConfig()
  if (stored) return stored
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

export function loadSession(): CloudSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as CloudSession) : null
  } catch {
    return null
  }
}

export function saveSession(session: CloudSession | null) {
  if (!session) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

async function authRequest(path: string, body: unknown): Promise<CloudSession> {
  const cfg = supabaseConfig()
  if (!cfg) throw new Error('نشانی Supabase تنظیم نشده است')
  const res = await fetch(`${cfg.url}${path}`, {
    method: 'POST',
    headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { access_token?: string; user?: { id: string; email?: string }; msg?: string; error_description?: string; message?: string }
  if (!res.ok || !json.access_token || !json.user?.id) {
    throw new Error(json.error_description || json.msg || json.message || 'ورود به ابر ناموفق بود')
  }
  return { accessToken: json.access_token, userId: json.user.id, email: json.user.email ?? '' }
}

export function signUp(email: string, password: string) {
  return authRequest('/auth/v1/signup', { email, password })
}

export function signIn(email: string, password: string) {
  return authRequest('/auth/v1/token?grant_type=password', { email, password })
}

export async function pushSnapshot<T>(session: CloudSession, snapshot: CloudSnapshot<T>): Promise<void> {
  const cfg = supabaseConfig()
  if (!cfg) throw new Error('نشانی Supabase تنظیم نشده است')
  const res = await fetch(`${cfg.url}/rest/v1/snapshots`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: session.userId, updated_at: new Date(snapshot.updatedAt).toISOString(), payload: snapshot.data }),
  })
  if (!res.ok) throw new Error('ارسال به ابر ناموفق بود')
}

export async function pullSnapshot<T>(session: CloudSession): Promise<CloudSnapshot<T> | null> {
  const cfg = supabaseConfig()
  if (!cfg) throw new Error('نشانی Supabase تنظیم نشده است')
  const res = await fetch(`${cfg.url}/rest/v1/snapshots?user_id=eq.${session.userId}&select=updated_at,payload`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${session.accessToken}` },
  })
  if (!res.ok) throw new Error('دریافت از ابر ناموفق بود')
  const rows = (await res.json()) as Array<{ updated_at: string; payload: T }>
  const row = rows[0]
  if (!row) return null
  return { updatedAt: Date.parse(row.updated_at), data: row.payload }
}
