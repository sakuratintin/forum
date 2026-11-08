import { useRef, useState } from 'react'
import { api, getAuthUser, setAuthUser, notifyAuthChanged, uploadFile } from '../utils/api.js'
import AvatarCropper from './AvatarCropper.jsx'

function dataUrlToFile(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mime = (meta.match(/data:(.*?);/) || [])[1] || 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new File([arr], 'avatar.jpg', { type: mime })
}

export default function EditProfileModal({ onClose }) {
  const [avatar, setAvatar] = useState(getAuthUser()?.avatar || '')
  const [bio, setBio] = useState(getAuthUser()?.bio || '')
  const [cropFile, setCropFile] = useState(null)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  if (cropFile) {
    return <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(dataUrl) => { setAvatar(dataUrl); setCropFile(null) }} />
  }

  function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('请选择图片文件'); return }
    setErr('')
    setCropFile(file)
  }

  async function onSave() {
    setSaving(true)
    setErr('')
    try {
      let avatarUrl = avatar
      if (avatar && avatar.startsWith('data:')) {
        avatarUrl = await uploadFile(dataUrlToFile(avatar))
      }
      const u = await api.put('/users/me', { avatar: avatarUrl, bio: bio.trim() })
      setAuthUser(u)
      notifyAuthChanged()
      onClose()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">编辑资料</h3>

        <div className="edit-avatar">
          <div className="edit-avatar-preview">
            {avatar ? <img src={avatar} alt="头像" /> : <span className="avatar avatar-lg">{getAuthUser()?.username?.[0] || '我'}</span>}
          </div>
          <div className="edit-avatar-actions">
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>上传头像</button>
            {avatar && <button type="button" className="btn btn-ghost" onClick={() => setAvatar('')}>移除</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
          </div>
        </div>
        {err && <p className="form-error">{err}</p>}

        <label className="field">
          <span className="field-label">简介</span>
          <textarea className="input textarea" rows={3} maxLength={120} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="介绍一下自己…" />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
