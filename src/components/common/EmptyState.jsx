import Card from './Card'

function EmptyState({ title, description }) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
        ✨
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Card>
  )
}

export default EmptyState
