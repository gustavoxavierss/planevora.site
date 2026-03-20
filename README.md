# ✦ PlanevoraAI — Guia Completo de Deploy

## Arquivos entregues

```
planevoraAI/
├── index.html      ← Landing page + sistema de acesso (frontend)
├── server.js       ← Backend: webhook + auth + e-mail
├── package.json    ← Dependências do backend
├── .env.example    ← Variáveis de ambiente (configure e renomeie para .env)
└── README.md       ← Este arquivo
```

---

## 1️⃣ Frontend (Landing Page)

### Deploy no Vercel (recomendado — grátis)

1. Crie uma conta em **vercel.com**
2. Arraste a pasta `planevoraAI` para o painel do Vercel
3. Clique em **Deploy**
4. Seu site estará em `https://planevoraai.vercel.app` (ou domínio próprio)

### GitHub Pages
1. Crie um repositório no GitHub
2. Faça upload do `index.html`
3. Ative GitHub Pages nas configurações do repositório

---

## 2️⃣ Backend (Servidor de Webhook + Auth)

### Deploy no Railway.app (recomendado — grátis para começar)

1. Acesse **railway.app** e crie conta
2. Clique em **New Project → Deploy from GitHub**
3. Faça upload dos arquivos do backend (`server.js`, `package.json`, `.env`)
4. Configure as variáveis de ambiente (copie do `.env.example`)
5. O Railway dará uma URL como `https://planevoraai-backend.railway.app`

### Deploy no Render.com (alternativa grátis)
1. Acesse **render.com**
2. Crie um novo **Web Service**
3. Conecte ao GitHub com os arquivos do backend
4. Configure as variáveis de ambiente
5. Build command: `npm install`
6. Start command: `node server.js`

---

## 3️⃣ Configurar Webhook na PerfectPay

1. Acesse o painel da **PerfectPay**
2. Vá em **Configurações → Webhook**
3. Adicione a URL:
   ```
   https://SUA-API.railway.app/webhook/perfectpay
   ```
4. Selecione os eventos: **Venda Aprovada** e **Renovação**
5. Token de autenticação: `15b094944fe6e42a6300a4185553c548`

---

## 4️⃣ Configurar Webhook na Lowify (vitalício)

1. Painel da **Lowify**
2. Webhook URL:
   ```
   https://SUA-API.railway.app/webhook/lowify
   ```

---

## 5️⃣ Atualizar a URL da API no Frontend

Abra o `index.html` e localize:

```javascript
const API_URL = 'https://sua-api.planevoraai.app';
```

Troque pela URL do seu Railway/Render:

```javascript
const API_URL = 'https://planevoraai-backend.railway.app';
```

---

## 6️⃣ Configurar E-mail (Gmail)

1. Acesse **myaccount.google.com**
2. Segurança → Verificação em 2 etapas (ative se não tiver)
3. Segurança → Senhas de apps
4. Crie uma senha de app para "E-mail"
5. Copie os 16 caracteres e cole em `SMTP_PASS` no `.env`

---

## 7️⃣ Cron Job (verificar assinaturas expiradas)

Configure um cron para chamar a cada hora:

**No Railway.app:**
- Adicione um cron service:
  ```
  0 * * * * curl -H "x-admin-key: SUA_SENHA" https://sua-api.railway.app/admin/check-expired
  ```

**Grátis via cron-job.org:**
1. Crie conta em **cron-job.org**
2. Novo cron job:
   - URL: `https://sua-api.railway.app/admin/check-expired`
   - Header: `x-admin-key: SUA_SENHA`
   - Frequência: A cada hora

---

## 8️⃣ Criar usuário manualmente (testes)

```bash
curl -X POST https://sua-api.railway.app/admin/create-user \
  -H "Content-Type: application/json" \
  -H "x-admin-key: SUA_SENHA" \
  -d '{"email":"teste@email.com","plan":"premium","days":30}'
```

---

## Formato dos tokens

Os tokens de acesso seguem o padrão:

```
premium-ABC12-XYZ89
basic-DEF34-UVW56
lifetime-GHI78-RST90
```

O usuário recebe este token por e-mail e cola no modal de login do site.

---

## Fluxo completo

```
Cliente paga → PerfectPay/Lowify confirma →
Webhook chama servidor → Servidor cria token →
Envia e-mail com token → Cliente cola token no site →
Sistema verifica → Acesso liberado ✓

Próximo mês → Sistema verifica expiração →
Se não renovou → Acesso bloqueado →
Aparece tela de renovação + WhatsApp
```

---

## Suporte
WhatsApp: (77) 9 9822-7790
