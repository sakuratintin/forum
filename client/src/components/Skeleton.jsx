export function SkeletonRows({ count = 4 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton-bar w60" />
          <div className="skeleton-bar w90" />
          <div className="skeleton-bar w30" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-bar w40" />
          <div className="skeleton-bar w90" />
          <div className="skeleton-bar w70" />
        </div>
      ))}
    </div>
  )
}

export default SkeletonRows
