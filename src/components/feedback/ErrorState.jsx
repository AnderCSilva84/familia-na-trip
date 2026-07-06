import Card from '../common/Card'

function ErrorState({ title = 'Algo deu errado', description, action }) {
  return (
    <Card className="border border-rose-100 bg-rose-50/70">
      <h3 className="text-base font-semibold text-rose-700">{title}</h3>
      <p className="mt-2 text-sm text-rose-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  )
}

export default ErrorState
