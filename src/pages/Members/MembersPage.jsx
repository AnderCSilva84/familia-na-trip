import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import MemberCard from '../../components/cards/MemberCard'
import Card from '../../components/common/Card'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useMembers from '../../hooks/useMembers'
import { canDeleteMembers, canManageMembers, canPromoteAdmins } from '../../utils/permissions'
import { createManagedUserAccount } from '../../services/authService'
import { createUserProfile, getUserProfileByEmail, updateUserRole } from '../../services/userService'

function MembersPage() {
  const navigate = useNavigate()
  const { userProfile, trip } = useAuth()
  const { members, loading, error, createMember, deleteMember, updateMember, usingMockData } = useMembers()
  const [feedback, setFeedback] = useState('')
  const [promotingUser, setPromotingUser] = useState(false)
  const [creatingAccess, setCreatingAccess] = useState(false)

  async function handleDelete(memberId) {
    try {
      await deleteMember(memberId)
      setFeedback('Membro removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o membro.')
    }
  }

  async function handlePromoteSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setPromotingUser(true)
    setFeedback('')

    try {
      const formData = new FormData(formElement)
      const email = String(formData.get('email') ?? '')
      const role = String(formData.get('role') ?? 'admin')
      const profile = await getUserProfileByEmail(email)

      if (!profile) {
        throw new Error('Nenhum usuario encontrado com esse e-mail.')
      }

      await updateUserRole(profile.uid, role)
      formElement.reset()
      setFeedback(`Perfil atualizado para ${role} com sucesso.`)
    } catch (promoteError) {
      setFeedback(promoteError.message ?? 'Nao foi possivel atualizar o perfil do usuario.')
    } finally {
      setPromotingUser(false)
    }
  }

  async function handleCreateAccessSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setCreatingAccess(true)
    setFeedback('')

    try {
      if (!trip?.id) {
        throw new Error('A viagem principal ainda nao foi carregada.')
      }

      const formData = new FormData(formElement)
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim().toLowerCase()
      const password = String(formData.get('password') ?? '')
      const role = String(formData.get('role') ?? 'member')

      if (password.length < 6) {
        throw new Error('A senha temporaria precisa ter pelo menos 6 caracteres.')
      }

      const existingProfile = await getUserProfileByEmail(email)

      if (existingProfile) {
        throw new Error('Ja existe um acesso criado com esse e-mail.')
      }

      const createdUser = await createManagedUserAccount({
        name,
        email,
        password,
      })

      await createUserProfile(createdUser, {
        name,
        email,
        role,
        active: true,
      })

      const existingMember = members.find(
        (member) => String(member.email ?? '').trim().toLowerCase() === email,
      )

      if (existingMember) {
        await updateMember(existingMember.id, {
          userId: createdUser.uid,
          name,
          email,
          roleInTrip: role,
          active: true,
        })
      } else {
        await createMember({
          userId: createdUser.uid,
          name,
          email,
          roleInTrip: role,
          avatar: '',
          active: true,
        })
      }

      formElement.reset()
      setFeedback(`Acesso criado com sucesso para ${email}. A pessoa ja pode entrar com a senha temporaria informada.`)
    } catch (createError) {
      setFeedback(createError.message ?? 'Nao foi possivel criar o acesso do usuario.')
    } finally {
      setCreatingAccess(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_80%)]">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Gerenciar acessos</h2>
          <p className="mt-1 text-sm text-slate-500">
            O superadmin controla os acessos do app e organiza quem participa desta viagem.
          </p>
        </div>
        {canManageMembers(userProfile) ? (
          <Button icon={<FiPlus />} className="shrink-0" onClick={() => navigate('/members/manage')}>
            Novo membro
          </Button>
        ) : null}
      </Card>

      {usingMockData ? (
        <StatusMessage
          message="Firebase nao configurado. Exibindo membros mockados apenas para referencia visual."
          tone="info"
        />
      ) : null}

      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar membros" description={error} /> : null}

      {canPromoteAdmins(userProfile) ? (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Criar acesso no aplicativo</h3>
            <p className="mt-1 text-sm text-slate-500">
              O superadmin cria o login com senha temporaria e o usuario entra normalmente pela tela inicial.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleCreateAccessSubmit}>
            <Input name="name" label="Nome do usuario" placeholder="Ex: Maria da familia" required />
            <Input name="email" label="E-mail do usuario" type="email" placeholder="maria@familia.com" required />
            <Input
              name="password"
              label="Senha temporaria"
              type="text"
              placeholder="Minimo de 6 caracteres"
              required
            />
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Perfil do app</span>
              <select
                name="role"
                defaultValue="member"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                <option value="admin">admin</option>
                <option value="member">member</option>
              </select>
            </label>
            <Button type="submit" disabled={creatingAccess || usingMockData} className="w-full">
              {creatingAccess ? 'Criando acesso...' : 'Criar acesso'}
            </Button>
          </form>
        </Card>
      ) : null}

      {canPromoteAdmins(userProfile) ? (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Perfis do aplicativo</h3>
            <p className="mt-1 text-sm text-slate-500">
              Depois que o acesso for criado, voce promove a conta para admin ou volta para member aqui.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handlePromoteSubmit}>
            <Input name="email" label="E-mail do usuario" type="email" placeholder="admin@familia.com" required />
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Perfil do app</span>
              <select
                name="role"
                defaultValue="admin"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                <option value="admin">admin</option>
                <option value="member">member</option>
              </select>
            </label>
            <Button type="submit" disabled={promotingUser || usingMockData} className="w-full">
              {promotingUser ? 'Atualizando perfil...' : 'Atualizar perfil do usuario'}
            </Button>
          </form>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Como funciona agora</h3>
          <p className="mt-1 text-sm text-slate-500">
            Os convites por e-mail sairam do fluxo principal. O acesso passa a ser liberado diretamente pelo superadmin.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">1. Criar acesso</p>
            <p className="mt-1 text-sm text-slate-500">O superadmin cria ou libera a conta da pessoa.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">2. Definir perfil</p>
            <p className="mt-1 text-sm text-slate-500">A conta vira admin ou member conforme a necessidade.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">3. Vincular a viagem</p>
            <p className="mt-1 text-sm text-slate-500">O membro aparece aqui e passa a usar o app normalmente.</p>
          </div>
        </div>
      </Card>

      {!loading && !error && members.length === 0 ? (
        <EmptyState
          title="Nenhum membro cadastrado"
          description="Quando voce adicionar membros, eles vao aparecer aqui com permissoes e dados da viagem."
        />
      ) : null}

      {!loading && !error
        ? members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              canManage={canManageMembers(userProfile)}
              onEdit={() => navigate(`/members/manage/${member.id}`)}
              onDelete={canDeleteMembers(userProfile) ? () => handleDelete(member.id) : undefined}
            />
          ))
        : null}
    </div>
  )
}

export default MembersPage
