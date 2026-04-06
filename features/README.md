# Features

Os domínios do PetOS devem nascer organizados por capacidade, não por camada técnica espalhada.

Convenção inicial recomendada para cada feature:

- `schemas.ts`: contratos Zod de entrada e saída do domínio;
- `services.ts` ou `server/`: casos de uso, orquestração e integrações server-side;
- `components/`: componentes específicos da feature, quando existirem;
- `types.ts`: tipos auxiliares quando realmente ajudarem a leitura.

Regras desta convenção:

- Route Handlers devem importar contratos do domínio em vez de redefinir validações locais;
- helpers genéricos ficam em `server/` ou `lib/`, não duplicados por feature;
- regra de negócio crítica continua no servidor, mesmo quando houver schema compartilhado com a UI;
- ausência de uma feature concreta não justifica criar arquivos genéricos demais agora.
