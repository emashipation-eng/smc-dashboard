import { useState, ReactNode } from 'react'
import { usePin } from '../../contexts/PinContext'

export default function PinGate({ children }: { children: ReactNode }) {
  const { isUnlocked, unlock } = usePin()
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  if (isUnlocked) return <>{children}</>

  async function handleDigit(d: string) {
    const next = digits + d
    setDigits(next)
    setError(false)
    if (next.length === 4) {
      const ok = await unlock(next)
      if (!ok) {
        setError(true)
        setShake(true)
        setDigits('')
        setTimeout(() => setShake(false), 500)
      }
    }
  }

  function handleClear() { setDigits(''); setError(false) }

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 gap-6">
      <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">Settings PIN</p>

      {/* Dots */}
      <div className={`flex gap-3 ${shake ? 'animate-bounce' : ''}`}>
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < digits.length ? 'bg-brand border-brand' : 'border-gray-300'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm">Incorrect PIN — try again</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {PAD.map((key, idx) => {
          if (!key) return <div key={idx} />
          return (
            <button
              key={key}
              onClick={() => key === '⌫' ? handleClear() : handleDigit(key)}
              className="w-16 h-16 rounded-xl bg-white border border-gray-200 text-gray-700 text-xl font-medium hover:bg-gray-50 active:bg-gray-100 shadow-sm transition-colors"
            >
              {key}
            </button>
          )
        })}
      </div>

      <p className="text-gray-400 text-xs mt-2">Default PIN: 1234</p>
    </div>
  )
}
