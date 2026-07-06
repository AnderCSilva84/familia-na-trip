function Input({ label, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
      {label ? <span>{label}</span> : null}
      <input
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${className}`}
        {...props}
      />
    </label>
  )
}

export default Input
