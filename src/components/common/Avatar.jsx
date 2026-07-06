function Avatar({ src, alt, size = 'md', fallback = '?' }) {
  const sizes = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }

  return src ? (
    <img
      src={src}
      alt={alt}
      className={`rounded-full object-cover ring-2 ring-white shadow ${sizes[size]}`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700 ${sizes[size]}`}
    >
      {fallback}
    </div>
  )
}

export default Avatar
