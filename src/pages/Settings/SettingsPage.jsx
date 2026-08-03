import { useEffect, useRef, useState } from 'react'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAlarms from '../../hooks/useAlarms'
import useAuth from '../../hooks/useAuth'
import useNotifications from '../../hooks/useNotifications'
import { changeCurrentUserPassword, syncCurrentAuthProfile } from '../../services/authService'
import { syncMemberProfile } from '../../services/memberService'
import { updateTrip, uploadTripMenuImage } from '../../services/tripService'
import { updateUserProfile, uploadUserProfilePhoto } from '../../services/userService'
import useAppStore from '../../store/useAppStore'
import { Link } from 'react-router-dom'
import { canPromoteAdmins, getUserRoleLabel } from '../../utils/permissions'
import { menuImageOptions } from '../../utils/menuImages'
function SettingsPage() {
  const { currentUser, userProfile, trip, logout } = useAuth()
  const { alarms } = useAlarms()
  const { unreadCount } = useNotifications()
  const setUserProfile = useAppStore((state) => state.setUserProfile)
  const setTrip = useAppStore((state) => state.setTrip)
  const [feedback, setFeedback] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('success')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingTrip, setSavingTrip] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const previewUrlRef = useRef('')
  const avatarSource = userProfile?.photoURL ?? currentUser?.photoURL ?? ''
  const displayName = userProfile?.name ?? currentUser?.displayName ?? 'Usuario'
  const resolvedAvatar = selectedPhoto ? photoPreview : avatarSource
  const resolvedRole = getUserRoleLabel(userProfile)
  const todayString = new Date().toISOString().slice(0, 10)
  const pendingAlarmCount = alarms.filter((alarm) => {
    if (!alarm?.active) {
      return false
    }

    const alarmDate = String(alarm.date ?? '').slice(0, 10)
    return !alarmDate || alarmDate >= todayString
  }).length

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  function handlePhotoChange(event) {
    const nextFile = event.target.files?.[0] ?? null

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    if (!nextFile) {
      setSelectedPhoto(null)
      setPhotoPreview('')
      return
    }

    if (!String(nextFile.type ?? '').startsWith('image/')) {
      event.target.value = ''
      setSelectedPhoto(null)
      setPhotoPreview('')
      setFeedbackTone('error')
      setFeedback('Escolha um arquivo de imagem valido.')
      return
    }

    if (nextFile.size > 15 * 1024 * 1024) {
      event.target.value = ''
      setSelectedPhoto(null)
      setPhotoPreview('')
      setFeedbackTone('error')
      setFeedback('A foto deve ter no maximo 15 MB. Reduza a imagem e tente novamente.')
      return
    }

    setSelectedPhoto(nextFile)
    setFeedback('')
    const objectUrl = URL.createObjectURL(nextFile)
    previewUrlRef.current = objectUrl
    setPhotoPreview(objectUrl)
  }

  async function handleLogout() {
    try {
      await logout()
      setFeedbackTone('success')
      setFeedback('Sessao encerrada com sucesso.')
    } catch (error) {
      setFeedbackTone('error')
      setFeedback(error.message ?? 'Nao foi possivel sair.')
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setSavingProfile(true)
    setFeedbackTone('success')
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      let memberSyncFailed = false
      let photoPayload = {
        photoURL: userProfile?.photoURL ?? '',
        photoPath: userProfile?.photoPath ?? '',
      }

      if (selectedPhoto) {
        photoPayload = await uploadUserProfilePhoto(
          userProfile.uid,
          selectedPhoto,
          userProfile?.photoPath ?? '',
        )
      }

      const nextProfile = await updateUserProfile(userProfile.uid, {
        name: String(formData.get('name') ?? ''),
        photoURL: photoPayload.photoURL,
        photoPath: photoPayload.photoPath,
      })

      await syncCurrentAuthProfile({
        name: nextProfile?.name ?? displayName,
        photoURL: nextProfile?.photoURL ?? '',
      })

      try {
        await syncMemberProfile(
          userProfile.uid,
          {
            name: nextProfile?.name ?? displayName,
            avatar: nextProfile?.photoURL ?? '',
          },
          userProfile?.email ?? currentUser?.email ?? '',
        )
      } catch (syncMemberError) {
        console.warn('Falha ao sincronizar perfil do membro na viagem.', syncMemberError)
        memberSyncFailed = true
        setFeedbackTone('info')
        setFeedback('Perfil atualizado. A viagem ainda vai sincronizar sua foto e nome para os outros membros.')
      }

      setUserProfile(nextProfile)
      setSelectedPhoto(null)
      setPhotoPreview('')
      if (!memberSyncFailed) {
        setFeedbackTone('success')
        setFeedback('Perfil atualizado com sucesso.')
      }
    } catch (error) {
      setFeedbackTone('error')
      setFeedback(error.message ?? 'Nao foi possivel atualizar o perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleTripSubmit(event) {
    event.preventDefault()
    setSavingTrip(true)
    setFeedbackTone('success')
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const menuImages = { ...(trip?.menuImages ?? {}) }
      if (canPromoteAdmins(userProfile)) {
        for (const option of menuImageOptions) {
          const selectedFile = formData.get(`menuFile_${option.key}`)
          const urlValue = String(formData.get(`menuImage_${option.key}`) ?? '').trim()
          menuImages[option.key] = selectedFile instanceof File && selectedFile.size > 0
            ? await uploadTripMenuImage(trip.id, option.key, selectedFile)
            : urlValue
        }
      }
      const nextTrip = await updateTrip(trip.id, {
        coverImage: String(formData.get('coverImage') ?? ''),
        nextStopImage: String(formData.get('nextStopImage') ?? ''),
        menuImages,
      })
      setTrip(nextTrip)
      setFeedback('Imagens da viagem atualizadas com sucesso.')
    } catch (error) {
      setFeedbackTone('error')
      setFeedback(error.message ?? 'Nao foi possivel atualizar a viagem.')
    } finally {
      setSavingTrip(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setSavingPassword(true)
    setFeedbackTone('success')
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const currentPassword = String(formData.get('currentPassword') ?? '')
      const newPassword = String(formData.get('newPassword') ?? '')
      const confirmPassword = String(formData.get('confirmPassword') ?? '')

      if (!currentPassword) {
        throw new Error('Informe sua senha atual para confirmar a troca.')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('A confirmacao da nova senha nao confere.')
      }

      await changeCurrentUserPassword(currentPassword, newPassword)
      event.currentTarget.reset()
      setFeedback('Senha atualizada com sucesso.')
    } catch (error) {
      setFeedbackTone('error')
      setFeedback(error.message ?? 'Nao foi possivel atualizar a senha.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={feedback} tone={feedbackTone} />

      <Card className="flex items-center gap-4">
        <Avatar src={resolvedAvatar} alt={displayName} size="lg" fallback={displayName.slice(0, 1)} />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{displayName}</h2>
          <p className="text-sm text-slate-500">{userProfile?.email ?? currentUser?.email}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            Perfil: {resolvedRole}
          </p>
        </div>
      </Card>

      {canPromoteAdmins(userProfile) ? (
        <Card className="space-y-4 border border-teal-100 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_85%)]">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Acessos do superadmin</h3>
            <p className="mt-1 text-sm text-slate-500">
              Se voce entrou com `acs@acs.com`, estes atalhos sao o ponto principal para administrar o app.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/admin"
              className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
            >
              <p className="font-semibold text-slate-900">Painel admin</p>
              <p className="mt-1 text-slate-500">Exportar backup, acompanhar membros conectados e centralizar a operacao.</p>
            </Link>
            <Link
              to="/members"
              className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
            >
              <p className="font-semibold text-slate-900">Gerenciar acessos</p>
              <p className="mt-1 text-slate-500">Promover admins, editar membros e manter os acessos da viagem.</p>
            </Link>
            <Link
              to="/emergency"
              className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
            >
              <p className="font-semibold text-slate-900">Emergencia</p>
              <p className="mt-1 text-slate-500">Hospitais infantis e adultos para abrir rapido no mapa.</p>
            </Link>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-slate-950">Atalhos da viagem</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/trips" className="rounded-3xl bg-teal-50 p-4 text-sm text-teal-800 shadow-sm transition hover:bg-teal-100">
            <p className="font-semibold">Nossas viagens</p>
            <p className="mt-1 text-teal-700">Escolha outra trip ou consulte o histórico da família.</p>
          </Link>
          <Link to="/gallery" className="rounded-3xl bg-teal-50 p-4 text-sm text-teal-800 shadow-sm transition hover:bg-teal-100">
            <p className="font-semibold">Galeria da família</p>
            <p className="mt-1 text-teal-700">Veja as fotos reunidas de todas as viagens.</p>
          </Link>
          <Link to="/travel-history" className="rounded-3xl bg-teal-50 p-4 text-sm text-teal-800 shadow-sm transition hover:bg-teal-100">
            <p className="font-semibold">Mapa da família</p>
            <p className="mt-1 text-teal-700">Cidades e estados que a família já visitou.</p>
          </Link>
          <Link to="/distances" className="rounded-3xl bg-teal-50 p-4 text-sm text-teal-800 shadow-sm transition hover:bg-teal-100">
            <p className="font-semibold">Distâncias da viagem</p>
            <p className="mt-1 text-teal-700">Quilômetros percorridos de avião, carro e andando.</p>
          </Link>
          <Link
            to="/today"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Hoje</p>
            <p className="mt-1 text-slate-500">Agenda, documentos e pendencias essenciais do dia.</p>
          </Link>
          <Link
            to="/notifications"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">Notificacoes</p>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-slate-500">Caixa interna com atualizacoes da viagem.</p>
          </Link>
          <Link
            to="/alarms"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">Alarmes</p>
              {pendingAlarmCount > 0 ? (
                <span className="rounded-full bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
                  {pendingAlarmCount > 9 ? '9+' : pendingAlarmCount}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-slate-500">Lembretes ativos e proximos avisos da viagem.</p>
          </Link>
          <Link
            to="/wallet"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Carteira</p>
            <p className="mt-1 text-slate-500">PDFs de reservas, check-ins, passagens e outros documentos.</p>
          </Link>
          <Link
            to="/hotels"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Hospedagens</p>
            <p className="mt-1 text-slate-500">Reservas, periodos de estadia e sincronizacao com a agenda.</p>
          </Link>
          <Link
            to="/checklist"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Checklist e malas</p>
            <p className="mt-1 text-slate-500">Divida preparativos e confira as malas de toda a familia.</p>
          </Link>
          <Link
            to="/attractions"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Pontos turisticos</p>
            <p className="mt-1 text-slate-500">Organize os lugares que a familia quer conhecer e marque os visitados.</p>
          </Link>
          <Link
            to="/souvenirs"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-amber-50"
          >
            <p className="font-semibold text-slate-900">Lista de lembrancas</p>
            <p className="mt-1 text-slate-500">Anote o presente, para quem foi e marque quando estiver entregue.</p>
          </Link>
          <Link
            to="/emergency"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Emergencia</p>
            <p className="mt-1 text-slate-500">Hospitais, pronto-atendimento e apoio rapido no mapa.</p>
          </Link>
          <Link
            to="/medical"
            className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm transition hover:bg-rose-50"
          >
            <p className="font-semibold text-slate-900">Cartao medico</p>
            <p className="mt-1 text-slate-500">Alergias, medicamentos, plano e contato de emergencia.</p>
          </Link>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Perfil visual</h3>
          <p className="mt-1 text-sm text-slate-500">
            Atualize o nome e a foto de perfil. No celular voce pode escolher a imagem direto da galeria.
          </p>
        </div>
        <form className="space-y-3" onSubmit={handleProfileSubmit}>
          <div className="flex justify-center pb-2">
            <Avatar src={resolvedAvatar} alt={displayName} size="xl" fallback={displayName.slice(0, 1)} />
          </div>
          <Input name="name" label="Nome" defaultValue={displayName} required />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Foto de perfil</span>
            <input
              name="photoFile"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <Button type="submit" className="w-full" disabled={savingProfile}>
            {savingProfile ? 'Salvando perfil...' : 'Salvar perfil'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Sessao e seguranca</h3>
          <p className="mt-1 text-sm text-slate-500">
            Auth com persistencia local, protecao de rotas e perfil sincronizado no Firestore.
          </p>
        </div>
        <form className="space-y-3" onSubmit={handlePasswordSubmit}>
          <Input
            name="currentPassword"
            label="Senha atual"
            type="password"
            placeholder="Digite sua senha atual"
            required
          />
          <Input
            name="newPassword"
            label="Nova senha"
            type="password"
            placeholder="Minimo de 6 caracteres"
            required
          />
          <Input
            name="confirmPassword"
            label="Confirmar nova senha"
            type="password"
            placeholder="Repita a nova senha"
            required
          />
          <Button type="submit" className="w-full" disabled={savingPassword}>
            {savingPassword ? 'Atualizando senha...' : 'Alterar senha'}
          </Button>
        </form>
        <Button className="w-full" onClick={handleLogout}>
          Sair da conta
        </Button>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-slate-950">Dados da viagem</h3>
        <form className="space-y-3" onSubmit={handleTripSubmit}>
          <Input name="coverImage" label="Foto principal da viagem (URL)" defaultValue={trip?.coverImage ?? ''} />
          <Input name="nextStopImage" label="Foto da proxima parada (URL)" defaultValue={trip?.nextStopImage ?? ''} />
          {canPromoteAdmins(userProfile) ? <div className="space-y-4 rounded-3xl border border-teal-100 bg-teal-50/50 p-4">
            <div><h4 className="font-semibold text-slate-950">Imagens dos menus</h4><p className="mt-1 text-sm text-slate-500">Configuração exclusiva do superadmin. Escolha uma foto ou informe uma URL para cada janela.</p></div>
            <div className="grid gap-4 lg:grid-cols-2">{menuImageOptions.map((option) => {
              const currentImage = trip?.menuImages?.[option.key] || option.fallback
              return <div key={option.key} className="overflow-hidden rounded-3xl bg-white shadow-sm"><img src={currentImage} alt={option.label} className="h-32 w-full object-cover"/><div className="space-y-3 p-4"><p className="font-semibold text-slate-900">{option.label}</p><Input name={`menuImage_${option.key}`} label="URL da imagem" defaultValue={trip?.menuImages?.[option.key] ?? ''}/><label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Ou escolher da galeria</span><input name={`menuFile_${option.key}`} type="file" accept="image/*" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700"/></label></div></div>
            })}</div>
          </div> : null}
          <Button type="submit" className="w-full" disabled={savingTrip || !trip?.id}>
            {savingTrip ? 'Salvando viagem...' : 'Salvar imagens da viagem'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default SettingsPage
