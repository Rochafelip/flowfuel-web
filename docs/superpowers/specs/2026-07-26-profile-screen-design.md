# Design: Tela de Perfil (perfil, editar perfil, trocar senha) no web

**Data:** 2026-07-26
**Status:** aprovado

## Contexto

O app mobile (`flowfuel-app`, Kotlin/Compose) tem um cluster de telas de perfil completo: `ProfileScreen` (hub — avatar, dados, estatísticas, ações, zona de perigo), `EditProfileScreen` (editar nome/telefone) e `ChangePasswordScreen` (trocar senha). O frontend web (`flowfuel-frontend`, Vite/React/TS) **não tem nenhuma dessas telas hoje** — e, mais grave, **não tem nenhum jeito de fazer logout em lugar nenhum do app** (nem botão, nem menu).

Investigação do backend (`flowfuel`, Spring Boot, repo separado) confirmou que nenhuma mudança de backend é necessária — todos os endpoints usados pelo mobile já existem e cobrem o que o web precisa.

Duas decisões técnicas não-óbvias, resolvidas nesta spec:

1. **De onde vem o `userId`:** os endpoints de perfil são `/auth/{userId}/...`, mas o `AuthContext` do web (`src/context/AuthContext.tsx`) só guarda o token puro (`token: string | null`), sem `userId`. O JWT emitido pelo backend (`JwtUtil.generateToken`) inclui um claim `userId` no payload — e como JWT não é criptografado (só assinado), dá pra ler esse claim no cliente com um decode base64url simples, sem tocar no backend nem no `AuthContext`.
2. **Como mostrar o avatar:** `GET /auth/{userId}/profile` devolve `profilePicture` como um path interno (`/auth/{userId}/profile-picture`), que exige `Authorization` e responde com **redirect 302** pra uma URL pública de storage (`UserProfileService.getProfilePictureUrl` → `storageService.publicUrl(key)`). Um `<img src>` não manda header de auth, então a imagem é buscada via `fetch()` autenticado (que segue o redirect sozinho), convertida em blob e usada como `URL.createObjectURL()` — mesmo espírito "sem complexidade extra" da decisão já tomada pra foto do veículo (upload simples, sem crop).

## Escopo confirmado com o usuário

- **Incluído:** ver dados do perfil (nome, email, telefone, membro desde) + avatar (upload/remover, sem crop) + estatísticas (veículos/abastecimentos/eventos); editar perfil (nome/telefone); trocar senha; excluir conta (zona de perigo, com confirmação digitando "DELETE"); logout — tanto na tela de perfil quanto num item novo na `Sidebar`/`MobileDrawer`.
- **Fora de escopo:** convites de compartilhamento de veículo pendentes e configuração de notificações push do sistema — nenhuma das duas features existe no web ainda (compartilhamento de veículo é 100% mobile-only hoje; push web exigiria Service Worker + Web Push API, um projeto à parte).

## Contratos de backend usados (nenhuma mudança)

- `GET /auth/{userId}/profile` → `{ id, email, name, phone, profilePicture, createdAt, updatedAt }` (`profilePicture` é o path interno `/auth/{userId}/profile-picture` ou `null`)
- `PUT /auth/{userId}/profile` com `{ email?, name, phone }` → mesmo shape de resposta
- `PUT /auth/{userId}/password` com `{ currentPassword, newPassword }` → `204`
- `POST /auth/{userId}/upload-profile-picture` (multipart, campo `file`) → `{ internalUrl }`
- `DELETE /auth/{userId}/profile-picture` → `204`
- `GET /auth/{userId}/profile-picture` → `302` (redirect pra URL pública) ou `204` se não houver foto
- `DELETE /auth/{userId}` → exclui a conta
- **Estatísticas: sem endpoint dedicado.** Replico a agregação client-side do mobile (`GetProfileStatsUseCase`): `GET /vehicles` pra listar os veículos do usuário, depois `GET /refuels/vehicle/{id}?page=0&size=1` e `GET /vehicle-events/vehicle/{id}?page=0&size=1` por veículo, somando o campo `totalElements` de cada resposta (o `size=1` é só pra pegar o `totalElements` da paginação sem baixar a lista inteira).

## Feature 1 — Decodificação do `userId` a partir do JWT

`src/lib/jwt.ts` novo: função `decodeUserIdFromToken(token: string): number | null` que faz split do token em `.`, pega o segundo segmento (payload), decodifica base64url (`atob` com replace de `-`/`_`), faz `JSON.parse` e lê `claims.userId`. Retorna `null` em qualquer falha de parsing (token malformado) em vez de lançar — os call sites tratam `null` como "não deu pra carregar o perfil".

## Feature 2 — `/profile`: hub principal

Estrutura de conteúdo (uma página, sem tabs):

1. **Avatar** — círculo clicável, abre um `<input type="file">` oculto (sem crop, mesmo padrão do wizard de veículo). Mostra spinner sobreposto durante upload. Botão "Remover foto" some quando não há foto.
2. **Nome / email** — `profile.name ?? profile.email` em destaque.
3. **Estatísticas** — três números lado a lado: Veículos / Abastecimentos / Eventos (skeleton enquanto carrega, carrega em paralelo ao perfil, não bloqueia o resto da página).
4. **Campos de informação** — Email, Telefone (ou "Não informado"), Membro desde (formatado `dd/mm/aaaa`).
5. **Ações** (linhas clicáveis com chevron): "Editar perfil" → `/profile/edit`; "Trocar senha" → `/profile/change-password`.
6. **Sair** — botão que desloga (`signOut()` do `AuthContext` + `navigate('/login')`), com diálogo de confirmação simples (`useConfirm()` já existente).
7. **Zona de perigo** — botão destrutivo "Excluir conta permanentemente", abre diálogo dedicado (ver Feature 5).

Estado de carregamento: skeleton simples (barras cinza pulsando) enquanto perfil não chegou; estado de erro com botão "Tentar novamente" se `GET /auth/{userId}/profile` falhar.

## Feature 3 — `/profile/edit`

Form com dois campos (Nome, Telefone), pré-preenchido com os dados atuais. Botão "Salvar" desabilitado se nome estiver vazio. Ao salvar com sucesso: toast de sucesso + volta pra `/profile`. Erro do servidor (400 com corpo de validação) mostra a mensagem específica do campo, igual ao padrão de erro já usado no wizard de veículo (`err.detail` do `ProblemDetail`).

Diferente do mobile: **sem diálogo de "descartar alterações não salvas"** ao sair sem salvar — é uma simplificação deliberada pro web (navegação por URL é mais informal que um back-stack de app; YAGNI para o primeiro corte).

## Feature 4 — `/profile/change-password`

Form com três campos (senha atual, nova senha, confirmar nova senha), todos `type="password"`. Validação client-side antes de enviar: todos preenchidos, nova senha ≥ 6 caracteres, nova senha === confirmação. Ao salvar com sucesso: toast de sucesso + volta pra `/profile`. Erro 401 (senha atual errada) mostra mensagem inline no campo "Senha atual".

## Feature 5 — Excluir conta

Diálogo dedicado (não reaproveita o `ConfirmDialog` genérico, que não suporta campo de texto): mostra a lista de consequências (mesmo texto do mobile — dados, histórico de abastecimentos e veículos serão removidos), campo de texto "Digite DELETE para confirmar", botão "Excluir" só habilita quando o campo === `"DELETE"`. Ao confirmar: `DELETE /auth/{userId}` → `signOut()` → `navigate('/login')`.

## Feature 6 — Logout no menu

Adiciona um item "Sair" (ícone + texto) no fim de `NavLinks.tsx` (usado tanto pela `Sidebar` desktop quanto pelo `MobileDrawer` mobile, já que ambos renderizam `NavLinks`), chamando o mesmo fluxo de confirmação + `signOut()` + `navigate('/login')` da Feature 2.

## Arquivos afetados

```
Criar: src/lib/jwt.ts
Criar: src/hooks/useAuthenticatedImage.ts
Criar: src/services/profile.ts
Criar: src/routes/Profile.tsx
Criar: src/routes/ProfileEdit.tsx
Criar: src/routes/ChangePassword.tsx
Criar: src/components/ui/DeleteAccountDialog.tsx
Modificar: src/App.tsx (rotas /profile, /profile/edit, /profile/change-password)
Modificar: src/components/layout/NavLinks.tsx (item "Sair")
```

## Fora de escopo

- Convites de compartilhamento de veículo pendentes (feature não existe no web).
- Notificações push / configuração de notificações do sistema (não existe no web; exigiria Service Worker + Web Push, projeto separado).
- Diálogo de "descartar alterações" no editar perfil.
- Refresh token / renovação automática de sessão (mesma decisão já tomada nas specs anteriores deste repo).
- Crop de avatar (upload simples, mesma decisão da foto de veículo).

## Critérios de aceitação

- `/profile` mostra avatar (com upload/remoção funcionando), nome, email, telefone, membro desde e as três estatísticas corretas.
- "Editar perfil" salva nome/telefone e volta pro hub com toast de sucesso.
- "Trocar senha" valida os três campos e retorna erro claro se a senha atual estiver errada.
- "Excluir conta" só permite confirmar depois de digitar "DELETE", e desloga o usuário após sucesso.
- Existe um jeito de fazer logout tanto na tela de perfil quanto no menu lateral/drawer.
- `npx tsc -b` passa sem erros novos.
