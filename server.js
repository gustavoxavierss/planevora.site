/**
 * PlanevoraAI — Backend de Controle de Acesso
 * ============================================
 * - Recebe webhooks do PerfectPay
 * - Gera tokens de acesso únicos
 * - Envia e-mail com token para o aluno
 * - Controla expiração de assinaturas
 * - API de validação de token
 *
 * INSTALAÇÃO:
 *   npm install
 *   cp .env.example .env  (preencha as variáveis)
 *   node server.js
 *
 * DEPLOY SUGERIDO: Railway.app, Render.com ou VPS
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'data', 'users.json');

// ══════════════════════════════════════════════════════
// MIDDLEWARES
// ══════════════════════════════════════════════════════
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ══════════════════════════════════════════════════════
// DATABASE (JSON file — simples e sem dependências)
// Em produção, substitua por PostgreSQL ou Supabase
// ══════════════════════════════════════════════════════
function ensureDB() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }));
}
function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function findUserByToken(token) {
  const db = readDB();
  return db.users.find(u => u.token === token);
}
function findUserByEmail(email) {
  const db = readDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}
function saveUser(user) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) db.users[idx] = user;
  else db.users.push(user);
  writeDB(db);
}

// ══════════════════════════════════════════════════════
// TOKEN GENERATOR
// Formato: premium-ABC12-XYZ89
// ══════════════════════════════════════════════════════
function generateToken(plan) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${plan}-${part(5)}-${part(5)}`;
}

// ══════════════════════════════════════════════════════
// E-MAIL (Nodemailer — use Gmail OAuth2 ou SMTP próprio)
// ══════════════════════════════════════════════════════
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // App Password do Gmail
  },
});

async function sendAccessEmail({ to, token, plan, expiresAt }) {
  const planNames = { basic: 'Básico', premium: 'Premium', lifetime: 'Vitalício' };
  const planName = planNames[plan] || plan;
  const appUrl = process.env.APP_URL || 'https://planevoraai.app';
  const loginUrl = `${appUrl}?token=${token}`;
  const expText = plan === 'lifetime' ? 'Vitalício (sem expiração)' :
    `Válido até ${new Date(expiresAt).toLocaleDateString('pt-BR')}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d0a1e;font-family:-apple-system,'Helvetica Neue',sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#7c5ff5,#22d3a5);padding:12px 22px;border-radius:50px">
      <span style="font-size:20px">✦</span>
      <span style="font-family:sans-serif;font-weight:800;font-size:20px;color:#fff">PlanevoraAI</span>
    </div>
  </div>
  <div style="background:#1e1940;border-radius:20px;padding:36px 28px;border:1px solid rgba(124,95,245,.3)">
    <h1 style="color:#f0eeff;font-size:26px;font-weight:800;margin:0 0 8px;text-align:center">🎉 Acesso liberado!</h1>
    <p style="color:#a9a0cc;font-size:15px;line-height:1.7;text-align:center;margin:0 0 28px">Seu pagamento foi confirmado. Use o botão abaixo para entrar na plataforma:</p>
    <div style="background:#261f4e;border-radius:14px;padding:20px;margin-bottom:24px;border:1px solid rgba(124,95,245,.25)">
      <div style="font-size:12px;color:#635d84;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Seu Token de Acesso</div>
      <div style="font-family:monospace;font-size:22px;font-weight:800;color:#a889ff;letter-spacing:3px;word-break:break-all">${token}</div>
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c5ff5,#a855f7);color:#fff;text-decoration:none;padding:15px 34px;border-radius:50px;font-weight:800;font-size:16px">Entrar na PlanevoraAI →</a>
    </div>
    <div style="background:rgba(34,211,165,.08);border:1px solid rgba(34,211,165,.2);border-radius:12px;padding:14px;margin-bottom:20px">
      <div style="color:#22d3a5;font-size:13px;font-weight:700;margin-bottom:4px">Plano: ${planName}</div>
      <div style="color:#a9a0cc;font-size:13px">${expText}</div>
    </div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,.07);margin:20px 0"/>
    <p style="color:#635d84;font-size:12px;line-height:1.7;margin:0">
      📌 <strong style="color:#a9a0cc">Guarde este e-mail</strong> — você precisará do token para acessar.<br/>
      ❓ Precisa de ajuda? <a href="https://wa.me/5577998227790?text=Ol%C3%A1%2C+quero+falar+sobre+minha+assinatura." style="color:#a889ff">WhatsApp (77) 9 9822-7790</a>
    </p>
  </div>
  <p style="text-align:center;color:#635d84;font-size:11px;margin-top:20px">© 2025 PlanevoraAI · IA para Professores</p>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"PlanevoraAI" <${process.env.SMTP_USER}>`,
    to,
    subject: `✦ Seu acesso à PlanevoraAI está pronto! [${planName}]`,
    html,
  });
}

// ══════════════════════════════════════════════════════
// HELPERS DE DATA
// ══════════════════════════════════════════════════════
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function isExpired(user) {
  if (!user) return true;
  if (user.plan === 'lifetime') return false;
  if (!user.expiresAt) return true;
  return new Date() > new Date(user.expiresAt);
}

// ══════════════════════════════════════════════════════
// MAPA DE PRODUTOS PerfectPay → Plano
// Configure com os IDs reais da sua conta PerfectPay
// ══════════════════════════════════════════════════════
const PRODUCT_PLAN_MAP = {
  'PPU38CQ9756': 'basic',    // Plano Básico
  'PPU38CQ9768': 'premium',  // Plano Premium
  'txbM2s':      'lifetime', // Vitalício
  // Adicione mais IDs conforme necessário
};

// ══════════════════════════════════════════════════════
// WEBHOOK PERFECTPAY
// URL para configurar no painel PerfectPay:
//   POST https://sua-api.planevoraai.app/webhook/perfectpay
// ══════════════════════════════════════════════════════
app.post('/webhook/perfectpay', async (req, res) => {
  try {
    const data = req.body;
    console.log('[Webhook PerfectPay]', JSON.stringify(data, null, 2));

    // Verifica token de segurança da PerfectPay
    const token = req.headers['x-perfectpay-token'] || req.headers['authorization'] || '';
    if (process.env.PERFECTPAY_TOKEN && token !== process.env.PERFECTPAY_TOKEN) {
      console.warn('[Webhook] Token inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extrai dados do payload PerfectPay
    // Estrutura típica: data.sale, data.customer, data.product
    const status = data.sale_status || data.status || data.payment_status || '';
    const email = data.customer_email || data.email ||
                  data.customer?.email || data.buyer?.email || '';
    const productId = data.product_code || data.product?.code ||
                      data.sale?.product_code || '';
    const txId = data.sale_code || data.transaction_id || data.order_id || '';

    // Só processa pagamentos aprovados
    const approvedStatuses = ['approved', 'paid', 'complete', 'APROVADO', 'PAGO', '1'];
    const isApproved = approvedStatuses.some(s =>
      String(status).toLowerCase().includes(s.toLowerCase()) || status === s
    );

    if (!isApproved) {
      console.log(`[Webhook] Status ignorado: ${status}`);
      return res.json({ ok: true, ignored: true, status });
    }

    if (!email) {
      console.warn('[Webhook] E-mail não encontrado no payload');
      return res.status(400).json({ error: 'Email não encontrado' });
    }

    // Determina o plano pelo ID do produto
    const plan = PRODUCT_PLAN_MAP[productId] || 'basic';
    const now = new Date();

    // Verifica se usuário já existe
    let user = findUserByEmail(email);

    if (user) {
      // Renova assinatura
      if (user.plan === 'lifetime') {
        console.log(`[Webhook] Usuário ${email} já tem vitalício`);
        return res.json({ ok: true, message: 'Already lifetime' });
      }
      // Atualiza plano e expira
      user.plan = plan;
      user.updatedAt = now.toISOString();
      if (plan === 'lifetime') {
        user.expiresAt = null;
      } else {
        // Renova a partir de hoje OU do fim da assinatura atual, o que for maior
        const currentExp = user.expiresAt ? new Date(user.expiresAt) : now;
        const base = currentExp > now ? currentExp : now;
        user.expiresAt = addDays(base, 30).toISOString();
      }
      user.lastPaymentId = txId;
      user.renewedAt = now.toISOString();
    } else {
      // Novo usuário
      const accessToken = generateToken(plan);
      user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        token: accessToken,
        plan,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: plan === 'lifetime' ? null : addDays(now, 30).toISOString(),
        active: true,
        lastPaymentId: txId,
      };
    }

    saveUser(user);
    console.log(`[Webhook] Usuário ${email} → plano ${plan} → expira ${user.expiresAt || 'nunca'}`);

    // Envia e-mail
    try {
      await sendAccessEmail({
        to: email,
        token: user.token,
        plan: user.plan,
        expiresAt: user.expiresAt,
      });
      console.log(`[Email] Enviado para ${email}`);
    } catch (emailErr) {
      console.error('[Email] Erro ao enviar:', emailErr.message);
      // Não falha o webhook por causa de erro de e-mail
    }

    res.json({ ok: true, message: 'Acesso processado', plan });
  } catch (err) {
    console.error('[Webhook] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// WEBHOOK LOWIFY (para o vitalício)
// ══════════════════════════════════════════════════════
app.post('/webhook/lowify', async (req, res) => {
  try {
    const data = req.body;
    console.log('[Webhook Lowify]', JSON.stringify(data, null, 2));

    const status = String(data.status || data.payment_status || '').toLowerCase();
    const email = data.email || data.customer_email || data.buyer_email || '';
    const productId = data.product_id || 'txbM2s';
    const txId = data.transaction_id || data.order_id || '';

    if (!['paid', 'approved', 'complete', '1'].includes(status)) {
      return res.json({ ok: true, ignored: true });
    }
    if (!email) return res.status(400).json({ error: 'Email não encontrado' });

    const plan = PRODUCT_PLAN_MAP[productId] || 'lifetime';
    const now = new Date();
    let user = findUserByEmail(email);

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        token: generateToken(plan),
        plan, createdAt: now.toISOString(), updatedAt: now.toISOString(),
        expiresAt: null, active: true, lastPaymentId: txId,
      };
    } else {
      user.plan = 'lifetime'; user.expiresAt = null; user.updatedAt = now.toISOString();
    }

    saveUser(user);

    try {
      await sendAccessEmail({ to: email, token: user.token, plan: user.plan, expiresAt: null });
    } catch (e) { console.error('[Email Lowify]', e.message); }

    res.json({ ok: true, plan });
  } catch (err) {
    console.error('[Webhook Lowify]', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// DEVICE FINGERPRINT HELPERS
// ══════════════════════════════════════════════════════
function getStoredFingerprint(token) {
  const db = readDB();
  const user = db.users.find(u => u.token === token);
  return user?.deviceFingerprint || null;
}
function storeFingerprint(token, fp) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.token === token);
  if (idx >= 0) {
    db.users[idx].deviceFingerprint = fp;
    db.users[idx].deviceLinkedAt = new Date().toISOString();
    writeDB(db);
  }
}
function revokeAccess(token, reason) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.token === token);
  if (idx >= 0) {
    db.users[idx].active = false;
    db.users[idx].revokedAt = new Date().toISOString();
    db.users[idx].revokeReason = reason;
    writeDB(db);
    console.log(`[Security] Token revogado: ${token} — ${reason}`);
  }
}

// ══════════════════════════════════════════════════════
// API: VALIDAR TOKEN (chamado pelo frontend — sessão existente)
// POST /api/auth/validate { token, fingerprint }
// ══════════════════════════════════════════════════════
app.post('/api/auth/validate', (req, res) => {
  const { token, fingerprint } = req.body || {};
  if (!token) return res.status(400).json({ valid: false, error: 'Token obrigatório' });

  const user = findUserByToken(token);
  if (!user) return res.json({ valid: false, error: 'Token não encontrado' });
  if (!user.active) return res.json({ valid: false, revoked: true, error: 'Conta suspensa' });

  // Verifica expiração
  if (isExpired(user)) {
    return res.json({ valid: false, expired: true, expiresAt: user.expiresAt });
  }

  // Verifica dispositivo
  if (fingerprint) {
    const stored = user.deviceFingerprint;
    if (!stored) {
      // Primeiro acesso após login — registra o dispositivo
      storeFingerprint(token, fingerprint);
    } else if (stored !== fingerprint) {
      // Dispositivo diferente — possível compartilhamento!
      // Política: revoga o token para AMBOS (original perde acesso também)
      revokeAccess(token, 'device_mismatch_on_validate');
      return res.json({
        valid: false,
        deviceMismatch: true,
        error: 'Token usado em dispositivo diferente do registrado. Acesso revogado por segurança.'
      });
    }
  }

  res.json({
    valid: true,
    user: { email: user.email, plan: user.plan, expiresAt: user.expiresAt, createdAt: user.createdAt }
  });
});

// ══════════════════════════════════════════════════════
// API: LOGIN COM TOKEN (primeiro uso / modal de acesso)
// POST /api/auth/login { token, fingerprint }
// ══════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { token, fingerprint } = req.body || {};
  if (!token) return res.status(400).json({ success: false, error: 'Token obrigatório' });

  const user = findUserByToken(token);
  if (!user) return res.json({ success: false, error: 'Token inválido ou não encontrado' });
  if (!user.active) {
    return res.json({
      success: false,
      revoked: true,
      error: 'Este token foi revogado. Entre em contato com o suporte.'
    });
  }

  if (isExpired(user)) {
    return res.json({
      success: false, expired: true, expiresAt: user.expiresAt,
      error: 'Assinatura expirada. Renove para continuar.'
    });
  }

  // Verifica / vincula dispositivo
  if (fingerprint) {
    const stored = user.deviceFingerprint;
    if (!stored) {
      // Primeiro uso: vincula este dispositivo ao token
      storeFingerprint(token, fingerprint);
      console.log(`[Device] Token ${token.slice(0,12)}... vinculado ao dispositivo ${fingerprint.slice(0,8)}...`);
    } else if (stored !== fingerprint) {
      // Token sendo usado em dispositivo diferente do registrado
      // Incrementa contador de tentativas suspeitas
      const db = readDB();
      const idx = db.users.findIndex(u => u.token === token);
      if (idx >= 0) {
        db.users[idx].suspiciousAttempts = (db.users[idx].suspiciousAttempts || 0) + 1;
        const attempts = db.users[idx].suspiciousAttempts;
        // Após 2 tentativas em dispositivos diferentes → revoga
        if (attempts >= 2) {
          db.users[idx].active = false;
          db.users[idx].revokedAt = new Date().toISOString();
          db.users[idx].revokeReason = `device_mismatch_${attempts}_attempts`;
          writeDB(db);
          return res.json({
            success: false, deviceMismatch: true,
            error: 'Token bloqueado por uso em múltiplos dispositivos. Contate o suporte.'
          });
        }
        writeDB(db);
      }
      return res.json({
        success: false, deviceMismatch: true,
        error: 'Este token já está vinculado a outro dispositivo. Acesso negado.'
      });
    }
  }

  res.json({
    success: true,
    session: { token: user.token, email: user.email, plan: user.plan, expiresAt: user.expiresAt }
  });
});

// ══════════════════════════════════════════════════════
// ADMIN: Criar usuário manual (protegido por senha)
// POST /admin/create-user
// ══════════════════════════════════════════════════════
app.post('/admin/create-user', (req, res) => {
  const adminPass = req.headers['x-admin-key'];
  if (adminPass !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { email, plan, days } = req.body;
  if (!email || !plan) return res.status(400).json({ error: 'email e plan obrigatórios' });

  const now = new Date();
  const token = generateToken(plan);
  const exp = plan === 'lifetime' ? null : addDays(now, days || 30).toISOString();

  const user = {
    id: crypto.randomUUID(), email: email.toLowerCase(), token, plan,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
    expiresAt: exp, active: true, manuallyCreated: true,
  };
  saveUser(user);
  res.json({ success: true, token, expiresAt: exp });
});

// ══════════════════════════════════════════════════════
// CRON: Verificação diária de expirados
// Chame esta rota com um cron job a cada hora
// GET /admin/check-expired (com header x-admin-key)
// ══════════════════════════════════════════════════════
app.get('/admin/check-expired', (req, res) => {
  const adminPass = req.headers['x-admin-key'];
  if (adminPass !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const db = readDB();
  const now = new Date();
  let deactivated = 0;

  db.users.forEach(user => {
    if (user.plan !== 'lifetime' && user.active && user.expiresAt) {
      if (now > new Date(user.expiresAt)) {
        user.active = false;
        user.deactivatedAt = now.toISOString();
        deactivated++;
      }
    }
  });

  writeDB(db);
  console.log(`[Cron] ${deactivated} usuário(s) desativado(s)`);
  res.json({ ok: true, deactivated, checked: db.users.length });
});

// ══════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ══════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n✦ PlanevoraAI Backend rodando na porta ${PORT}`);
  console.log(`   Webhooks:  POST /webhook/perfectpay`);
  console.log(`              POST /webhook/lowify`);
  console.log(`   Auth API:  POST /api/auth/validate`);
  console.log(`              POST /api/auth/login`);
  console.log(`   Admin:     POST /admin/create-user`);
  console.log(`              GET  /admin/check-expired\n`);
});
