import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export default function LeafletSizeInvalidator() {
  const map = useMap()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const invalidate = () => {
      map.invalidateSize({ pan: false, animate: false })
    }

    let animationFrame = null
    const scheduleInvalidate = () => {
      if (animationFrame != null) {
        window.cancelAnimationFrame(animationFrame)
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        invalidate()
      })
    }

    const timers = [
      window.setTimeout(invalidate, 0),
      window.setTimeout(invalidate, 150),
      window.setTimeout(invalidate, 450),
    ]

    window.addEventListener('resize', scheduleInvalidate)

    const container = map.getContainer()
    let observer = null
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(scheduleInvalidate)
      observer.observe(container)
      if (container.parentElement) {
        observer.observe(container.parentElement)
      }
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener('resize', scheduleInvalidate)
      if (animationFrame != null) {
        window.cancelAnimationFrame(animationFrame)
      }
      observer?.disconnect()
    }
  }, [map])

  return null
}
