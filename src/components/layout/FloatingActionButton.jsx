import { FiPlus } from 'react-icons/fi'

function FloatingActionButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="safe-bottom fixed bottom-8 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_20px_50px_rgba(15,118,110,0.35)] transition hover:scale-105 lg:bottom-10 lg:left-auto lg:right-10 lg:translate-x-0"
      aria-label="Nova acao"
    >
      <FiPlus size={26} />
    </button>
  )
}

export default FloatingActionButton
