import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import StatusMessage from '../../components/feedback/StatusMessage'
import usePolls from '../../hooks/usePolls'

function PollFormPage() {
  const navigate = useNavigate()
  const { create, usingMockData } = usePolls()
  const [options, setOptions] = useState(['', ''])
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateOption(index, value) {
    setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function addOption() {
    setOptions((current) => [...current, ''])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')
    try {
      const formData = new FormData(event.currentTarget)
      const question = String(formData.get('question') ?? '')
      const allowMultipleVotes = formData.get('allowMultipleVotes') === 'on'
      const cleanOptions = options.filter(Boolean).map((text, index) => ({ id: `option-${index + 1}`, text }))

      await create({
        question,
        options: cleanOptions,
        votes: {},
        active: true,
        allowMultipleVotes,
      })

      navigate('/polls')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel criar a enquete.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={usingMockData ? 'Modo mock ativo. O formulario serve como fallback visual.' : feedback} tone={usingMockData ? 'info' : 'error'} />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="question" label="Pergunta da enquete" required />
          <div className="space-y-3">
            {options.map((option, index) => (
              <Input key={index} label={`Opcao ${index + 1}`} value={option} onChange={(event) => updateOption(index, event.target.value)} required={index < 2} />
            ))}
            <Button type="button" variant="secondary" className="w-full" onClick={addOption}>
              Adicionar opcao
            </Button>
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" name="allowMultipleVotes" />
            Permitir mais de um voto por usuario
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/polls')}>Cancelar</Button>
            <Button type="submit" disabled={submitting || usingMockData}>{submitting ? 'Salvando...' : 'Criar enquete'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default PollFormPage
