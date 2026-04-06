export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0))]">
      <div className="app-shell grid min-h-screen items-center py-10 md:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
        <div className="hidden space-y-6 lg:block">
          <p className="section-label">Área de autenticação</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.02] text-[color:var(--foreground)]">
            Entrada calma, objetiva e separada do restante da operação.
          </h1>
          <p className="max-w-lg text-base leading-7 text-[color:var(--foreground-soft)]">
            O shell de autenticação existe nesta etapa apenas para orientar o fluxo visual.
            A autenticação real continua fora do escopo até o Bloco 4.
          </p>
        </div>

        <div>{children}</div>
      </div>
    </div>
  )
}
