import AppImage from '../common/AppImage'
import Card from '../common/Card'

export default function FeatureImageCard({ image, title, description, icon: Icon, tone = 'bg-teal-50 text-teal-700' }) {
  return <Card className="h-full overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="relative h-36 overflow-hidden bg-slate-100">
      <AppImage src={image} alt={title} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" fallbackClassName="h-full w-full" fallbackLabel={title}/>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent"/>
      {Icon ? <div className={`absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${tone}`}><Icon size={20}/></div> : null}
    </div>
    <div className="p-4"><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>
  </Card>
}
