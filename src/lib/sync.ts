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

const CLOUD_URL = 'https://yiluruldxtgfuxqwosri.supabase.co'
const CLOUD_KEY = 'sb_publishable_tHV7NoCAC-3czs4yMG1Z7Q_bg05S1MI'

export function supabaseConfig(): { url: string; key: string } {
  return { url: CLOUD_URL, key: CLOUD_KEY }
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

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error('پاسخ ابر نامعتبر بود')
  }
}

async function authRequest(path: string, body: unknown): Promise<CloudSession> {
  const cfg = supabaseConfig()
  const res = await fetch(`${cfg.url}${path}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await readJson(res)
  const accessToken = typeof json.access_token === 'string' ? json.access_token : ''
  const user = json.user as { id?: string; email?: string } | undefined
  if (!res.ok || !accessToken || !user?.id) {
    const message = json.error_description || json.msg || json.message
    throw new Error(typeof message === 'string' ? message : 'ورود به ابر ناموفق بود')
  }
  return { accessToken, userId: user.id, email: user.email ?? '' }
}

export function signUp(email: string, password: string) {
  return authRequest('/auth/v1/signup', { email, password })
}

export function signIn(email: string, password: string) {
  return authRequest('/auth/v1/token?grant_type=password', { email, password })
}

export async function pushSnapshot<T>(session: CloudSession, snapshot: CloudSnapshot<T>): Promise<void> {
  const cfg = supabaseConfig()
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
  const res = await fetch(`${cfg.url}/rest/v1/snapshots?user_id=eq.${session.userId}&select=updated_at,payload`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${session.accessToken}` },
  })
  if (!res.ok) throw new Error('دریافت از ابر ناموفق بود')
  const rows = (await res.json()) as Array<{ updated_at: string; payload: T }>
  const row = rows[0]
  if (!row) return null
  return { updatedAt: Date.parse(row.updated_at), data: row.payload }
}
