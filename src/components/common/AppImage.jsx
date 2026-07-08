import { useState } from 'react'

function AppImageInner({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallbackLabel = 'Imagem',
  loading = 'lazy',
  decoding = 'async',
  ...props
}) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-[linear-gradient(135deg,#f1f5f9_0%,#ffffff_100%)] text-center text-xs font-medium text-slate-400 ${fallbackClassName}`}
      >
        {fallbackLabel}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}

function AppImage(props) {
  return <AppImageInner key={props.src || 'image-fallback'} {...props} />
}

export default AppImage
