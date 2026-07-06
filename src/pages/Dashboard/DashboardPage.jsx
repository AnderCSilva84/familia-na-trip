import { useEffect, useMemo, useState } from 'react'
import {
  FiBell,
  FiBookOpen,
  FiCheckCircle,
  FiCalendar,
  FiCreditCard,
  FiHeart,
  FiMapPin,
  FiShield,
  FiUpload,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import CatRatingBadge from '../../components/common/CatRatingBadge'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import useAgenda from '../../hooks/useAgenda'
import useAgendaReviews from '../../hooks/useAgendaReviews'
import useAlarms from '../../hooks/useAlarms'
import useAuth from '../../hooks/useAuth'
import useDiary from '../../hooks/useDiary'
import useExpenses from '../../hooks/useExpenses'
import useHotels from '../../hooks/useHotels'
import useMembers from '../../hooks/useMembers'
import useNotifications from '../../hooks/useNotifications'
import usePolls from '../../hooks/usePolls'
import useVehicles from '../../hooks/useVehicles'
import { getCatRatingMeta } from '../../utils/catRating'
import {
  canEditAnyContent,
  canImportExpenses,
  canManageMembers,
  canPromoteAdmins,
} from '../../utils/permissions'
import {
  formatCurrency,
  formatDisplayDate,
  formatDisplayDateShort,
  normalizeDisplayTime,
} from '../../utils/formatters'

const shortcuts = [
  { to: '/map', label: 'Mapa', icon: FiMapPin },
  { to: '/itinerary', label: 'Roteiro', icon: FiCalendar },
  { to: '/diary', label: 'Diario', icon: FiBookOpen },
  { to: '/expenses', label: 'Gastos', icon: FiCreditCard },
  { to: '/members', label: 'Membros', icon: FiUsers },
  { to: '/emergency', label: 'Emergencia', icon: FiHeart },
]

const TRIP_COUNTDOWN_TARGET = '2026-07-18T00:00:00-03:00'

function DashboardPage() {
  const navigate = useNavigate()
  const { userProfile, currentUser, trip } = useAuth()
  const { members } = useMembers()
  const { entries } = useDiary()
  const { summary } = useExpenses()
  const { hotels } = useHotels()
  const { vehicles } = useVehicles()
  const { agenda, update: updateAgenda } = useAgenda()
  const { reviews, saveReview, toggleLike, addComment, deleteReview } = useAgendaReviews()
  const { alarms } = useAlarms()
  const { polls } = usePolls()
  const { notifications, unreadCount } = useNotifications()
  const displayName = userProfile?.name ?? currentUser?.displayName ?? currentUser?.email ?? 'viajante'
  const nextEvent = agenda[0]
  const recentEntries = entries.slice(0, 2)
  const activePolls = polls.filter((poll) => poll.active)
  const activeAlarms = alarms.filter((alarm) => alarm.active)
  const totalBudget = Number(trip?.totalBudget ?? 0)
  const remainingBudget = totalBudget - summary.totalActual
  const heroImage = '/familia.png'
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [planningOpen, setPlanningOpen] = useState(false)
  const [planningActualCost, setPlanningActualCost] = useState('')
  const [planningCatRating, setPlanningCatRating] = useState(0)
  const [planningNote, setPlanningNote] = useState('')
  const [planningSubmitting, setPlanningSubmitting] = useState(false)
  const [planningFeedback, setPlanningFeedback] = useState('')
  const [selectedReviewId, setSelectedReviewId] = useState('')
  const [reviewCommentText, setReviewCommentText] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [countdownNow, setCountdownNow] = useState(() => Date.now())
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null
  const selectedReview = reviews.find((review) => review.id === selectedReviewId) ?? null
  const canManageSelectedMember = canManageMembers(userProfile)
  const canManageEventCosts = canEditAnyContent(userProfile)
  const canDeleteReviews = canPromoteAdmins(userProfile)
  const latestReviews = reviews.slice(0, 3)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  function openMemberProfile(member) {
    setSelectedMemberId(member.id)
  }

  function closeMemberProfile() {
    setSelectedMemberId('')
  }

  function openPlanningCard() {
    if (!nextEvent) {
      return
    }

    setPlanningActualCost(
      nextEvent.actualCost ? String(nextEvent.actualCost).replace('.', ',') : '',
    )
    setPlanningCatRating(Number(nextEvent.catRating ?? 0))
    setPlanningNote('')
    setPlanningFeedback('')
    setPlanningOpen(true)
  }

  function closePlanningCard() {
    setPlanningOpen(false)
    setPlanningFeedback('')
  }

  function getMemberBadgeTone(roleInTrip) {
    if (roleInTrip === 'superadmin') {
      return 'accent'
    }

    if (roleInTrip === 'admin') {
      return 'success'
    }

    return 'neutral'
  }

  const nextEventDateRange = useMemo(() => {
    if (!nextEvent?.date) {
      return 'Sem data definida'
    }

    const start = nextEvent.date
    const end = trip?.endDate

    if (!end || String(end) < String(start)) {
      return formatDisplayDateShort(start)
    }

    return `${formatDisplayDateShort(start)} ate ${formatDisplayDateShort(end)}`
  }, [nextEvent?.date, trip?.endDate])

  const planningCatsLabel =
    planningCatRating > 0
      ? getCatRatingMeta(planningCatRating)?.description ?? `${planningCatRating} gatinhos`
      : 'Sem avaliacao ainda'

  const tripCountdown = useMemo(() => {
    const targetTime = new Date(TRIP_COUNTDOWN_TARGET).getTime()
    const diff = Math.max(0, targetTime - countdownNow)
    const totalMinutes = Math.floor(diff / 60_000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60

    return {
      isStarted: diff === 0,
      days,
      hours,
      minutes,
    }
  }, [countdownNow])

  async function handlePlanningSave() {
    if (!nextEvent || !canManageEventCosts) {
      return
    }

    setPlanningSubmitting(true)
    setPlanningFeedback('')

    try {
      const normalizedActualCost = Number(
        String(planningActualCost ?? '')
          .replace(/\./g, '')
          .replace(',', '.'),
      ) || 0

      await updateAgenda(nextEvent.id, {
        ...nextEvent,
        actualCost: normalizedActualCost,
        catRating: planningCatRating,
      })
      await saveReview(nextEvent, {
        actualCost: normalizedActualCost,
        rating: planningCatRating,
        note: planningNote.trim(),
      })

      setPlanningFeedback('Planejamento atualizado com sucesso.')
    } catch (error) {
      setPlanningFeedback(error.message ?? 'Nao foi possivel atualizar o planejamento.')
    } finally {
      setPlanningSubmitting(false)
    }
  }

  async function handleReviewLike(reviewId) {
    try {
      setReviewFeedback('')
      await toggleLike(reviewId)
    } catch (error) {
      setReviewFeedback(error.message ?? 'Nao foi possivel curtir esta avaliacao.')
    }
  }

  async function handleReviewComment() {
    if (!selectedReview || !reviewCommentText.trim()) {
      return
    }

    try {
      setReviewFeedback('')
      await addComment(selectedReview.id, reviewCommentText.trim())
      setReviewCommentText('')
    } catch (error) {
      setReviewFeedback(error.message ?? 'Nao foi possivel comentar nesta avaliacao.')
    }
  }

  async function handleDeleteReview(reviewId) {
    const confirmed = window.confirm('Excluir esta avaliacao da familia?')

    if (!confirmed) {
      return
    }

    try {
      setReviewFeedback('')
      await deleteReview(reviewId)
      setSelectedReviewId('')
      setReviewCommentText('')
      setReviewFeedback('Avaliacao removida com sucesso.')
    } catch (error) {
      setReviewFeedback(error.message ?? 'Nao foi possivel excluir esta avaliacao.')
    }
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(236,254,255,0.78)_0%,rgba(248,250,252,0.68)_55%,rgba(255,255,255,0.56)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.10),transparent_26%)]" />
        <div className="relative min-h-[220px] p-6 lg:min-h-[260px] lg:p-8">
          <div className="max-w-2xl rounded-[28px] bg-white/40 p-4 shadow-[0_18px_40px_rgba(15,118,110,0.10)] backdrop-blur-[2px] lg:p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]">
              Ola, {displayName}!
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-amber-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.32)] lg:text-3xl">
              Tudo pronto para a proxima parada?
            </h2>
            <div className="summer-countdown summer-countdown__card mt-4 rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,247,214,0.92)_0%,rgba(255,250,233,0.84)_22%,rgba(240,253,250,0.78)_100%)] p-4 shadow-[0_18px_34px_rgba(245,158,11,0.16)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                    Contagem para 18/07/2026
                  </p>
                  <p className="mt-1 max-w-md text-sm text-slate-600">
                    {tripCountdown.isStarted ? 'A viagem comecou.' : 'Nosso verao em familia esta chegando.'}
                  </p>
                </div>
                <Badge tone="accent">
                  {tripCountdown.isStarted ? 'chegou o dia' : 'partiu viagem'}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'dias', value: tripCountdown.days },
                  { label: 'horas', value: tripCountdown.hours },
                  { label: 'min', value: tripCountdown.minutes },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="summer-countdown__tile rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.72)_100%)] px-3 py-4 text-center shadow-[0_14px_28px_rgba(15,23,42,0.08)] backdrop-blur-sm"
                  >
                    <p className="bg-[linear-gradient(180deg,#0f172a_0%,#0f766e_100%)] bg-clip-text text-3xl font-semibold tracking-tight text-transparent lg:text-4xl">
                      {String(item.value).padStart(2, '0')}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-700/90">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.85)]" />
                Clima de viagem ativado
              </div>
            </div>
          </div>
        </div>
      </Card>

      {canPromoteAdmins(userProfile) || canImportExpenses(userProfile) ? (
        <Card className="space-y-4 border border-teal-100 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_85%)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white">
              <FiShield size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Painel Superadmin</h3>
              <p className="mt-1 text-sm text-slate-500">
                Seus atalhos para importar a planilha oficial e gerenciar acessos do aplicativo.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {canImportExpenses(userProfile) ? (
              <Link
                to="/expenses/import"
                className="rounded-3xl bg-white p-4 shadow-sm transition hover:bg-teal-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <FiUpload size={18} />
                </div>
                <p className="mt-3 font-semibold text-slate-900">Importar planilha</p>
                <p className="mt-1 text-sm text-slate-500">Migrar agenda, custos estimados e orcamento.</p>
              </Link>
            ) : null}

            <Link
              to="/admin"
              className="rounded-3xl bg-white p-4 shadow-sm transition hover:bg-teal-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <FiShield size={18} />
              </div>
              <p className="mt-3 font-semibold text-slate-900">Painel admin</p>
              <p className="mt-1 text-sm text-slate-500">Exportar backup e acompanhar a operacao da viagem.</p>
            </Link>

            <Link
              to="/members"
              className="rounded-3xl bg-white p-4 shadow-sm transition hover:bg-teal-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <FiUsers size={18} />
              </div>
              <p className="mt-3 font-semibold text-slate-900">Gerenciar usuarios</p>
              <p className="mt-1 text-sm text-slate-500">Organizar acessos, promover admins e acompanhar membros.</p>
            </Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Proximo evento</h3>
          <Link to="/agenda" className="text-sm font-semibold text-teal-700">Ver agenda</Link>
        </div>
        {nextEvent ? (
          <button
            type="button"
            onClick={openPlanningCard}
            className="mt-4 block w-full overflow-hidden rounded-[28px] border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="h-40 bg-cover bg-center p-4 text-white"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.12), rgba(15,23,42,0.6)), url(${
                  nextEvent.image || trip?.coverImage || trip?.cover || '/familia.png'
                })`,
              }}
            >
              <Badge tone="success">{nextEventDateRange}</Badge>
              <div className="mt-10">
                <p className="text-sm text-white/80">Proxima parada</p>
                <h4 className="text-2xl font-semibold">{nextEvent.title}</h4>
                <p className="text-sm text-white/80">{formatDisplayDate(nextEvent.date)}</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{nextEvent.city || nextEvent.location || 'Local da viagem'}</p>
                </div>
                <Badge tone="accent">
                  {nextEvent.actualCost > 0 ? 'concluido' : 'planejado'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {nextEvent.estimatedCost > 0 ? (
                  <span>Estimado: {formatCurrency(nextEvent.estimatedCost)}</span>
                ) : null}
                {nextEvent.actualCost > 0 ? (
                  <span className="font-medium text-teal-700">Gasto: {formatCurrency(nextEvent.actualCost)}</span>
                ) : null}
                {nextEvent.catRating > 0 ? <CatRatingBadge rating={nextEvent.catRating} compact /> : null}
              </div>
              <p className="text-sm text-teal-700">
                {canManageEventCosts ? 'Toque para avaliar e concluir o gasto' : 'Toque para ver o planejamento'}
              </p>
            </div>
          </button>
        ) : (
          <div className="mt-4"><EmptyState title="Sem proximo evento" description="Crie itens na agenda para acompanhar a viagem." /></div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Acesso rapido</h3>
          <Link to="/settings" className="text-sm font-semibold text-teal-700">
            Ver menu
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="rounded-3xl bg-slate-50 p-4 text-center transition hover:bg-teal-50">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                <Icon size={18} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">{label}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Avaliacoes da familia</h3>
            <p className="text-sm text-slate-500">As ultimas 3 ficam aqui sem poluir o dashboard.</p>
          </div>
          <Link to="/reviews" className="text-sm font-semibold text-teal-700">
            Ver mais
          </Link>
        </div>

        {latestReviews.length === 0 ? (
          <EmptyState title="Nenhuma avaliacao ainda" description="Quando a familia salvar os gatinhos dos eventos, elas aparecem aqui." />
        ) : (
          <div className="space-y-3">
            {latestReviews.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => {
                  setSelectedReviewId(review.id)
                  setReviewCommentText('')
                  setReviewFeedback('')
                }}
                className="w-full text-left"
              >
                <div className="rounded-3xl bg-slate-50 p-4 transition hover:bg-teal-50">
                  <div className="flex items-start gap-3">
                    <Avatar src={review.userAvatar} alt={review.userName} fallback={review.userName?.[0] ?? 'F'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{review.userName}</p>
                          <p className="text-sm text-slate-500">{review.eventTitle}</p>
                        </div>
                        <div className="text-right">
                          <CatRatingBadge rating={review.rating} compact />
                          {review.actualCost > 0 ? (
                            <p className="text-xs text-slate-400">{formatCurrency(review.actualCost)}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                        <span>{formatDisplayDate(review.eventDate)}</span>
                        <span>{review.likes?.length ?? 0} curtida(s)</span>
                        <span>{review.comments?.length ?? 0} comentario(s)</span>
                      </div>
                      {review.note ? <p className="mt-2 text-sm text-slate-600">{review.note}</p> : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card>
          <p className="text-sm text-slate-500">Gastos efetivados</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(summary.totalActual)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Saldo restante</p>
          <p className={`mt-2 text-xl font-semibold ${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-950'}`}>
            {formatCurrency(remainingBudget)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Reservas ativas</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{hotels.length + vehicles.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Alarmes ativos</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{activeAlarms.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Enquetes abertas</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{activePolls.length}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Membros conectados</h3>
          <Link to="/members" className="text-sm font-semibold text-teal-700">
            Ver todos
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => openMemberProfile(member)}
                className="rounded-full transition hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-teal-100"
                aria-label={`Abrir perfil de ${member.name}`}
              >
                <Avatar src={member.avatar} alt={member.name} fallback={member.name?.[0] ?? 'M'} />
              </button>
            ))}
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {members.slice(0, 4).map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => openMemberProfile(member)}
                className="rounded-3xl bg-slate-50 p-4 text-left transition hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
              >
                <p className="font-semibold text-slate-950">{member.name}</p>
                <p className="mt-1 text-sm text-slate-500">{member.email || 'Sem e-mail cadastrado'}</p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Atividades recentes</h3>
          <Link to="/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
            <FiBell size={14} />
            {unreadCount} nao lida(s)
          </Link>
        </div>
        <div className="mt-4 space-y-4">
          {recentEntries.map((entry) => (
            <div key={entry.id} className="flex gap-3 rounded-3xl bg-slate-50 p-3">
              <img
                src={entry.photos?.[0]?.url ?? entry.image}
                alt={entry.title}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{formatDisplayDate(entry.date)}</p>
                <h4 className="mt-1 text-sm font-semibold text-slate-900">{entry.title}</h4>
                <p className="mt-1 text-sm text-slate-500">{entry.content ?? entry.excerpt}</p>
              </div>
            </div>
          ))}
          {recentEntries.length === 0 && notifications[0] ? (
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{notifications[0].title}</p>
              <p className="mt-1 text-sm text-slate-500">{notifications[0].message}</p>
            </div>
          ) : null}
        </div>
      </Card>

      {selectedMember ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/35 p-4 backdrop-blur-[2px] lg:items-center lg:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeMemberProfile}
            aria-label="Fechar mini perfil"
          />
          <div className="relative z-10 w-full max-w-lg">
            <Card className="space-y-5 rounded-[32px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    size="lg"
                    fallback={selectedMember.name?.[0] ?? 'M'}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{selectedMember.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedMember.email || 'Sem e-mail cadastrado'}
                    </p>
                    <div className="mt-3">
                      <Badge tone={getMemberBadgeTone(selectedMember.roleInTrip)}>
                        {selectedMember.roleInTrip || 'member'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMemberProfile}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Fechar"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Papel na viagem</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedMember.roleInTrip || 'member'}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {selectedMember.active === false ? 'Inativo' : 'Ativo'}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_100%)] p-4">
                <p className="text-sm text-slate-500">Resumo</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {selectedMember.name} participa desta viagem e pode acompanhar agenda, mapa, diario,
                  gastos e reservas conforme as permissoes do app.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={closeMemberProfile}>
                  Fechar
                </Button>
                {canManageSelectedMember ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      closeMemberProfile()
                      navigate(`/members/manage/${selectedMember.id}`)
                    }}
                  >
                    Editar cadastro
                  </Button>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {planningOpen && nextEvent ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/35 p-4 backdrop-blur-[2px] lg:items-center lg:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closePlanningCard}
            aria-label="Fechar planejamento"
          />
          <div className="relative z-10 w-full max-w-xl">
            <Card className="space-y-5 rounded-[32px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                    Planejamento
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{nextEvent.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDisplayDate(nextEvent.date)}{nextEvent.startTime ? ` - ${normalizeDisplayTime(nextEvent.startTime)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePlanningCard}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Fechar"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Planejado para este evento</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {nextEvent.description || nextEvent.local || 'Sem detalhes adicionais'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>{nextEvent.city || nextEvent.location || 'Sem local'}</span>
                  {nextEvent.estimatedCost > 0 ? (
                    <span>Estimado: {formatCurrency(nextEvent.estimatedCost)}</span>
                  ) : null}
                  {nextEvent.actualCost > 0 ? (
                    <span className="font-medium text-teal-700">Gasto: {formatCurrency(nextEvent.actualCost)}</span>
                  ) : null}
                </div>
              </div>

              {canManageEventCosts ? (
                <>
                  <Input
                    label="Quanto voce gastou"
                    type="text"
                    value={planningActualCost}
                    onChange={(event) => setPlanningActualCost(event.target.value)}
                    placeholder="Ex: 120,50"
                  />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700">Avaliacao com gatinhos</p>
                      <span className="text-sm text-slate-500">{planningCatsLabel}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={`cat-rate-${value}`}
                          type="button"
                          onClick={() => setPlanningCatRating(value)}
                          className={`rounded-2xl border px-2 py-3 text-center transition ${
                            value === planningCatRating
                              ? 'border-teal-500 ring-4 ring-teal-100'
                              : 'border-slate-200 hover:border-slate-300'
                          } ${getCatRatingMeta(value)?.className ?? 'bg-slate-50 text-slate-800'}`}
                        >
                          <span className="block text-2xl">{getCatRatingMeta(value)?.emoji ?? '🐱'}</span>
                          <span className="mt-1 block text-[11px] font-semibold">
                            {value} gato{value > 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    <span>Como foi esse momento?</span>
                    <textarea
                      value={planningNote}
                      onChange={(event) => setPlanningNote(event.target.value)}
                      placeholder="Conte rapidinho como foi esse evento para a familia..."
                      className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    />
                  </label>
                </>
              ) : (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                  Somente admin e superadmin podem registrar o gasto real e concluir este evento.
                </div>
              )}

              {planningFeedback ? (
                <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-700">
                  {planningFeedback}
                </div>
              ) : null}

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={closePlanningCard}>
                  Fechar
                </Button>
                {canManageEventCosts ? (
                  <Button className="flex-1" onClick={handlePlanningSave} disabled={planningSubmitting}>
                    {planningSubmitting ? 'Salvando...' : 'Concluir com gasto'}
                  </Button>
                ) : null}
              </div>

              {nextEvent.estimatedCost > 0 || nextEvent.actualCost > 0 || nextEvent.catRating > 0 ? (
                <div className="rounded-3xl bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_100%)] p-4">
                  <div className="flex items-center gap-2 text-teal-700">
                    <FiCheckCircle size={16} />
                    <p className="text-sm font-semibold">
                      {nextEvent.actualCost > 0 ? 'Evento concluido' : 'Resumo do planejamento'}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {nextEvent.estimatedCost > 0 ? (
                      <span>Estimado: {formatCurrency(nextEvent.estimatedCost)}</span>
                    ) : null}
                    {nextEvent.actualCost > 0 ? <span>Gasto: {formatCurrency(nextEvent.actualCost)}</span> : null}
                    {nextEvent.catRating > 0 ? <CatRatingBadge rating={nextEvent.catRating} compact /> : null}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}

      {selectedReview ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/35 p-4 backdrop-blur-[2px] lg:items-center lg:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedReviewId('')}
            aria-label="Fechar avaliacao"
          />
          <div className="relative z-10 w-full max-w-xl">
            <Card className="space-y-5 rounded-[32px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-start gap-3">
                <Avatar src={selectedReview.userAvatar} alt={selectedReview.userName} fallback={selectedReview.userName?.[0] ?? 'F'} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-950">{selectedReview.userName}</h3>
                  <p className="text-sm text-slate-500">{selectedReview.eventTitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <CatRatingBadge rating={selectedReview.rating} />
                    <span>{formatDisplayDate(selectedReview.eventDate)}</span>
                    {selectedReview.actualCost > 0 ? <span>{formatCurrency(selectedReview.actualCost)}</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReviewId('')}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Fechar"
                >
                  <FiX size={18} />
                </button>
              </div>

              {selectedReview.note ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">{selectedReview.note}</div>
              ) : null}

              <div className="flex items-center gap-3">
                <Button
                  variant={(selectedReview.likes ?? []).includes(userProfile.uid) ? 'secondary' : 'primary'}
                  onClick={() => handleReviewLike(selectedReview.id)}
                >
                  Curtir ({selectedReview.likes?.length ?? 0})
                </Button>
                {canDeleteReviews ? (
                  <Button
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDeleteReview(selectedReview.id)}
                  >
                    Excluir avaliacao
                  </Button>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Comentarios</p>
                {(selectedReview.comments ?? []).length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-500">
                    Ainda nao ha comentarios nesta avaliacao.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedReview.comments.map((comment) => (
                      <div key={comment.id} className="rounded-3xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={comment.userAvatar} alt={comment.userName} fallback={comment.userName?.[0] ?? 'F'} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{comment.userName}</p>
                            <p className="text-xs text-slate-400">{formatDisplayDate(comment.createdAt)}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {reviewFeedback ? (
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{reviewFeedback}</div>
              ) : null}

              <div className="space-y-3">
                <textarea
                  value={reviewCommentText}
                  onChange={(event) => setReviewCommentText(event.target.value)}
                  placeholder="Escreva um comentario nesta avaliacao..."
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setSelectedReviewId('')}>
                    Fechar
                  </Button>
                  <Button className="flex-1" onClick={handleReviewComment}>
                    Comentar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DashboardPage
