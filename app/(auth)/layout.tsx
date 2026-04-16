export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0))]">
      <div className="app-shell grid min-h-screen items-center py-10 md:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
        <div className="hidden space-y-6 lg:block">
          <p className="section-label">Area de autenticacao</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.02] text-[color:var(--foreground)]">
            Entrada calma, objetiva e separada do restante da operacao.
          </h1>
          <p className="max-w-lg text-base leading-7 text-[color:var(--foreground-soft)]">
            O shell de autenticacao concentra o acesso real via next-auth, separando
            entrada administrativa e portal do tutor sem misturar contexto de sessao
            com o restante da operacao.
          </p>
        </div>

        <div>{children}</div>
      </div>
    </div>
  )
}
