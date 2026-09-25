import { useEffect, useRef } from 'react'
import {
  clearCloudDirty,
  cloudDirty,
  ensureSession,
  onLocalChange,
  pullSnapshot,
  pushSnapshot,
  supabaseConfig,
  withoutSync,
} from '../lib/sync'
import { useExtras } from '../store/Extras'
import { useStore } from '../store/Store'

interface Payload {
  accounts: never[]
  transactions: never[]
  plans: never[]
  items: never[]
  customCategories: unknown
  budgets: unknown
  goals: unknown
  reminders: unknown
  cardVault: unknown
}

export function LiveSync() {
  const store = useStore()
  const extras = useExtras()
  const storeRef = useRef(store)
  const extrasRef = useRef(extras)
  storeRef.current = store
  extrasRef.current = extras

  useEffect(() => {
    let closed = false
    let timer = 0
    let socket: WebSocket | null = null
    let lastSent = 0

    async function snapshot() {
      const current = storeRef.current
      const local = await extrasRef.current.exportLocal()
      return {
        updatedAt: Date.now(),
        data: {
          accounts: current.accounts,
          transactions: current.transactions,
          plans: current.plans,
          items: current.items,
          customCategories: current.customCategories,
          budgets: local.budgets,
          goals: local.goals,
          reminders: local.reminders,
          cardVault: local.cardVault,
        },
      }
    }

    async function pushNow() {
      const session = await ensureSession()
      if (!session || closed) return
      const body = await snapshot()
      lastSent = body.updatedAt
      await pushSnapshot(session, body)
      clearCloudDirty()
    }

    async function applyRemote() {
      const session = await ensureSession()
      if (!session || closed) return
      const remote = await pullSnapshot<Payload>(session)
      if (!remote || remote.updatedAt <= lastSent) return
      lastSent = remote.updatedAt
      const data = remote.data
      await withoutSync(async () => {
        await storeRef.current.importCloud({
          accounts: data.accounts ?? [],
          transactions: data.transactions ?? [],
          plans: data.plans ?? [],
          items: data.items ?? [],
          customCategories: (data.customCategories as never) ?? [],
        })
        await extrasRef.current.importLocal(data as unknown as Record<string, unknown>)
      })
      clearCloudDirty()
    }

    function schedulePush() {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void pushNow().catch(() => undefined)
      }, 350)
    }

    function connect(session: { accessToken: string; userId: string }) {
      const cfg = supabaseConfig()
      const host = new URL(cfg.url).host
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'wss'}://${host}/realtime/v1/websocket?apikey=${encodeURIComponent(cfg.key)}&vsn=1.0.0`)
      socket = ws
      let ref = 0
      const send = (topic: string, event: string, payload: unknown) => {
        ref += 1
        ws.send(JSON.stringify({ topic, event, payload, ref: String(ref) }))
      }
      ws.onopen = () => {
        send(`realtime:snapshots:${session.userId}`, 'phx_join', {
          config: {
            broadcast: { ack: false, self: false },
            presence: { enabled: false },
            postgres_changes: [{ event: '*', schema: 'public', table: 'snapshots', filter: `user_id=eq.${session.userId}` }],
          },
          access_token: session.accessToken,
        })
      }
      ws.onmessage = (message) => {
        const frame = JSON.parse(String(message.data)) as { event?: string }
        if (frame.event === 'postgres_changes') void applyRemote().catch(() => undefined)
      }
      const beat = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) send('phoenix', 'heartbeat', {})
      }, 25000)
      ws.onclose = () => window.clearInterval(beat)
    }

    async function start() {
      const session = await ensureSession()
      if (!session || closed) return
      if (cloudDirty()) await pushNow().catch(() => undefined)
      else await applyRemote().catch(() => undefined)
      connect(session)
    }

    const stopListen = onLocalChange(schedulePush)
    const onSession = () => {
      socket?.close()
      void start()
    }
    window.addEventListener('hy-cloud-session', onSession)
    window.addEventListener('online', schedulePush)
    void start()
    return () => {
      closed = true
      window.clearTimeout(timer)
      stopListen()
      window.removeEventListener('hy-cloud-session', onSession)
      window.removeEventListener('online', schedulePush)
      socket?.close()
    }
  }, [])

  return null
}
