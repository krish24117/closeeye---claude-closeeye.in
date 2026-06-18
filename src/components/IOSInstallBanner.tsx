import { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'

const STORAGE_KEY = 'closeeye-ios-a2hs-dismissed'

export function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem(STORAGE_KEY) === '1'
    if (isIOS && !isStandalone && !dismissed) setShow(true)
  }, [])

  if (!show) return null

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  return (
    <div className="bg-green-900 text-white text-sm sm:text-base px-12 py-3 flex items-center justify-center text-center relative">
      <p className="leading-snug">
        Add Close Eye to your Home Screen: tap <Share size={14} className="inline -mt-0.5" /> Share, then &quot;Add to Home Screen&quot;.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center hover:opacity-70"
      >
        <X size={16} />
      </button>
    </div>
  )
}
