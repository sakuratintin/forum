import { useEffect, useState } from 'react'
import { api } from '../utils/api.js'

// 通用数据获取钩子：path 变化或调用 reload() 时重新请求
export default function useApi(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.get(path)
      .then((d) => { if (alive) { setData(d); setError('') } })
      .catch((e) => { if (alive) { setData(null); setError(e.message) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [path, tick])

  return { data, loading, error, setData, reload: () => setTick((t) => t + 1) }
}
