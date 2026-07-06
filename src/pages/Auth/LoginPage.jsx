import { useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'

const initialForm = {
  name: '',
  email: '',
  password: '',
}

function LoginPage() {
  const navigate = useNavigate()
  const { login, forgotPassword, isAuthenticated, loadingAuth, authError } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  if (!loadingAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const resolvedError = error || authError

  function updateField(field) {
    return (event) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setFeedback('')

    try {
      await login(form.email, form.password)
      setFeedback('Login realizado com sucesso.')

      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError.message ?? 'Nao foi possivel autenticar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setResettingPassword(true)
    setError('')
    setFeedback('')

    try {
      await forgotPassword(form.email)
      setFeedback('Enviamos o link de redefinicao de senha para o seu e-mail.')
    } catch (resetError) {
      setError(resetError.message ?? 'Nao foi possivel enviar o link de redefinicao.')
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,480px)] lg:gap-10">
        <div className="hidden rounded-[36px] bg-[linear-gradient(135deg,#0f766e_0%,#134e4a_48%,#082f49_100%)] p-10 text-white shadow-[0_30px_80px_rgba(15,118,110,0.28)] lg:block">
          <img
            src="/familiaNaTrip.png"
            alt="Familia na Trip"
            className="h-24 w-auto object-contain brightness-0 invert"
          />
          <h1 className="mt-6 text-5xl font-semibold tracking-tight">Sua base da viagem, agora pronta para desktop e celular.</h1>
          <p className="mt-6 max-w-xl text-base text-white/75">
            Organize membros, agenda, gastos e memorias com acesso em tempo real para toda a familia.
          </p>
        </div>

        <Card className="w-full space-y-6 p-6">
          <div className="text-center">
            <div className="mx-auto w-fit rounded-[32px] border border-slate-100 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <img
                src="/familia.png"
                alt="Familia na Trip"
                className="mx-auto h-36 w-36 rounded-[24px] object-cover"
              />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">Entre na sua viagem</h1>
            <p className="mt-2 text-sm text-slate-500">
              Entre com o acesso que foi liberado pelo superadmin para acompanhar a viagem.
            </p>
          </div>

          <StatusMessage message={feedback} tone="success" />
          <StatusMessage message={resolvedError} tone="error" />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="familia@trip.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={form.password}
              onChange={updateField('password')}
              placeholder="Digite sua senha"
              required
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resettingPassword}
                className="text-sm font-medium text-teal-700 transition hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resettingPassword ? 'Enviando link...' : 'Esqueci minha senha'}
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
                icon={<FiArrowRight />}
              >
                {submitting ? 'Processando...' : 'Entrar'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
