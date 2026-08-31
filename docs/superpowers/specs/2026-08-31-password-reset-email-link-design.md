# Email de redefinição de senha com link + página atualizada — Design

## Contexto

O fluxo de "esqueci minha senha" (spec
[2026-08-31-forgot-password-design.md](2026-08-31-forgot-password-design.md))
está implementado ponta a ponta: telas `ForgotPassword.tsx`/`ResetPassword.tsx`
no frontend, e `SmtpPasswordResetNotifier` no backend (`flowfuel`) enviando o
token de reset por email, hoje apenas como um código de texto para colar
manualmente.

Este design troca esse email por um **link clicável** (botão) que abre
`ResetPassword.tsx` já com o token preenchido, mantendo o campo editável como
fallback.

### Histórico relevante: o mesmo padrão já foi tentado e revertido na ativação de conta

O backend já implementou um fluxo de "magic link" por email para a ativação
de conta (commits `d30e205`, `b9d67de`, `405e2c1`) e depois reverteu para um
código numérico de 6 dígitos colado manualmente (commit `9b54f3d`:
"Replaces the opaque-token magic link with a 6-digit numeric code"),
removendo a infraestrutura de link (`ActivationLinkValidator`,
`ACCOUNT_ACTIVATION_LINK_BASE_URL`). O motivo não ficou documentado em nenhuma
spec, mas o histórico indica que a complexidade extra estava ligada ao deep
link nativo do app Android (mencionado como fora de escopo em
`2026-07-27-activation-auto-submit-magic-link-design.md`).

**Por que isso não se aplica aqui:** redefinição de senha é um fluxo
exclusivamente web (não precisa abrir o app nativo), então a fonte da
complexidade que motivou a reversão na ativação não está presente neste caso.
Decisão consciente de seguir com o link mesmo assim (confirmada com o
usuário).

## Backend (`flowfuel`)

### Nova configuração

`flowfuel.password-reset.link-base-url` (env `PASSWORD_RESET_LINK_BASE_URL`),
default `http://localhost:5173/reset-password` — mesmo padrão do antigo
`ACCOUNT_ACTIVATION_LINK_BASE_URL`.

### `SmtpPasswordResetNotifier`

Monta a URL: `{linkBaseUrl}?token=<url-encoded>&email=<url-encoded>`.

Email reformulado:
- **HTML**: botão "Redefinir senha" em destaque (verde `#16a34a`, cor da
  marca) linkando para a URL montada. Abaixo, texto pequeno e discreto com a
  URL completa como fallback (caso o botão não renderize no cliente de
  email) — mesmo padrão do "discreet fallback link" que existiu no email de
  ativação (commit `6030330`).
- **Plain text**: a URL aparece diretamente no corpo (sem botão, já que texto
  puro não suporta).
- Mantém o aviso de validade (`tokenTtlMinutes`) e o aviso de "se você não
  solicitou, ignore".

### Testes (`SmtpPasswordResetNotifierTest`)

Os três testes atuais (`incluiTokenNoHtml`, `incluiTokenNoPlainText`,
`naoIncluiLinkOuUrl`) refletem o design antigo (código, sem link). Substituir
por:
- `sendResetToken_incluiLinkNoHtml` — HTML contém a URL completa com
  `token=` e `email=`.
- `sendResetToken_incluiLinkNoPlainText` — plain text contém a mesma URL.
- `sendResetToken_urlEncodeEmailComCaracteresEspeciais` — email com `+`/`@`
  aparece corretamente url-encoded na URL gerada (evita token/email
  corrompidos em provedores que decodificam automaticamente).

### Validador fail-fast (prod/staging)

Novo `PasswordResetLinkValidator` (mesmo padrão do antigo
`ActivationLinkValidator`, que pode ser usado como referência mesmo já
removido — ver histórico git): no startup, se o profile ativo for
`prod`/`staging` e `flowfuel.password-reset.link-base-url` apontar para
`localhost`/`127.0.0.1`, falha o boot com uma mensagem clara. Evita subir em
produção enviando emails com link quebrado por esquecimento de configuração.

## Frontend (`flowfuel-frontend`)

### `ResetPassword.tsx`

- Passa a ler `token` da query string também (`useState(searchParams.get('token') ?? '')`),
  igual ao `email` já lido hoje.
- Campo de token continua editável — sem auto-submit. Diferente da tentativa
  de auto-ativação na ativação de conta: aqui o usuário ainda precisa
  escolher e confirmar a nova senha, então clicar em "Redefinir senha" já é
  necessário de qualquer forma; não há ganho em disparar algo automaticamente
  ao montar a página.
- Nenhuma outra mudança de comportamento — `ForgotPassword.tsx` continua
  navegando para `/reset-password?email=...` sem token (o token só chega via
  o link do email).

## Fora de escopo

- Auto-submit ao abrir o link (diferente da ativação, aqui sempre há
  interação humana para definir a nova senha).
- Deep link nativo do app Android (redefinição de senha é só web).
- Mudança no contrato de `POST /auth/reset-password` (continua `{token, newPassword}`).
