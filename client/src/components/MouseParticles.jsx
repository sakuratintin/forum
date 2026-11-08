import { useEffect, useRef } from 'react'

// 跟随鼠标的动态粒子网络（canvas 实现，无外部依赖）
// 触屏设备不启用：既没有鼠标跟随，又会持续占用 CPU 导致输入法/滚动卡顿
export default function MouseParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (typeof window === 'undefined') return
    const isTouch = window.matchMedia('(hover: none)').matches || (navigator.maxTouchPoints || 0) > 0
    if (isTouch) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    let particles = []
    const mouse = { x: -9999, y: -9999, active: false }
    const COLORS = ['#22d3ee', '#7dd3fc', '#3b82f6', '#00e5ff']

    function spawn() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1 + Math.random() * 1.8,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(70, Math.floor((w * h) / 26000))
      particles = Array.from({ length: count }, spawn)
    }

    const LINK_DIST = 110
    const MOUSE_DIST = 190

    function step() {
      ctx.clearRect(0, 0, w, h)

      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 44)
        g.addColorStop(0, 'rgba(0,229,255,0.22)')
        g.addColorStop(1, 'rgba(0,229,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 44, 0, Math.PI * 2)
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        if (mouse.active) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const d2 = dx * dx + dy * dy
          if (d2 < MOUSE_DIST * MOUSE_DIST && d2 > 1) {
            const d = Math.sqrt(d2)
            const f = (MOUSE_DIST - d) / MOUSE_DIST
            p.vx += (dx / d) * f * 0.06
            p.vy += (dy / d) * f * 0.06
          }
        }

        p.vx *= 0.98
        p.vy *= 0.98
        p.vx += (Math.random() - 0.5) * 0.05
        p.vy += (Math.random() - 0.5) * 0.05
        p.x += p.vx
        p.y += p.vy

        if (p.x < -20) p.x = w + 20
        else if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        else if (p.y > h + 20) p.y = -20

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const d2 = dx * dx + dy * dy
          if (d2 < LINK_DIST * LINK_DIST) {
            const a = (1 - Math.sqrt(d2) / LINK_DIST) * 0.28
            ctx.strokeStyle = `rgba(34, 211, 238, ${a})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }

        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < MOUSE_DIST * MOUSE_DIST) {
            const a = (1 - Math.sqrt(d2) / MOUSE_DIST) * 0.45
            ctx.strokeStyle = `rgba(125, 211, 252, ${a})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.stroke()
          }
        }

        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(step)
    }

    function onMove(e) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    function onLeave() {
      mouse.active = false
      mouse.x = -9999
      mouse.y = -9999
    }
    // 页面隐藏时暂停渲染，省电
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf) {
        step()
      }
    }

    resize()
    step()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="mouse-particles" aria-hidden="true" />
}
