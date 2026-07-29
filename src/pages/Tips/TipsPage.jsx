import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import TipCard from '../../components/cards/TipCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useTips from '../../hooks/useTips'
import { canCreateContent, canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

function TipsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { tips, loading, error, usingMockData, delete: remove } = useTips()
  const [category, setCategory] = useState('Todos')
  const [feedback, setFeedback] = useState('')
  const categories = useMemo(() => ['Todos', ...new Set(tips.map((tip) => tip.category || 'Outros'))], [tips])
  const filteredTips = category === 'Todos' ? tips : tips.filter((tip) => tip.category === category)

  async function handleDelete(tipId) {
    if (!window.confirm('Tem certeza que deseja excluir esta dica?')) return
    try {
      await remove(tipId)
      setFeedback('Dica removida com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover a dica.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-xs font-semibold ${category === item ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {item}
            </button>
          ))}
        </div>
        {canCreateContent(userProfile) ? <Button onClick={() => navigate('/tips/new')}>Nova dica</Button> : null}
      </div>
      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo dicas mockadas." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar dicas" description={error} /> : null}
      {!loading && !error && filteredTips.length === 0 ? <EmptyState title="Nenhuma dica encontrada" description="Adicione dicas de restaurantes, passeios e economia para a familia." /> : null}
      {!loading && !error
        ? filteredTips.map((tip) => {
            const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, tip)
            const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, tip)
            return (
              <TipCard
                key={tip.id}
                tip={tip}
                canManage={canManage || canDelete}
                onEdit={canManage ? () => navigate(`/tips/${tip.id}/edit`) : undefined}
                onDelete={canDelete ? () => handleDelete(tip.id) : undefined}
              />
            )
          })
        : null}
    </div>
  )
}

export default TipsPage
