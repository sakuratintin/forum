import { useEffect } from 'react'

const BASE = 'H.C.T. Forum'

export default function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE
  }, [title])
}
