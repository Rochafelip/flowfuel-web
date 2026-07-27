# Design: Página de ativação de conta + wizard de cadastro de veículo (paridade com o mobile)

**Data:** 2026-07-26
**Status:** aprovado

## Contexto

O app mobile (`flowfuel-app`, Kotlin/Compose) tem duas telas que o frontend web (`flowfuel-frontend`, Vite/React/TS) não replica hoje:

1. **Ativação de conta** (`CheckEmailScreen`/`CheckEmailViewModel`): depois do registro, o mobile mostra uma tela dedicada com reenvio de email (com cooldown) e campo pra colar o código de ativação. No web, `Register.tsx` só mostra um toast ("verifique seu email") e manda direto pro `/login` — **não existe nenhuma forma de ativar a conta pela web**.
2. **Cadastro de veículo** (`AddVehicleScreen`/`AddVehicleViewModel`): wizard de 4 etapas (identificação com busca FIPE → classificação energia/combustível → detalhes placa/cor/km/capacidade → foto). No web, `VehicleNew.tsx` é um form single-page que já tem a busca FIPE (marca/modelo/ano, mas só carros, direto na API pública `parallelum.com.br`) e uns poucos campos soltos — faltam tipo de veículo, tipo de energia, tipo de combustível condicional, capacidade de tanque/bateria condicional, formatação de placa e foto.

Investigação do backend (`flowfuel`, Spring Boot, repo separado) confirmou que **nenhuma mudança de backend é necessária**:

- `POST /auth/activate` já existe, recebe `{ token }`, retorna `TokenPairResponse` (`accessToken`/`refreshToken`) — mesmo shape do login.
- `POST /auth/resend-activation` já existe, recebe `{ email }`, sempre responde com mensagem genérica (anti-enumeração), sem rate limit explícito hoje.
- O email de ativação (`SmtpAccountActivationNotifier`) **não manda link clicável** — manda só um código de 6 dígitos pra colar manualmente. O campo `linkBaseUrl` existe mas não é usado no corpo do email hoje. Isso significa que o fluxo primário no web é "colar código", igual ao campo manual que o mobile já tem — sem depender de nenhum link/deep link.
- `POST /vehicles` já aceita todos os campos do wizard mobile (`type`, `energyType`, `fuelSubType`, `currentKm`, `capacity`, `batteryCapacity`, `brand`, `model`, `manufactureYear`, `modelYear`, `color`, `licensePlate`).
- `POST /vehicles/{id}/photo` já existe (multipart).

Existe um plano antigo (`docs/superpowers/plans/2026-06-24-activation-deep-link.md`) de quando este repo ainda era Expo/React Native — foi substituído pela migração "web-only" (`2026-07-25-web-only-migration-design.md`) e não se aplica à estrutura atual (Vite + `react-router-dom`, rotas em `src/routes/*.tsx`).

## Decisões de escopo (confirmadas com o usuário)

- As duas features são desenhadas numa spec só, mas seguem sendo dois blocos de trabalho relativamente independentes dentro do plano de implementação.
- O cadastro de veículo vira um **wizard de 4 etapas fiel ao mobile** (mesma divisão de steps, mesmas validações por etapa).
- **Diferença deliberada do mobile:** a foto do veículo é **opcional** no web (o mobile exige foto pra concluir, com um botão "pular" que gera uma imagem-modelo local). No web, sem foto é só... sem foto — não faz sentido gerar um placeholder artificial, e câmera/galeria são menos naturais em desktop. Sem editor de recorte (crop) — só input de arquivo + preview circular, igual ao padrão HTML5 mais simples.

## Feature 1 — Ativação de conta

### Fluxo

1. Usuário se registra em `/register` (já existe, sem mudança na validação do form).
2. Ao invés de toast + `/login`, `Register.tsx` navega para `/activate?email=<email>`.
3. `/activate` (rota pública, fora do `ProtectedRoute`, ao lado de `/login` e `/register`) mostra:
   - Ícone + título + "Enviamos um código de ativação para **{email}**" + instrução + aviso de checar spam (mesma composição textual da `CheckEmailScreen`, adaptada pra web).
   - Botão "Reenviar código" — chama `resendActivationRequest(email)`; cooldown de 30s (client-side, fixo — não há retry-after do backend hoje, então não há necessidade de parsear header `Retry-After`).
   - Link/botão secundário "Já ativei, entrar" → navega pra `/login`.
   - Campo de texto pra colar o código + botão "Ativar" — chama `activateRequest(token)`.
   - Suporte a `?token=...` na querystring: se presente, pré-preenche o campo (não autoativa sozinho — mantém consistência com o comportamento do campo manual; deixa a porta aberta caso o backend um dia volte a mandar link clicável usando `linkBaseUrl`).
4. Ativação bem-sucedida: `activateRequest` retorna `{ accessToken, refreshToken, ... }` → chama `signIn(accessToken)` (mesmo padrão do `Login.tsx`) → toast de sucesso → navega pra `/` (login automático, sem precisar digitar email/senha de novo — paridade com o `ActivatedAndLoggedIn` do mobile).
5. Erros:
   - Reenvio: qualquer falha de rede vira toast de erro; sucesso vira toast "Código reenviado" (variante `success`, já que `ToastContext` só tem `success`/`error`, sem `info`).
   - Ativação: resposta 401 (`AUTH_ACTIVATION_INVALID`) → mensagem "Código inválido ou expirado." exibida como erro inline no campo (não como toast, pro usuário poder corrigir e tentar de novo sem perder contexto) — lida a partir do `detail` do corpo `ProblemDetail` (RFC 7807) quando presente, com fallback pro texto fixo.

### Arquivos

- **Criar** `src/routes/Activate.tsx`: componente da tela, usa `useSearchParams` pra ler `email`/`token`, `useAuth().signIn`, `useToast().showToast`.
- **Modificar** `src/services/api.ts`: adicionar `resendActivationRequest(email: string)` e `activateRequest(token: string)`, seguindo o padrão de `loginRequest`/`registerRequest` já existentes (mesmo `BASE_URL`, mesmo tratamento de erro tentando ler o corpo JSON).
- **Modificar** `src/routes/Register.tsx`: trocar o `showToast(...) + navigate('/login')` do sucesso por `navigate(\`/activate?email=${encodeURIComponent(email)}\`)`.
- **Modificar** `src/App.tsx`: adicionar `<Route path="/activate" element={<Activate />} />` ao lado de `/login` e `/register` (fora do `ProtectedRoute`).

## Feature 2 — Wizard de cadastro de veículo

### Estrutura (mesma divisão do mobile)

- **Etapa 1 — Identificação:** toggle Carro/Moto (`SegmentedToggle`, já existe); busca FIPE (marca → modelo → ano) com fallback "Não encontrou? Preencher manualmente" que troca os `<select>` por `TextField`s de texto livre; ano de fabricação (numérico, 4 dígitos).
- **Etapa 2 — Classificação:** tipo de energia (Combustão/Elétrico/Híbrido, como cards ou segmented — reaproveitando `SegmentedToggle` com 3 opções); tipo de combustível (chips, só visível se Combustão ou Híbrido): Gasolina comum / Etanol / Diesel / Flex / GNV.
- **Etapa 3 — Detalhes:** placa (com máscara visual — insere `-` após a 3ª posição só no formato antigo `AAA9999`, sem mexer no formato Mercosul `AAA9A99`), cor, km atual, capacidade do tanque (L, só se Combustão/Híbrido), capacidade da bateria (kWh, só se Elétrico/Híbrido). Botão "Preencher depois" pula a validação da placa e avança pra etapa 4 (mesmo comportamento do mobile).
- **Etapa 4 — Foto (opcional):** input de arquivo + preview circular; sem crop. Sem foto = segue em frente normalmente, não há botão "pular" separado.

### Validação por etapa (replicando `AddVehicleViewModel.onNextStep`)

| Etapa | Regra pra avançar |
|---|---|
| 1 | marca e modelo não-vazios (via FIPE ou manual); ano de fabricação e ano do modelo com 4 dígitos numéricos válidos |
| 2 | sempre pode avançar (energia tem default, combustível só relevante se energia mostrar) |
| 3 | placa com 7 caracteres — **ou** clicou em "Preencher depois" |
| 4 | submit sempre habilitado (foto opcional) |

### FIPE para motos

`services/fipe.ts` hoje só bate em `/carros/...`. Estende pra receber o segmento (`'carros' | 'motos'`) como parâmetro, espelhando `FipeRepositoryImpl.toFipePath()` do mobile. `useFipeSelection` passa a receber `vehicleType` e resetar marca/modelo/ano ao trocar de tipo (mesmo `onVehicleTypeChange` do mobile).

### Submissão

1. `POST /vehicles` com todos os campos (`type`: `"Carro"`/`"Moto"`; `energyType`: `"COMBUSTION"`/`"ELECTRIC"`/`"HYBRID"`; `fuelSubType`: um de `"Gasolina comum"`/`"Etanol"`/`"Diesel"`/`"Flex"`/`"GNV"` ou omitido; `capacity` = tanque; `batteryCapacity` = bateria).
2. Se houver arquivo de foto selecionado: `POST /vehicles/{id}/photo` (multipart). Falha no upload de foto **não** desfaz o cadastro do veículo — só mostra um toast de aviso ("Veículo cadastrado, mas a foto não pôde ser enviada.").
3. `PUT /vehicles/{id}/active` (comportamento já existente do `VehicleNew.tsx` atual).
4. `loadActiveVehicle()` + toast de sucesso + `navigate('/')`.

### Arquivos

- **Modificar** `src/routes/VehicleNew.tsx`: reescrito como wizard (estado `currentStep`, componentes locais `Step1`/`Step2`/`Step3`/`Step4`/`WizardStepper`/`EnergyTypeSelector`/`FuelTypeChips`, mesmo padrão de arquivo único que o mobile usa em `AddVehicleScreen.kt`).
- **Modificar** `src/services/fipe.ts`: parametrizar por tipo de veículo.
- **Modificar** `src/hooks/useFipeSelection.ts`: aceitar `vehicleType`, resetar cascata ao trocar.
- **Reaproveitar sem mudança:** `SegmentedToggle`, `TextField`, `Button`, `Screen`, `useVehicle().loadActiveVehicle`, `useToast`.

## Fora de escopo

- Mudança no backend (link clicável de ativação, rate limit no reenvio) — email de código já cobre o fluxo.
- Crop/recorte de foto — só upload simples.
- Placeholder de foto gerado automaticamente quando não há foto — no web, "sem foto" é um estado válido, não um substituto visual.
- Refresh token automático / renovação de sessão — mantém o padrão atual do `AuthContext` (só `accessToken` em `localStorage`).
- Alterar o form de registro em si (`Register.tsx` já está correto na validação de campos).

## Critérios de aceitação

- Registrar uma conta nova leva para `/activate?email=...` (não mais toast + `/login`).
- `/activate` reenvia o código (com cooldown de 30s) e ativa a conta colando o código, logando automaticamente e indo para `/`.
- Código inválido/expirado mostra erro inline sem perder o que foi digitado.
- `/vehicles/new` é um wizard de 4 etapas com FIPE pra carro e moto, campos condicionais de energia/combustível/capacidade, máscara de placa, e foto opcional sem crop.
- Veículo cadastrado sem foto funciona normalmente (foto é 100% opcional).
- `npx tsc --noEmit` (ou o comando de type-check equivalente já usado no repo) passa sem erros novos.
