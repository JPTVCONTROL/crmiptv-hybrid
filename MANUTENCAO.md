# CRM JPTV — Guia de Manutenção e Execução

Este documento descreve como instalar, executar, desenvolver e manter a aplicação **CRM JPTV** para gestão de clientes IPTV. A solução foi dividida em dois projetos independentes:

| Pasta | Descrição | Stack |
|-------|-----------|-------|
| `crm_back/` | API REST | Node.js, Express, TypeScript, Prisma, SQLite |
| `crm_front/` | Interface híbrida (web + mobile) | Ionic, Angular 17, Tailwind CSS 3.4, RxJS |

O projeto legado React permanece em `Projetoantigo/` apenas como referência histórica.

---

## 1. Pré-requisitos

Instale na máquina de desenvolvimento ou servidor:

- **Node.js** 18 ou superior (recomendado: LTS atual)
- **npm** 9 ou superior
- **Git** (opcional, para controle de versão)

Para publicar em dispositivos móveis nativos (Android/iOS):

- **Android Studio** (para build Android via Capacitor)
- **Xcode** (macOS, para build iOS)

---

## 2. Estrutura do Projeto

```
crm-jptv/
├── crm_back/                 # Backend API
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos do banco
│   │   └── dev.db            # Banco SQLite (gerado após migrate)
│   ├── src/
│   │   ├── config/           # Variáveis de ambiente e Prisma
│   │   ├── controllers/      # Camada HTTP (req/res)
│   │   ├── middlewares/      # Tratamento de erros
│   │   ├── models/           # DTOs e tipos TypeScript
│   │   ├── repositories/     # Acesso ao banco (Prisma)
│   │   ├── routes/           # Rotas Express
│   │   ├── services/         # Regras de negócio
│   │   ├── utils/helpers/    # Funções auxiliares
│   │   └── index.ts          # Entrada da API
│   ├── .env                  # Configuração local
│   └── package.json
│
├── crm_front/                # Frontend Ionic/Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # Componentes reutilizáveis (modais, cards)
│   │   │   ├── core/         # Services, models, interceptors
│   │   │   ├── pages/        # Telas lazy-loaded
│   │   │   └── shared/       # Módulo compartilhado e utilitários
│   │   ├── assets/           # Imagens e ícones estáticos
│   │   ├── theme/            # Tailwind + variáveis Ionic
│   │   └── environments/     # URL da API por ambiente
│   └── package.json
│
├── Projetoantigo/            # Projeto React legado (referência)
└── MANUTENCAO.md             # Este arquivo
```

---

## 3. Primeira Instalação

### 3.1 Backend (`crm_back`)

```bash
cd crm_back
npm install
```

Configure o arquivo `.env`. Copie o modelo e ajuste os valores:

```bash
copy .env.example .env
```

```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development

# Autenticação (admin único — usado no seed)
JWT_SECRET="altere-esta-chave-em-producao"
JWT_EXPIRES_IN="7d"
ADMIN_EMAIL="admin@jptv.com.br"
ADMIN_PASSWORD="admin123"
ADMIN_NOME="Administrador"
```

> **Produção:** use `JWT_SECRET` longo e aleatório e troque `ADMIN_PASSWORD` antes do primeiro deploy.

Crie o banco, gere o client Prisma e crie o usuário admin:

```bash
npm run db:push
npm run db:generate
npm run db:seed
```

Inicie a API em modo desenvolvimento:

```bash
npm run dev
```

A API ficará disponível em **http://localhost:3001**.

Teste rápido:

```bash
curl http://localhost:3001/health
```

Resposta esperada: `{"success":true,"message":"CRM JPTV API online"}`

### 3.2 Frontend (`crm_front`)

Em **outro terminal**:

```bash
cd crm_front
npm install
npm start
```

O frontend abrirá em **http://localhost:4200** (porta padrão do Angular).

> **Importante:** o backend deve estar rodando antes de usar o frontend. Ao abrir **http://localhost:4200**, você será redirecionado para **`/login`**. Use as credenciais definidas no `.env` do backend (padrão do seed: `admin@jptv.com.br` / `admin123`).

---

## 4. Scripts Disponíveis

### Backend (`crm_back`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia API com hot-reload (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa build de produção (`node dist/index.js`) |
| `npm run db:generate` | Regenera Prisma Client após alterar schema |
| `npm run db:push` | Sincroniza schema com SQLite (dev) |
| `npm run db:migrate` | Cria migration versionada (recomendado em produção) |
| `npm run db:seed` | Cria/atualiza admin e planos padrão JPTV |
| `npm run db:studio` | Abre Prisma Studio (GUI do banco) |

### Frontend (`crm_front`)

| Comando | Descrição |
|---------|-----------|
| `npm start` | Servidor de desenvolvimento (`ng serve`) |
| `npm run build` | Build de produção em `www/` |
| `npm test` | Testes unitários (Karma/Jasmine) |
| `npm run lint` | ESLint |

---

## 5. API — Endpoints e Regras de Negócio

Base URL: `http://localhost:3001/api`

Todas as respostas seguem o envelope:

```json
{ "success": true, "data": {}, "message": "..." }
```

### Autenticação

Rotas públicas: `GET /health` (fora de `/api`) e `POST /api/auth/login`.

**Todas as demais rotas `/api/*` exigem header:**

```
Authorization: Bearer <token>
```

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login com `{ "email", "senha" }` → retorna `{ token, usuario }` |
| GET | `/auth/me` | Retorna usuário autenticado (requer token) |

O token JWT expira conforme `JWT_EXPIRES_IN` no `.env` (padrão: `7d`).

**Usuário admin:** criado pelo `npm run db:seed` a partir de `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NOME`. Reexecutar o seed atualiza nome e senha do admin existente.

### Clientes (`/clientes`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clientes` | Lista clientes com aplicativo e mensalidades |
| GET | `/clientes/:id` | Detalhe do cliente |
| POST | `/clientes` | Cria cliente |
| PUT | `/clientes/:id` | Atualiza cliente |
| DELETE | `/clientes/:id` | Remove cliente (cascade nas mensalidades) |

**Regras ao criar cliente:**

1. `valorMensal` é obrigatório e deve ser maior que zero.
2. Se `expiraEm` for informado, cria automaticamente a primeira mensalidade `PENDENTE` com referência `MM/YYYY`.

### Mensalidades (`/mensalidades`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/mensalidades` | Lista todas (com cliente) |
| PUT | `/mensalidades/:id/pagar` | Registra pagamento e renova ciclo |

**Regras de pagamento (`PUT /:id/pagar`):**

1. Não permite pagar mensalidade já marcada como `PAGO`.
2. Compara apenas a **data** (ignora horário):
   - **Pagamento no prazo ou antecipado:** próximo vencimento = vencimento atual + 1 mês.
   - **Pagamento atrasado:** próximo vencimento = data do pagamento + 1 mês.
3. Novo vencimento sempre às **23:59**.
4. Em transação única: marca atual como `PAGO`, atualiza `expiraEm`/`vencimento` do cliente e cria nova mensalidade `PENDENTE`.

### Aplicativos (`/aplicativos`)

CRUD completo. Nome é obrigatório na criação. Retorna contagem de clientes (`_count.clientes`).

### Planos (`/planos`)

CRUD completo. Campos: `nome`, `valor`, `diasValidade`, `ativo`. Planos podem ser vinculados ao cadastro de clientes.

### Dispositivos (`/dispositivos`)

CRUD do **catálogo** de aparelhos (nome, modelo, descrição). No cadastro do cliente, seleciona-se um item do catálogo por tela + MAC address (campo JSON `dispositivos` no cliente).

### Configurações (`/configuracoes`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/configuracoes` | Obtém config (cria registro padrão se não existir) |
| PUT | `/configuracoes` | Atualiza campos permitidos (whitelist) |

Campos editáveis: dados da empresa, PIX, cor principal e templates de mensagens.

---

## 6. Frontend — Telas e Navegação

| Rota | Tela | Função |
|------|------|--------|
| `/login` | Login | Autenticação (JWT) |
| `/dashboard` | Dashboard | KPIs, gráfico de faturamento, cobrança em lote |
| `/clientes` | Clientes | Listagem com filtros por status, busca, CRUD |
| `/clientes/:id` | Detalhe | Perfil completo, mensalidades, WhatsApp, pagamento |
| `/financeiro` | Financeiro | Cobranças pendentes com filtros, paginação e lote |
| `/vencimentos` | Vencimentos | Pendentes ordenados por data, cobrança em lote |
| `/aplicativos` | Aplicativos | Catálogo de apps IPTV |
| `/planos` | Planos | Catálogo de planos (valor e validade) |
| `/dispositivos` | Dispositivos | Catálogo de aparelhos para vincular aos clientes |
| `/relatorios` | Relatórios | Resumo financeiro |
| `/configuracoes` | Configurações | Empresa, PIX, templates WhatsApp |

Rotas internas (exceto `/login`) exigem sessão ativa. O botão **Sair** no menu encerra a sessão.

### Mobile-first

- Menu lateral via `ion-menu` + `ion-split-pane` (menu fixo em telas `lg+`, overlay em mobile).
- Grids responsivos com Tailwind (`grid-cols-1`, `md:`, `lg:`).
- Tabelas com scroll horizontal em telas pequenas.

### Tema visual

Paleta herdada do projeto React legado:

- Fundo: `slate-950`
- Cards/sidebar: `slate-900` com bordas `slate-800`
- Destaque: `purple/violet-600`
- Sucesso: `green-600` | Alerta: `amber/orange` | Erro: `red-600`

Classes utilitárias em `src/theme/tailwind.css`: `.crm-input`, `.crm-card`, `.crm-btn-primary`, etc.

### WhatsApp (envio manual)

Utilitários em `src/app/shared/utils/whatsapp.ts` e `cobranca-lote.ts`:

- Abre `wa.me` com mensagem pré-preenchida (não usa API oficial da Meta).
- Variáveis de template: `{nome}`, `{referencia}`, `{valor}`, `{vencimento}`, `{expiraEm}`, `{pagoEm}`, `{empresa}`, `{pix}`, `{tipoPix}`, `{favorecido}`
- Template customizado de **cobrança** só para clientes **atrasados**; pendente/regular usa lembrete amigável.
- Cobrança em lote com confirmação cliente a cliente (Financeiro, Vencimentos, Dashboard).
- Após pagamento, oferece envio de mensagem de **renovação**.

---

## 7. Alterando o Schema do Banco

1. Edite `crm_back/prisma/schema.prisma`.
2. Em desenvolvimento:
   ```bash
   cd crm_back
   npm run db:migrate
   # ou, para prototipagem rápida:
   npm run db:push
   ```
3. Regenere o client:
   ```bash
   npm run db:generate
   ```
4. Atualize repositories, services, models e frontend conforme necessário.

### Migrar dados do projeto antigo

O banco SQLite do legado está em `Projetoantigo/prisma/dev.db`. Para reutilizar os dados:

```bash
# Pare a API antes de copiar
copy Projetoantigo\prisma\dev.db crm_back\prisma\dev.db
```

Em seguida execute `npm run db:push` apenas se o schema tiver divergido.

---

## 8. Configuração de Ambientes

### Desenvolvimento

- Backend: `.env` com `PORT=3001`, `JWT_SECRET` e credenciais do admin (ver `.env.example`)
- Frontend: `src/environments/environment.ts` → `apiUrl: 'http://localhost:3001/api'`

### Produção

**Backend:**

1. Defina `NODE_ENV=production` no `.env`.
2. Use `JWT_SECRET` forte e altere `ADMIN_PASSWORD`; execute `npm run db:seed`.
3. Execute `npm run build && npm start`.
4. Considere migrar de SQLite para PostgreSQL/MySQL em ambientes multi-usuário:
   - Altere `provider` e `url` em `schema.prisma`.
   - Atualize `DATABASE_URL`.

**Frontend:**

1. Ajuste `src/environments/environment.prod.ts` com a URL real da API.
2. Execute `npm run build`.
3. Sirva a pasta `www/` via Nginx, Apache ou hospedagem estática.

Exemplo Nginx (frontend + proxy API):

```nginx
server {
  listen 80;
  root /var/www/crm-jptv/www;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
  }
}
```

---

## 9. Build Mobile (Capacitor)

O frontend já inclui Capacitor 6. Para gerar app nativo:

```bash
cd crm_front
npm run build
npx cap add android    # ou ios
npx cap sync
npx cap open android   # abre Android Studio
```

**Atenção para mobile:** altere `environment.prod.ts` para apontar para a URL acessível pelo dispositivo (IP da rede local ou domínio público), não `localhost`.

Exemplo em rede local: `apiUrl: 'http://192.168.1.100:3001/api'`

---

## 10. Manutenção do Código

### Onde alterar cada tipo de mudança

| Necessidade | Onde alterar |
|-------------|--------------|
| Nova regra de negócio | `crm_back/src/services/` |
| Nova rota API | `routes/` → `controllers/` → `services/` → `repositories/` |
| Novo campo no banco | `prisma/schema.prisma` + repository + models front |
| Nova tela | `crm_front/src/app/pages/` + rota em `app-routing.module.ts` |
| Componente visual reutilizável | `crm_front/src/app/components/` |
| Estilo global / tema | `crm_front/src/theme/` |
| Chamada HTTP | `crm_front/src/app/core/services/` |

### Padrões adotados

- **Backend:** arquitetura em camadas (routes → controllers → services → repositories).
- **Frontend:** módulos por página com lazy loading; services injetáveis (`providedIn: 'root'`); RxJS para assíncrono.
- **TypeScript** em ambos os projetos com `strict: true` no backend.

### Boas práticas ao contribuir

1. Nunca commitar `.env` com credenciais reais.
2. Manter o envelope `{ success, data, message }` na API para compatibilidade com o frontend.
3. Preservar regras de cobrança documentadas na seção 5 ao modificar mensalidades.
4. Testar fluxos críticos manualmente após mudanças:
   - Cadastro de cliente com mensalidade automática
   - Pagamento em dia vs. atrasado
   - Envio de WhatsApp com template configurado
5. Executar `npm run build` em ambos os projetos antes de publicar.

---

## 11. Solução de Problemas

### Frontend não carrega dados / redireciona para login

- Verifique se o backend está em execução na porta 3001.
- Faça login em `/login` com e-mail e senha do admin (seed).
- Se aparecer "Token ausente" ou 401, clique em **Sair** e entre novamente.
- Confirme CORS (já habilitado globalmente no backend).
- Abra DevTools → Network e verifique erros de conexão.
- Confirme `apiUrl` em `environment.ts`.

### Erro Prisma / banco não encontrado

```bash
cd crm_back
npm run db:push
npm run db:generate
npm run db:seed
```

> Se `db:generate` falhar com **EPERM** no Windows, pare o processo do backend (`npm run dev`) e execute novamente.

### Esqueci a senha do admin

Atualize `ADMIN_PASSWORD` no `.env` do backend e execute:

```bash
cd crm_back
npm run db:seed
```

### Porta 3001 ou 4200 em uso

Altere `PORT` no `.env` do backend ou use:

```bash
ng serve --port 4300
```

Atualize `apiUrl` no frontend se a porta do backend mudar.

### Build Angular falha após upgrade de dependências

- Angular fixado em **17.3.x** — não atualize para 18+ sem revisar breaking changes do Ionic.
- Tailwind fixado em **3.4.x** — configuração em `tailwind.config.js` (não v4).

---

## 12. Roadmap / Melhorias Futuras

Itens ainda não implementados ou parciais:

- Relatórios com filtro de período, gráfico e exportação CSV
- Tela para **trocar senha** do admin (sem editar `.env`)
- Aplicação dinâmica de `corPrincipal` no tema
- Unificação visual Financeiro × Vencimentos (padrão da tela Clientes)
- Toasts Ionic no lugar de `alert()` nativo
- WhatsApp automático via API oficial da Meta (hoje só envio manual `wa.me`)
- Migrations Prisma versionadas para deploy em produção

---

## 13. Contatos e Versionamento

- **Versão atual:** 1.0.0
- **Porta API padrão:** 3001
- **Porta frontend dev:** 4200

Para dúvidas de manutenção, consulte também o código de referência em `Projetoantigo/` e a documentação oficial:

- [Ionic Framework](https://ionicframework.com/docs)
- [Angular](https://angular.io/docs)
- [Prisma](https://www.prisma.io/docs)
- [Tailwind CSS v3](https://v3.tailwindcss.com/docs)
