// 任意文件转 data URL：图片压缩，视频等其它类型直接读取
export function fileToDataUrl(file) {
  if (file.type.startsWith('image/')) return fileToImageDataUrl(file, 1000)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}

// 图片压缩：按最大边等比缩放，返回 data URL
export function fileToImageDataUrl(file, max = 800) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * r)
        const h = Math.round(img.height * r)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
