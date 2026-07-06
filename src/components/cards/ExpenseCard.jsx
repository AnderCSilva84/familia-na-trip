import Card from '../common/Card'
import { formatCurrency } from '../../utils/formatters'

function ExpenseCard({ title, value, percentage }) {
  return (
    <Card className="h-full">
      <div className="flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-slate-950">
            {formatCurrency(value)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Percentual</p>
          <p className="mt-1 text-lg font-semibold text-teal-700">{percentage}%</p>
        </div>
      </div>
    </Card>
  )
}

export default ExpenseCard
