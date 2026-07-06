import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useNotifications from '../../hooks/useNotifications'
import useAuth from '../../hooks/useAuth'

function NotificationsPage() {
  const { notifications, unreadCount, loading, error, usingMockData, markAsRead, markAllAsRead } = useNotifications()
  const { userProfile } = useAuth()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Sua caixa interna</h2>
          <p className="text-sm text-slate-500">{unreadCount} nao lida(s)</p>
        </div>
        <Button variant="secondary" onClick={() => markAllAsRead()}>
          Marcar tudo
        </Button>
      </div>

      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo notificacoes mockadas." tone="info" /> : null}
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar notificacoes" description={error} /> : null}
      {!loading && !error && notifications.length === 0 ? <EmptyState title="Nenhuma notificacao por aqui" description="Quando houver novidades da trip, elas vao aparecer nesta tela." /> : null}
      {!loading && !error
        ? notifications.map((notification) => {
            const unread = !(notification.readBy ?? []).includes(userProfile?.uid)
            return (
              <Card key={notification.id} className={`flex items-center gap-3 rounded-[24px] ${unread ? 'border-teal-100 bg-teal-50/60' : ''}`}>
                <Avatar
                  src={notification.avatar}
                  alt={notification.title}
                  fallback={notification.type === 'alarme' ? 'A' : notification.title?.slice(0, 1) ?? 'N'}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                </div>
                {unread ? (
                  <button type="button" onClick={() => markAsRead(notification.id)} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-teal-700 shadow-sm">
                    Ler
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Lida</span>
                )}
              </Card>
            )
          })
        : null}
    </div>
  )
}

export default NotificationsPage
