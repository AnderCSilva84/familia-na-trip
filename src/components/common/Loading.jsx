function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="rounded-[28px] bg-white p-4 shadow-[0_18px_40px_rgba(15,118,110,0.14)] ring-1 ring-teal-100">
        <img
          src="/familiaNaTrip.png"
          alt="Familia na Trip"
          className="h-20 w-auto animate-pulse object-contain"
        />
      </div>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
    </div>
  )
}

export default Loading
