import { useMemo, useState } from 'react'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import CatRatingBadge from '../../components/common/CatRatingBadge'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgendaReviews from '../../hooks/useAgendaReviews'
import useAuth from '../../hooks/useAuth'
import { canPromoteAdmins } from '../../utils/permissions'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'

function ReviewsPage() {
  const { userProfile } = useAuth()
  const { reviews, loading, error, usingMockData, toggleLike, addComment, deleteReview } = useAgendaReviews()
  const [visibleCount, setVisibleCount] = useState(5)
  const [selectedReviewId, setSelectedReviewId] = useState('')
  const [commentText, setCommentText] = useState('')
  const [feedback, setFeedback] = useState('')
  const visibleReviews = useMemo(() => reviews.slice(0, visibleCount), [reviews, visibleCount])
  const selectedReview = reviews.find((review) => review.id === selectedReviewId) ?? null
  const canDeleteReviews = canPromoteAdmins(userProfile)

  async function handleLike(reviewId) {
    try {
      setFeedback('')
      await toggleLike(reviewId)
    } catch (likeError) {
      setFeedback(likeError.message ?? 'Nao foi possivel curtir a avaliacao.')
    }
  }

  async function handleComment() {
    if (!selectedReview || !commentText.trim()) {
      return
    }

    try {
      setFeedback('')
      await addComment(selectedReview.id, commentText.trim())
      setCommentText('')
    } catch (commentError) {
      setFeedback(commentError.message ?? 'Nao foi possivel comentar nesta avaliacao.')
    }
  }

  async function handleDelete(reviewId) {
    const confirmed = window.confirm('Excluir esta avaliacao da familia?')

    if (!confirmed) {
      return
    }

    try {
      setFeedback('')
      await deleteReview(reviewId)
      setSelectedReviewId('')
      setCommentText('')
      setFeedback('Avaliacao removida com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel excluir esta avaliacao.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Avaliacoes da familia</h2>
          <p className="text-sm text-slate-500">As ultimas opinioes aparecem aqui e a lista cresce de 5 em 5.</p>
        </div>
        {reviews.length > visibleCount ? (
          <Button variant="secondary" onClick={() => setVisibleCount((count) => count + 5)}>
            Ver mais
          </Button>
        ) : null}
      </div>

      {usingMockData ? <StatusMessage message="Firebase nao configurado. A area de avaliacoes precisa do banco real." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar avaliacoes" description={error} /> : null}
      {!loading && !error && reviews.length === 0 ? (
        <EmptyState title="Nenhuma avaliacao por aqui" description="Quando a familia avaliar os eventos, elas vao aparecer nesta area." />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {visibleReviews.map((review) => {
            const likedByUser = (review.likes ?? []).includes(userProfile.uid)

            return (
              <button
                key={review.id}
                type="button"
                onClick={() => setSelectedReviewId(review.id)}
                className="w-full text-left"
              >
                <Card className="space-y-3 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <Avatar src={review.userAvatar} alt={review.userName} fallback={review.userName?.[0] ?? 'F'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{review.userName}</p>
                          <p className="text-sm text-slate-500">{review.eventTitle}</p>
                        </div>
                        <div className="text-right">
                          <CatRatingBadge rating={review.rating} compact />
                          <p className="mt-2 text-xs text-slate-400">{formatDisplayDate(review.eventDate)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        {review.actualCost > 0 ? <span>Gastou {formatCurrency(review.actualCost)}</span> : null}
                        <span>{review.likes?.length ?? 0} curtida(s)</span>
                        <span>{review.comments?.length ?? 0} comentario(s)</span>
                        {likedByUser ? <span className="text-teal-700">Voce curtiu</span> : null}
                      </div>
                      {review.note ? <p className="mt-2 text-sm text-slate-600">{review.note}</p> : null}
                    </div>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      ) : null}

      {selectedReview ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/35 p-4 backdrop-blur-[2px] lg:items-center lg:justify-center">
          <button type="button" className="absolute inset-0 cursor-default" onClick={() => setSelectedReviewId('')} aria-label="Fechar avaliacao" />
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
              </div>

              {selectedReview.note ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">{selectedReview.note}</div>
              ) : null}

              <div className="flex items-center gap-3">
                <Button variant={(selectedReview.likes ?? []).includes(userProfile.uid) ? 'secondary' : 'primary'} onClick={() => handleLike(selectedReview.id)}>
                  Curtir ({selectedReview.likes?.length ?? 0})
                </Button>
                {canDeleteReviews ? (
                  <Button variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(selectedReview.id)}>
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

              <div className="space-y-3">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Comente nesta avaliacao..."
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setSelectedReviewId('')}>
                    Fechar
                  </Button>
                  <Button className="flex-1" onClick={handleComment}>
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

export default ReviewsPage
