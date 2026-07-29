import { Outlet, useLocation } from 'react-router-dom'
import BottomNavigation from '../components/layout/BottomNavigation'
import Header from '../components/layout/Header'
import PageContainer from '../components/layout/PageContainer'

const pageMeta = [
  { match: '/trips/new', title: 'Cadastrar trip', subtitle: 'Planeje uma nova viagem ou registre uma aventura passada' },
  { match: '/trips/', title: 'Editar trip', subtitle: 'Atualize nome, período e informações da viagem' },
  { match: '/trips', title: 'Viagens', subtitle: 'Todas as trips da família' },
  { match: '/gallery', title: 'Galeria', subtitle: 'Fotos e memórias de todas as viagens' },
  { match: '/travel-history', title: 'Mapa da família', subtitle: 'Todas as cidades e estados já visitados' },
  { match: '/dashboard', title: 'Inicio', subtitle: 'Sua viagem em um so lugar' },
  { match: '/map', title: 'Mapa', subtitle: 'Paradas, rotas e pontos de encontro' },
  { match: '/members/manage', title: 'Acesso', subtitle: 'Criar ou editar participante da viagem' },
  { match: '/members', title: 'Acessos', subtitle: 'Quem esta nessa trip e como entra no app' },
  { match: '/polls', title: 'Enquetes', subtitle: 'Decisoes rapidas em familia' },
  { match: '/admin', title: 'Painel Admin', subtitle: 'Acessos, backup da viagem e operacao central do app' },
  { match: '/diary/new', title: 'Novo registro', subtitle: 'Guarde um momento especial' },
  { match: '/diary/', title: 'Editar registro', subtitle: 'Atualize o diario da trip' },
  { match: '/diary', title: 'Diario', subtitle: 'Registros e memorias da viagem' },
  { match: '/itinerary/new', title: 'Novo roteiro', subtitle: 'Adicione uma nova parada' },
  { match: '/itinerary/', title: 'Editar roteiro', subtitle: 'Ajuste horarios e status' },
  { match: '/itinerary', title: 'Roteiro', subtitle: 'Tudo o que vem pela frente' },
  { match: '/attractions/new', title: 'Novo ponto turistico', subtitle: 'Adicione um lugar para conhecer' },
  { match: '/attractions/', title: 'Editar ponto turistico', subtitle: 'Atualize os dados do local' },
  { match: '/attractions', title: 'Pontos turisticos', subtitle: 'Lugares que a familia quer conhecer' },
  { match: '/tips', title: 'Dicas', subtitle: 'Aprendizados da familia' },
  { match: '/hotels/new', title: 'Nova hospedagem', subtitle: 'Salve reserva, valores e link do anuncio' },
  { match: '/hotels/', title: 'Editar hospedagem', subtitle: 'Atualize status e detalhes da reserva' },
  { match: '/hotels', title: 'Hoteis', subtitle: 'Hospedagens e reservas' },
  { match: '/vehicles/new', title: 'Novo veiculo', subtitle: 'Organize retirada, devolucao e custos' },
  { match: '/vehicles/', title: 'Editar veiculo', subtitle: 'Atualize status e detalhes da locacao' },
  { match: '/vehicles', title: 'Veiculos', subtitle: 'Locacoes e deslocamentos' },
  { match: '/tips/new', title: 'Nova dica', subtitle: 'Compartilhe uma recomendacao da trip' },
  { match: '/tips/', title: 'Editar dica', subtitle: 'Ajuste categoria, local e link' },
  { match: '/polls/new', title: 'Nova enquete', subtitle: 'Decisoes rapidas para a familia' },
  { match: '/expenses/import', title: 'Carga interna', subtitle: 'Ferramenta tecnica de manutencao da viagem' },
  { match: '/expenses/new', title: 'Novo gasto', subtitle: 'Registre o gasto da viagem' },
  { match: '/expenses/', title: 'Editar gasto', subtitle: 'Atualize categoria e divisao' },
  { match: '/expenses', title: 'Gastos', subtitle: 'Orcamento sob controle' },
  { match: '/distances', title: 'Distâncias', subtitle: 'Quilômetros percorridos na viagem' },
  { match: '/agenda/new', title: 'Novo evento', subtitle: 'Adicione compromissos e checkpoints' },
  { match: '/agenda/', title: 'Editar evento', subtitle: 'Atualize a agenda da viagem' },
  { match: '/alarms/new', title: 'Novo alarme', subtitle: 'Crie lembretes para o grupo' },
  { match: '/alarms/', title: 'Editar alarme', subtitle: 'Ajuste data, hora e notificacoes' },
  { match: '/alarms', title: 'Alarmes', subtitle: 'Lembretes e avisos da viagem' },
  { match: '/agenda', title: 'Agenda', subtitle: 'Alarmes, horarios e lembretes' },
  { match: '/notifications', title: 'Notificacoes', subtitle: 'Tudo o que aconteceu agora ha pouco' },
  { match: '/reviews', title: 'Avaliacoes', subtitle: 'Gatinhos, comentarios e curtidas da familia' },
  { match: '/emergency/new', title: 'Novo hospital', subtitle: 'Cadastre apoio rapido para emergencias da viagem' },
  { match: '/emergency/', title: 'Editar hospital', subtitle: 'Atualize endereco, publico e destaque' },
  { match: '/emergency', title: 'Emergencia', subtitle: 'Hospitais e apoio rapido no mapa da viagem' },
  { match: '/wallet', title: 'Carteira', subtitle: 'Reservas, check-ins e documentos da viagem' },
  { match: '/checklist', title: 'Checklist e malas', subtitle: 'Preparativos compartilhados pela familia' },
  { match: '/souvenirs', title: 'Lista de lembrancas', subtitle: 'Presentes comprados e entregas para acompanhar' },
  { match: '/today', title: 'Hoje', subtitle: 'O essencial do dia em uma tela' },
  { match: '/medical', title: 'Cartao medico', subtitle: 'Informacoes protegidas para emergencias' },
  { match: '/settings', title: 'Configuracoes', subtitle: 'Perfil, tema e dados da trip' },
]

function getPageMeta(pathname) {
  return pageMeta.find((item) => pathname.startsWith(item.match)) ?? pageMeta[0]
}

function AppLayout() {
  const location = useLocation()
  const meta = getPageMeta(location.pathname)

  return (
    <div className="app-shell">
      <div className="app-shell__bg" />
      <div className="mx-auto min-h-screen w-full max-w-7xl px-3 py-3 sm:px-4 lg:px-6 lg:py-6">
        <div className="flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_25px_80px_rgba(15,118,110,0.12)] lg:min-h-[calc(100vh-3rem)] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-100 bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_100%)] p-6 lg:flex lg:flex-col lg:gap-6">
            <div>
              <img
                src="/familiaNaTrip.png"
                alt="Familia na Trip"
                loading="eager"
                decoding="async"
                className="h-20 w-auto object-contain"
              />
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Painel da viagem</h2>
            </div>
            <div className="sticky top-6">
              <BottomNavigation variant="desktop" />
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <Header title={meta.title} subtitle={meta.subtitle} />
            <PageContainer>
              <Outlet />
            </PageContainer>
            <BottomNavigation />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
