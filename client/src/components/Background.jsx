import { useMemo } from 'react'

// 固定背景层：发光网格 + 上升粒子流
export default function Background() {
  const particles = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && (window.matchMedia('(max-width: 768px)').matches || (navigator.maxTouchPoints || 0) > 0)
    const count = isMobile ? 10 : 24
    return Array.from({ length: count }, () => {
      const dur = 8 + Math.random() * 14
      return {
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        dur,
        delay: -Math.random() * dur,
        opacity: 0.3 + Math.random() * 0.5,
      }
    })
  }, [])

  return (
    <div className="bg-fx" aria-hidden="true">
      <div className="bg-grid" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="bg-particle"
          style={{
            left: `${p.left}%`,
            top: '100%',
            width: p.size,
            height: p.size,
            '--o': p.opacity,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
