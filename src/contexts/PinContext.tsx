import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

const PIN_HASH_KEY = 'smc_pin_hash'
const DEFAULT_PIN = '1234'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function initDefaultPin() {
  if (!localStorage.getItem(PIN_HASH_KEY)) {
    const hash = await sha256(DEFAULT_PIN)
    localStorage.setItem(PIN_HASH_KEY, hash)
  }
}
initDefaultPin()

interface PinContextValue {
  isUnlocked: boolean
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  changePin: (newPin: string) => Promise<void>
}

const PinContext = createContext<PinContextValue | null>(null)

export function PinProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_HASH_KEY) ?? ''
    const hash = await sha256(pin)
    if (hash === stored) { setIsUnlocked(true); return true }
    return false
  }, [])

  const lock = useCallback(() => setIsUnlocked(false), [])

  const changePin = useCallback(async (newPin: string) => {
    const hash = await sha256(newPin)
    localStorage.setItem(PIN_HASH_KEY, hash)
  }, [])

  return (
    <PinContext.Provider value={{ isUnlocked, unlock, lock, changePin }}>
      {children}
    </PinContext.Provider>
  )
}

export function usePin() {
  const ctx = useContext(PinContext)
  if (!ctx) throw new Error('usePin must be used within PinProvider')
  return ctx
}
