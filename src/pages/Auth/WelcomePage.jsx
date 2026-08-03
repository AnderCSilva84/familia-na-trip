import { Link, Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import Button from '../../components/common/Button'

function WelcomePage() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/today" replace />
  }

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between overflow-hidden bg-slate-950 text-white shadow-[0_25px_80px_rgba(15,118,110,0.2)] lg:min-h-[calc(100vh-3rem)] lg:rounded-[40px]">
        <div
          className="relative flex flex-1 flex-col justify-between overflow-hidden px-6 pb-10 pt-12 lg:px-12 lg:pb-12 lg:pt-16"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(15,23,42,0.18), rgba(2,6,23,0.72)), url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_30%,rgba(15,118,110,0.08)_100%)]" />
          <div className="relative max-w-2xl">
            <div className="w-fit rounded-[36px] border border-white/16 bg-white/10 p-3 shadow-[0_22px_55px_rgba(15,23,42,0.22)] backdrop-blur-md">
              <div className="overflow-hidden rounded-[28px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <img
                  src="/familia.png"
                  alt="Familia na Trip"
                  loading="eager"
                  decoding="async"
                  className="h-[9.5rem] w-[9.5rem] object-cover"
                />
              </div>
            </div>
            <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight text-white drop-shadow-[0_10px_28px_rgba(2,6,23,0.28)] lg:text-6xl">
              Sua familia viaja melhor junta
            </h1>
            <p className="mt-4 max-w-xl text-[1.05rem] leading-8 text-white/88 lg:text-xl">
              Sua viagem, suas memorias, tudo em um app elegante e pratico para celular, notebook e desktop.
            </p>
          </div>
          <div className="relative space-y-4 lg:max-w-sm">
            <Link to="/login" className="block">
              <Button variant="secondary" className="w-full rounded-full bg-white text-slate-900 shadow-[0_22px_50px_rgba(15,23,42,0.24)]">
                Entrar com email
              </Button>
            </Link>
            <p className="text-center text-sm font-medium text-white/85">
              O superadmin libera os acessos da familia e depois cada pessoa entra com seu proprio login.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
