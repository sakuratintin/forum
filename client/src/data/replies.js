// 模拟回复数据（后端接入后替换为真实接口）
const POOL = [
  { author: '路过的网友', content: '说得有道理，学到了，感谢分享。' },
  { author: '热心市民', content: '顶一下，这个问题我也一直想知道答案。' },
  { author: '吃瓜群众', content: '围观一下，楼主写得挺详细的。' },
  { author: '路人甲', content: '感谢分享，已经收藏了！' },
  { author: '小板凳', content: '同问，蹲一个靠谱的答案。' },
  { author: '真相帝', content: '补充一点：其实还可以从这个角度再优化一下。' },
  { author: '潜水党', content: '哈哈哈哈哈，看到这个我笑了。' },
  { author: '过来人', content: '亲身经历，确实和楼主说的一样。' },
]

export function getReplies(postId, count) {
  const n = Math.max(2, Math.min(count, 6))
  return Array.from({ length: n }, (_, i) => {
    const p = POOL[(postId + i * 3) % POOL.length]
    return {
      id: `${postId}-r${i + 1}`,
      floor: i + 1,
      author: p.author,
      time: `2026-11-0${((postId + i) % 7) + 1}`,
      content: p.content,
    }
  })
}
