import { useState } from 'react'
import { api, getAuthUser } from '../utils/api.js'
import { toastOk, toastErr } from '../utils/toast.js'

export default function FollowButton({ username, initialFollowing, onChange }) {
  const me = getAuthUser()
  const [following, setFollowing] = useState(!!initialFollowing)
  const [busy, setBusy] = useState(false)

  if (!me || me.username === username) return null

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      const r = await api.post(`/users/${encodeURIComponent(username)}/follow`)
      setFollowing(r.following)
      toastOk(r.following ? '已关注' : '已取消关注')
      if (onChange) onChange(r.following)
    } catch (ex) {
      toastErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-xs ${following ? 'btn-ghost' : 'btn-primary'}`}
      onClick={toggle}
      disabled={busy}
    >
      {following ? '已关注' : '＋ 关注'}
    </button>
  )
}
