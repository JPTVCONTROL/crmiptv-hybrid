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

### Atalho — backend + frontend juntos (recomendado)

Na **raiz** do repositório (`crm-jptv/`):

```bash
npm install
cd crm_back && npm install && cd ..
cd crm_front && npm install && cd ..
npm run dev
```

Isso sobe a API em **http://localhost:3001** e o CRM em **http://localhost:4200** no mesmo terminal.

| URL | Uso |
|-----|-----|
| http://localhost:4200 | Interface do CRM |
| http://localhost:3001/health | Verificar se a API está online |

> Use `npm run dev:back` ou `npm run dev:front` na raiz se quiser subir apenas um dos dois.

Configure o backend (`.env`) e rode o seed **antes** do primeiro uso — ver seção 3.1.

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

Se não usar o atalho da raiz, em **outro terminal**:

```bash
cd crm_front
npm install
npm start
```

O frontend abrirá em **http://localhost:4200** (porta padrão do Angular).

> **Importante:** o backend deve estar rodando antes de usar o frontend. Ao abrir **http://localhost:4200**, você será redirecionado para **`/login`**. Use as credenciais definidas no `.env` do backend (padrão do seed: `admin@jptv.com.br` / `admin123`).

---

## 4. Scripts Disponíveis

### Raiz (`crm-jptv/`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Libera portas 4200/3001 e sobe backend + frontend juntos |
| `npm run dev:back` | Apenas a API (modo dev, terminal visível) |
| `npm run dev:front` | Apenas o CRM |
| `npm run api:status` | Verifica se `/health` responde |
| `npm run api:ensure` | Sobe a API em background se estiver offline |
| `npm run api:restart` | Encerra porta 3001 e sobe a API de novo |
| `npm run api:setup` | Configura startup ao logon + watchdog (ver abaixo) |
| `npm run api:startup:install` | Agenda API ao logar no Windows |
| `npm run api:watchdog:install` | Verifica a API a cada 10 min e reinicia se cair |
| `npm run api:firewall` | Libera TCP 3001 no firewall (admin) |
| `npm run build` | Build de backend e frontend |
| `npm test` | Testes unitários de ambos |

### Backend (`crm_back`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia API com hot-reload (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa build de produção (`node dist/index.js`) |
| `npm run db:generate` | Regenera Prisma Client após alterar schema |
| `npm run db:push` | Sincroniza schema com SQLite (dev) |
| `npm run db:refresh` | `db:push` + `db:generate` (após alterar schema) |
| `npm run db:migrate` | Cria migration versionada (recomendado em produção) |
| `npm run db:seed` | Cria/atualiza admin e planos padrão JPTV |
| `npm run db:studio` | Abre Prisma Studio (GUI do banco) |
| `npm run api:status` | Testa `http://127.0.0.1:3001/health` |
| `npm run api:ensure` | Inicia API em background se offline |
| `npm run api:setup` | Wizard: status + startup + watchdog |
| `npm run api:startup:install` | Tarefa agendada ao logon (45s) |
| `npm run api:watchdog:install` | Tarefa a cada 10 min (reinício automático) |
| `npm run firewall:api` | Regra firewall TCP 3001 (admin) |
| `npm test` | Testes unitários dos helpers (datas, cobrança, importação) |

### Frontend (`crm_front`)

| Comando | Descrição |
|---------|-----------|
| `npm start` | Servidor de desenvolvimento (`ng serve --port 4200`) |
| `npm run build` | Build de produção em `www/` |
| `npm test` | Testes unitários (Karma/Jasmine) |
| `npm run lint` | ESLint |

---

## 4.1 Estabilidade da API (Windows + APK)

Para o APK e o Tailscale funcionarem, a API precisa estar **sempre** rodando no PC. Use este fluxo **uma vez**:

```bash
cd c:\Projetos\crm-jptv
npm run api:setup
```

O `api:setup` faz:

1. Testa `/health` e tenta subir a API se estiver offline
2. Instala **CRM JPTV API ao Logon** (sobe ~45s após login no Windows)
3. Instala **CRM JPTV API Watchdog** (verifica a cada 10 min e reinicia se cair)
4. Mostra o comando do firewall (precisa de PowerShell **como Administrador**)

```bash
cd crm_back
npm run firewall:api
```

### Comandos do dia a dia

| Situação | Comando |
|----------|---------|
| App mostra "API offline" | `npm run api:ensure` (na raiz) |
| Verificar se está online | `npm run api:status` |
| Reiniciar API manualmente | `npm run api:restart` |
| Desenvolvimento com hot-reload | `npm run dev:back` |
| Remover startup automático | `npm run api:startup:remove` |
| Remover watchdog | `npm run api:watchdog:remove` |

### Logs

| Arquivo | Conteúdo |
|---------|----------|
| `crm_back/logs/api-startup.log` | Boot ao logon / Tailscale |
| `crm_back/logs/api-ensure.log` | Tentativas do ensure e watchdog |
| `crm_back/logs/api.pid` | PID do processo em background |

### Checklist rápido (APK não loga)

1. PC ligado e logado no Windows
2. `npm run api:status` → **API online**
3. Tailscale ligado no PC e no celular (mesma conta)
4. Navegador no celular: `http://100.x.x.x:3001/health` → JSON online
5. Se falhar na rede: `npm run api:firewall` como admin

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
| POST | `/clientes/importar` | Importa CSV (`{ "csv": "..." }`) — nome + telefone |
| PUT | `/clientes/:id` | Atualiza cliente |
| PUT | `/clientes/:id/incluir-cobrancas` | `{ "incluirCobrancas": true \| false }` |
| DELETE | `/clientes/:id` | Remove cliente (cascade nas mensalidades) |

**Regras ao criar cliente:**

1. `valorMensal` é obrigatório e deve ser maior que zero (exceto importação CSV).
2. Telefone não pode duplicar outro cliente (mesmos dígitos, com ou sem DDD).
3. Se `expiraEm` for informado, cria automaticamente a primeira mensalidade `PENDENTE` com referência `MM/YYYY`.
4. Campo `incluirCobrancas` (padrão `true`): quando `false`, o cliente fica fora da Cobrança Diária, de “Precisam de atenção” e dos alertas de vencimento/cobrança no dashboard.

### Sincronização entre telas (frontend)

O `DadosSyncService` notifica páginas abertas após mutações:

| Método | Domínios emitidos |
|--------|-------------------|
| `notificarClientes()` | clientes, mensalidades, dashboard, catalogos |
| `notificarMensalidades()` | mensalidades, clientes, dashboard |
| `notificarContatos()` | mensalidades, dashboard (registro de contato WhatsApp) |
| `notificarConfiguracao()` | dashboard (após salvar configurações) |
| `notificarCatalogos()` | catalogos |

Modais de plano/aplicativo/dispositivo também escutam `clientes` enquanto abertos.

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

Campos editáveis: dados da empresa, PIX, cor principal, dias de antecedência do lembrete, templates de mensagens e backup do banco.

A tela está organizada em **quatro abas**: Conta (senha), Empresa (dados + PIX), Mensagens (templates + dias de antecedência) e Sistema (cor, backup, sync). A aba ativa é restaurada ao voltar à página (mesma sessão do navegador).

---

## 6. Frontend — Telas e Navegação

| Rota | Tela | Função |
|------|------|--------|
| `/login` | Login | Autenticação (JWT) |
| `/dashboard` | Dashboard | KPIs, gráfico de faturamento, links para Cobrança Diária |
| `/clientes` | Clientes | Listagem com filtros (persistidos na sessão), busca por nome/telefone, CRUD |
| `/clientes/:id` | Detalhe | Perfil completo, mensalidades, WhatsApp, pagamento |
| `/financeiro` | Financeiro | Cobranças pendentes, paginação, pagamentos em lote e renovação WhatsApp em lote |
| `/cobranca-diaria` | Cobrança Diária | Rotina WhatsApp manual + toggle de envio automático (API Meta) |
| `/vencimentos` | Vencimentos | Consulta de pendentes por data (sem lote duplicado) |
| `/aplicativos` | Aplicativos | Catálogo de apps IPTV |
| `/planos` | Planos | Catálogo de planos (valor e validade) |
| `/dispositivos` | Dispositivos | Catálogo de aparelhos para vincular aos clientes |
| `/relatorios` | Relatórios | Resumo financeiro |
| `/configuracoes` | Configurações | Abas: Conta, Empresa, Mensagens, Sistema (aba ativa lembrada na sessão) |

Rotas internas (exceto `/login`) exigem sessão ativa. O botão **Sair** no menu encerra a sessão.

### Banner API offline

Quando `/health` não responde, um aviso amarelo aparece no topo (login e telas internas). O texto orienta `npm run api:ensure` ou `npm run api:setup`. O `ApiHealthService` verifica a API a cada 25 segundos.

### Persistência na sessão do navegador

| Tela | O que é lembrado |
|------|------------------|
| **Configurações** | Última aba aberta (Conta, Empresa, Mensagens, Sistema) |
| **Clientes** | Busca, filtros, ordenação e página atual |
| **Financeiro** | Busca, filtro de status e página atual |

Links do dashboard com query params (`?status=`, `?cadastro=`, `?incompleto=`) **têm prioridade** sobre os filtros salvos em Clientes. Em Financeiro, `?status=` também sobrescreve o filtro salvo.

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
- Template customizado de **cobrança** só para clientes **atrasados**; pendente/vencendo usa lembrete amigável.
- Cobrança em lote com confirmação cliente a cliente (Financeiro, Vencimentos, Dashboard).
- Após pagamento individual ou **pagamento em lote** no Financeiro, oferece envio de mensagem de **renovação** (um WhatsApp por cliente, com confirmação).

### Status no Financeiro (cobrança pendente)

| Status interno | Rótulo na tela | Significado |
|----------------|----------------|-------------|
| `PENDENTE` | **Vencendo** | Vence nos próximos N dias (`diasAntecedenciaLembrete` em Configurações) |
| `REGULAR` | **Longe do vencimento** | Vencimento além da janela de lembrete — **não** significa “já pagou” |
| `ATRASADO` | **Atrasado** | Data de vencimento já passou |

Função: `statusFinanceiro()` / `rotuloStatusFinanceiro()` em `formatters.ts`.

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

## 9. Build Mobile (Capacitor) — teste em casa

O frontend inclui Capacitor 6. O APK **não** guarda banco local: ele consome a mesma API do PC (`crm_back`), na mesma rede Wi‑Fi.

### Pré-requisitos

- **Android Studio** instalado
- Backend rodando no PC (`npm run dev` em `crm_back`)
- Tablet/celular na **mesma Wi‑Fi** que o PC
- Firewall do Windows liberando a porta **3001** na rede privada (veja abaixo)

### Passo a passo (rede local)

**1. Subir a API no PC**

```bash
cd crm_back
npm run dev
```

Ao iniciar, o terminal lista os endereços de rede local, por exemplo:

```
Rede local (tablet/APK na mesma Wi-Fi):
  http://192.168.1.100:3001/health
  http://192.168.1.100:3001/api
```

**2. Liberar firewall (Windows, uma vez)**

PowerShell **como Administrador** (botão direito → *Executar como administrador*):

```bash
cd crm_back
npm run firewall:api
```

> Se aparecer *Acesso negado*, o terminal não está elevado. Abra um PowerShell admin e rode de novo.

**3. Testar do celular/tablet**

No navegador do dispositivo, abra o `/health` mostrado no terminal. Deve aparecer JSON `CRM JPTV API online`.

**4. Gerar o APK com IP automático**

```bash
cd crm_front
npm run cap:home
```

Esse comando:

1. Detecta o IP da Wi‑Fi/Ethernet e atualiza `environment.mobile.ts`
2. Faz `build:mobile` + `cap sync android`

**5. Abrir no Android Studio e gerar APK**

```bash
npm run cap:android
```

No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Instale o APK no tablet (sideload).

### Scripts úteis

| Comando | Onde | Função |
|---------|------|--------|
| `npm run mobile:prepare` | `crm_front` | Só atualiza `apiUrl` com IP da rede |
| `npm run cap:home` | `crm_front` | IP + build mobile + sync Android |
| `npm run cap:sync` | `crm_front` | Build mobile + sync (sem alterar IP) |
| `npm run firewall:api` | `crm_back` | Regra de firewall TCP 3001 (rede privada) |
| `npm run api:setup` | raiz ou `crm_back` | Startup + watchdog + checklist firewall |
| `npm run api:status` | raiz | Verifica `/health` |
| `npm run api:ensure` | raiz | Sobe API se offline |
| `npm run api:startup:install` | `crm_back` | API sobe ao logar no Windows |
| `npm run api:watchdog:install` | `crm_back` | Reinicia API se cair (10 min) |
| `npm run api:startup:remove` | `crm_back` | Remove tarefa de inicializacao da API |
| `npm run api:watchdog:remove` | `crm_back` | Remove watchdog |
| `npm run db:backup` | `crm_back` | Cópia manual do SQLite |
| `npm run db:backup:install` | `crm_back` | Agenda backup diário (admin) |
| `npm run db:backup:remove` | `crm_back` | Remove agendamento |

### IP manual

Se a detecção automática falhar:

```powershell
cd crm_front
powershell -File scripts/prepare-mobile-env.ps1 -Ip 192.168.1.100
```

Ou edite `src/environments/environment.mobile.ts`:

```typescript
apiUrl: 'http://192.168.1.100:3001/api',
```

**Nunca use `localhost` no APK** — no tablet isso aponta para o próprio aparelho, não para o PC.

### Sincronização tablet ↔ PC

Alterações no tablet ou no PC vão para o **mesmo SQLite** no servidor. Ao reabrir uma tela, os dados são recarregados da API. Não há banco offline no app.

### Acesso fora de casa (Tailscale — gratuito)

Rede privada entre PC e celular, sem abrir porta no roteador. O APK usa o IP Tailscale do PC (`100.x.x.x`).

#### Passo 1 — Instalar Tailscale no PC (Windows)

1. Baixe em [tailscale.com/download/windows](https://tailscale.com/download/windows) e instale.
2. Abra o Tailscale e entre com Google, Microsoft ou GitHub.
3. Confirme que o PC aparece como **Connected** na bandeja do Windows.

Verificar no terminal:

```bash
cd crm_front
npm run tailscale:status
```

Anote o IP IPv4 (ex.: `100.64.12.34`).

#### Passo 2 — Instalar Tailscale no celular/tablet

1. App **Tailscale** na Play Store / App Store.
2. **Mesma conta** usada no PC.
3. Ative a VPN quando for usar o CRM fora de casa (pode deixar sempre ligado).

#### Passo 3 — API rodando no PC

Manual:

```bash
cd crm_back
npm run dev
```

Ou na raiz: `npm run dev:back`

**Automatico ao ligar o PC** (recomendado para APK + Tailscale):

```bash
npm run api:setup
```

Ou só o startup ao logon:

```bash
cd crm_back
npm run api:startup:install
npm run api:watchdog:install
```

Isso agenda **CRM JPTV API ao Logon** (45s após login) e **CRM JPTV API Watchdog** (verifica a cada 10 min). Logs em `crm_back/logs/`.

Se o app mostrar API offline durante o dia: `npm run api:ensure` (na raiz).

Teste imediato:

```powershell
cd crm_back
powershell -File scripts/start-api-boot.ps1
```

Remover agendamento: `npm run api:startup:remove`

Firewall (uma vez, PowerShell **como Administrador**):

```bash
cd crm_back
npm run firewall:api
```

#### Passo 4 — Testar do celular (4G ou outra Wi‑Fi)

Com Tailscale **ligado** no celular, abra no navegador:

```
http://100.x.x.x:3001/health
```

(substitua pelo IP do passo 1)

Deve retornar JSON `CRM JPTV API online`.

#### Passo 5 — Gerar APK apontando para Tailscale

```bash
cd crm_front
npm run apk:tailscale
```

Isso detecta o IP Tailscale, atualiza `environment.mobile.ts` e gera:

`releases/crm-jptv-v1.1-debug.apk`

Instale no tablet. **Importante:** o celular precisa do Tailscale ativo para o CRM funcionar.

#### Scripts Tailscale

| Comando | Função |
|---------|--------|
| `npm run tailscale:status` | Mostra se Tailscale está instalado e o IP |
| `npm run mobile:prepare:tailscale` | Atualiza `environment.mobile.ts` com IP Tailscale |
| `npm run apk:tailscale` | IP Tailscale + build + APK |

IP manual se a detecção falhar:

```powershell
cd crm_front
powershell -File scripts/prepare-mobile-env.ps1 -Tailscale -Ip 100.64.12.34
npm run apk:debug
```

#### Limitações

- PC em casa precisa estar **ligado** com a API rodando.
- Tailscale **ativo** no celular (fora da Wi‑Fi de casa).
- Em casa na mesma Wi‑Fi, pode continuar usando `npm run apk:debug` (IP local).

### Atualizar o APK sem reinstalar (OTA)

O APK **shell** carrega a interface do PC em `/app`. Depois de alterar o código, publique no PC e toque **Atualizar app** na tela de login.

#### Uma vez — instalar APK shell

```bash
cd crm_front
npm run apk:shell:tailscale
```

Instale `releases/crm-jptv-v1.1-debug.apk`. Esse APK aponta para `http://SEU_IP:3001/app` (Tailscale ou rede local).

#### Sempre que alterar o CRM

No PC:

```bash
npm run app:publish
```

Isso gera `crm_front/www/` + `version.json` servidos pela API em `/app`.

No celular: abra o app → login → **Atualizar app**.

| Comando | Função |
|---------|--------|
| `npm run app:publish` | Build mobile remoto + version.json (raiz ou `crm_front`) |
| `npm run apk:shell:tailscale` | Gera APK shell (instalar uma vez) |
| `npm run apk:tailscale` | APK com bundle embutido (modo antigo, exige reinstalar) |

### Produção (VPS / domínio)

Para servidor sempre online sem depender do PC: VPS, domínio, HTTPS e `apiUrl` com `https://seudominio.com/api`.

### Automações WhatsApp (Meta Cloud API)

1. Crie app em [Meta for Developers](https://developers.facebook.com/) e configure WhatsApp Cloud API.
2. Aprove templates **Utility** `crm_lembrete` e `crm_cobranca` com 5 variáveis no corpo (nome, referência, valor, vencimento, PIX).
3. Em `crm_back/.env`:

```env
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_ACCESS_TOKEN="..."
WHATSAPP_WEBHOOK_VERIFY_TOKEN="crm-jptv-webhook"
AUTOMACAO_SCHEDULER="true"
```

4. Exponha o webhook com túnel HTTPS (ex.: Cloudflare Tunnel) apontando para `http://localhost:3001/api/webhook/whatsapp`.
5. No CRM: **Automações** → teste com **Executar agora** (não exige toggles ligados). Depois ative lembretes/cobrança, horários e **Salvar** para o agendador.
6. Mantenha o PC ligado com `npm run dev` nos horários de envio.

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
   - Importação/exportação CSV de clientes
   - Exclusão de cobrança (`incluirCobrancas: false`) e alertas do sino
   - Cobrança diária (seleção mantida após registrar contato)
   - Envio de WhatsApp com template configurado
5. Executar `npm run build` em ambos os projetos, `npm test` no backend e `npm run test:unit` no frontend antes de publicar.

### Checklist de validação manual

Use este roteiro após mudanças relevantes (cadastro, financeiro, sync ou layout):

| # | Fluxo | Como validar | Resultado esperado |
|---|--------|--------------|-------------------|
| 1 | Login | Entrar com admin do seed | Dashboard carrega sem 401 |
| 2 | Novo cliente | Cadastrar com plano e app | Mensalidade criada; onboarding opcional |
| 3 | Cadastro incompleto | Dashboard → alerta → filtro | Lista só clientes com pendência |
| 4 | Pagamento | Financeiro → Pagar | Cobrança some da lista; recibo WhatsApp opcional |
| 5 | Sem cobrança | Cliente com `incluirCobrancas` off | Badge “Sem cobrança”; fora da cobrança diária |
| 6 | CSV | Importar modelo + exportar | Contagem bate; duplicados rejeitados |
| 7 | Cobrança diária | Registrar contato | Seleção mantida após reload |
| 8 | Aplicativo | Editar links de loja | Campos salvos; variáveis na mensagem WhatsApp |
| 9 | Mobile | Clientes, Financeiro, Vencimentos, Cobrança Diária e Detalhes do cliente | Cards legíveis; ações funcionam |
| 10 | Sync | Editar plano/app em outra aba | Modal recarrega catálogo ao abrir |

### Backup recomendado (produção)

- Baixe o SQLite periodicamente em **Configurações → Backup** (`GET /api/sistema/backup`).
- **Desenvolvimento (Windows):** cópia local com `npm run db:backup` em `crm_back` (salva em `crm_back/backups/`).
- **Backup automático diário:** PowerShell **como Administrador** → `npm run db:backup:install` (02:00, retém 30 dias). Remover: `npm run db:backup:remove`.
- Antes de `db:push` ou alterações no schema, faça cópia de `crm_back/prisma/dev.db`.
- Após mudança no schema: pare o backend, rode `npm run db:refresh` e reinicie.

---

## 11. Solução de Problemas

### App / APK mostra "API offline"

1. No PC: `npm run api:status` — se offline, `npm run api:ensure`
2. Se nunca configurou auto-start: `npm run api:setup` (uma vez)
3. Firewall: PowerShell admin → `cd crm_back` → `npm run firewall:api`
4. Tailscale ligado nos dois dispositivos; teste `http://100.x.x.x:3001/health` no celular
5. Logs: `crm_back/logs/api-startup.log` e `api-ensure.log`

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

### Automações WhatsApp não enviam

- Confirme `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` em `crm_back/.env`.
- Reinicie o backend após alterar o `.env`.
- Templates Meta aprovados como **Utility** com nomes `crm_lembrete` e `crm_cobranca` (ou os configurados em Automações).
- Cada template precisa de **5 variáveis** no corpo (nome, referência, valor, vencimento, PIX).
- Webhook Meta: `https://SEU-TUNNEL/api/webhook/whatsapp` com verify token do `.env`.
- PC ligado nos horários configurados; agendador interno ativo (`AUTOMACAO_SCHEDULER=true`).
- Teste manual: Automações → **Executar agora**.

### Build Angular falha após upgrade de dependências

- Angular fixado em **17.3.x** — não atualize para 18+ sem revisar breaking changes do Ionic.
- Tailwind fixado em **3.4.x** — configuração em `tailwind.config.js` (não v4).

---

## 12. Roadmap / Melhorias Futuras

Itens ainda não implementados ou parciais:

- **PostgreSQL** em produção com migrations Prisma versionadas (`db:migrate`)
- **Multi-usuário** com perfis/permissões (hoje apenas um admin JWT)

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
