import { useEffect, useState } from 'react'
import { FiEdit3, FiEye, FiEyeOff, FiHeart, FiPhone, FiShield } from 'react-icons/fi'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useMembers from '../../hooks/useMembers'
import { getMedicalProfile, saveMedicalProfile } from '../../services/medicalProfileService'
import { canEditAnyContent } from '../../utils/permissions'

function MedicalCard({ profile }) {
  return (
    <div
      className="relative mx-auto min-h-[360px] w-full max-w-xl overflow-hidden rounded-[30px] p-6 text-white shadow-[0_24px_60px_rgba(190,24,93,0.28)] sm:aspect-[1.58/1] sm:min-h-0 sm:p-8"
      style={{ background: 'linear-gradient(135deg, #881337 0%, #e11d48 52%, #fb7185 100%)' }}
    >
      <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full border-[28px] border-white/10" />
      <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-white/10" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"><FiHeart size={22} /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-rose-100">Familia na Trip</p><p className="text-sm font-semibold">Cartao de emergencia</p></div>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-center text-rose-700 shadow-sm"><p className="text-[9px] font-bold uppercase">Sangue</p><p className="text-xl font-black leading-none">{profile?.bloodType || '--'}</p></div>
        </div>
        <div>
          <p className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{profile?.fullName || 'Cartao ainda nao preenchido'}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:text-sm">
            <div><p className="text-sm font-extrabold tracking-wide text-white sm:text-base">Alergias</p><p className="mt-0.5 font-medium leading-snug text-rose-50">{profile?.allergies || 'Nenhuma informada'}</p></div>
            <div><p className="text-sm font-extrabold tracking-wide text-white sm:text-base">Medicamentos</p><p className="mt-0.5 font-medium leading-snug text-rose-50">{profile?.medications || 'Nenhum informado'}</p></div>
            <div><p className="text-sm font-extrabold tracking-wide text-white sm:text-base">Plano de saude</p><p className="mt-0.5 font-medium leading-snug text-rose-50">{profile?.healthPlan || 'Nao informado'}</p></div>
            <div><p className="text-sm font-extrabold tracking-wide text-white sm:text-base">Carteirinha</p><p className="mt-0.5 font-medium leading-snug text-rose-50">{profile?.planNumber || 'Nao informada'}</p></div>
            <div><p className="text-sm font-extrabold tracking-wide text-white sm:text-base">Contato de emergencia</p><p className="mt-0.5 font-medium leading-snug text-rose-50">{profile?.emergencyContact || 'Nao informado'}</p></div>
            <div><p className="text-sm font-extrabold tracking-wide text-white sm:text-base">Observacoes</p><p className="mt-0.5 font-medium leading-snug text-rose-50">{profile?.notes || 'Nenhuma observacao'}</p></div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/20 pt-3 text-xs">
          <span className="flex items-center gap-2"><FiShield /> Dados protegidos</span>
          <span className="flex items-center gap-2 font-semibold"><FiPhone /> {profile?.emergencyPhone || 'Sem telefone'}</span>
        </div>
      </div>
    </div>
  )
}

export default function MedicalPage() {
  const { userProfile } = useAuth()
  const { members } = useMembers()
  const admin = canEditAnyContent(userProfile)
  const [selectedUserId, setSelectedUserId] = useState(userProfile.uid)
  const [profile, setProfile] = useState(null)
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let active = true
    getMedicalProfile(selectedUserId).then((data) => { if (active) setProfile(data) }).catch((error) => setFeedback(error.message))
    return () => { active = false }
  }, [selectedUserId])

  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const next = { fullName: String(form.get('fullName')), bloodType: String(form.get('bloodType')), allergies: String(form.get('allergies')), medications: String(form.get('medications')), healthPlan: String(form.get('healthPlan')), planNumber: String(form.get('planNumber')), emergencyContact: String(form.get('emergencyContact')), emergencyPhone: String(form.get('emergencyPhone')), notes: String(form.get('notes')) }
      await saveMedicalProfile(selectedUserId, next)
      setProfile(next); setEditing(false); setFeedback('Cartao medico salvo com sucesso.')
    } catch (error) { setFeedback(error.message ?? 'Nao foi possivel salvar.') }
  }

  return <div className="space-y-4">
    <Card className="border border-rose-100 bg-[linear-gradient(135deg,#fff1f2,#fff)]"><div className="flex gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white"><FiHeart /></div><div><h2 className="font-semibold text-slate-950">Informacoes para emergencia</h2><p className="text-sm text-slate-500">Acesso autenticado e restrito ao titular e administradores da familia.</p></div></div></Card>
    <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
    {admin ? <label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Familiar</span><select value={selectedUserId} onChange={(event) => { setSelectedUserId(event.target.value); setVisible(false); setEditing(false) }} className="rounded-2xl border border-slate-200 px-4 py-3"><option value={userProfile.uid}>Meu cartao</option>{members.filter((member) => member.userId && member.userId !== userProfile.uid).map((member) => <option key={member.id} value={member.userId}>{member.name}</option>)}</select></label> : null}
    {!visible ? <Card className="text-center"><FiEyeOff className="mx-auto text-slate-400" size={32} /><p className="mt-3 text-sm text-slate-500">Os dados medicos estao ocultos nesta tela.</p><Button className="mt-4" icon={<FiEye />} onClick={() => setVisible(true)}>Visualizar cartao</Button></Card> : <><MedicalCard profile={profile} /><div className="flex justify-center gap-2"><Button variant="secondary" icon={<FiEyeOff />} onClick={() => { setVisible(false); setEditing(false) }}>Ocultar</Button><Button icon={<FiEdit3 />} onClick={() => setEditing((value) => !value)}>{editing ? 'Fechar edicao' : 'Editar dados'}</Button></div></>}
    {visible && editing ? <Card><form className="space-y-3" onSubmit={submit}><Input name="fullName" label="Nome completo" defaultValue={profile?.fullName ?? ''} required /><Input name="bloodType" label="Tipo sanguineo" defaultValue={profile?.bloodType ?? ''} /><Input name="allergies" label="Alergias" defaultValue={profile?.allergies ?? ''} /><Input name="medications" label="Medicamentos de uso continuo" defaultValue={profile?.medications ?? ''} /><Input name="healthPlan" label="Plano de saude" defaultValue={profile?.healthPlan ?? ''} /><Input name="planNumber" label="Numero da carteirinha" defaultValue={profile?.planNumber ?? ''} /><div className="grid grid-cols-2 gap-3"><Input name="emergencyContact" label="Contato" defaultValue={profile?.emergencyContact ?? ''} /><Input name="emergencyPhone" label="Telefone" type="tel" defaultValue={profile?.emergencyPhone ?? ''} /></div><Input name="notes" label="Observacoes importantes" defaultValue={profile?.notes ?? ''} /><Button type="submit" className="w-full">Salvar cartao medico</Button></form></Card> : null}
  </div>
}
