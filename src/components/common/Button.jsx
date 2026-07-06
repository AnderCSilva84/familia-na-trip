function Button({
  children,
  variant = 'primary',
  className = '',
  icon,
  as: Component = 'button',
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'bg-teal-700 text-white shadow-[0_18px_30px_rgba(15,118,110,0.24)] hover:bg-teal-800',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    ghost: 'bg-transparent text-teal-700 hover:bg-teal-50',
  }

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {icon ? <span>{icon}</span> : null}
      {children}
    </Component>
  )
}

export default Button
