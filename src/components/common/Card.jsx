function Card({ children, className = '' }) {
  return (
    <section
      className={`rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}
    >
      {children}
    </section>
  )
}

export default Card
