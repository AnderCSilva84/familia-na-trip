import Badge from '../common/Badge'
import Card from '../common/Card'

function TripCard({ trip }) {
  const backgroundImage = trip.nextStopImage || trip.cover

  return (
    <Card className="overflow-hidden p-0">
      <div
        className="h-40 bg-cover bg-center p-4 text-white"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.12), rgba(15,23,42,0.6)), url(${backgroundImage})`,
        }}
      >
        <Badge tone="success">{trip.dateRange}</Badge>
        <div className="mt-10">
          <p className="text-sm text-white/80">Proxima parada</p>
          <h3 className="text-2xl font-semibold">{trip.nextStop}</h3>
          <p className="text-sm text-white/80">{trip.nextStopTime}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{trip.name}</h3>
            <p className="text-sm text-slate-500">{trip.destination}</p>
          </div>
          <Badge tone="accent">{trip.progress}% pronto</Badge>
        </div>
        <p className="text-sm text-slate-500">{trip.summary}</p>
      </div>
    </Card>
  )
}

export default TripCard
