# Design: Reorganizar `Activate.tsx` — fluxo enxuto com fallback manual em modal

**Data:** 2026-07-27
**Status:** aprovado

## Contexto

O app Android (`flowfuel-app`) passou por uma reorganização da tela pós-registro (`CheckEmailScreen`, ver design mobile "Tela de ativação por email — só magic link"): o botão "Ativar conta" no email virou o caminho principal, e o campo de colar código + botão "Ativar com código" — leftover do fluxo antigo — foi movido para dentro de um `FFBottomSheet` secundário, acessível só por quem realmente precisa dele.

A tela equivalente no web, `src/routes/Activate.tsx`, tem o mesmo problema: hoje ela sempre mostra, junto e misturado, o texto de instrução, o aviso de spam, o campo de código e o botão "Ativar conta" — mesmo quando o usuário só precisa abrir o email e clicar no link. `Activate.tsx` já lê `token`/`email` da query string e pré-preenche o campo (linhas 13-19), mas isso não muda a poluição visual da tela.

Este spec cobre a reorganização visual e o fallback manual (decisões 1, 2 e 4 do design mobile). A decisão 3 do mobile (auto-ativar sem exigir clique) já tem spec própria e aprovada neste repositório — `docs/superpowers/specs/2026-07-27-activation-auto-submit-magic-link-design.md` — que adiciona um `useEffect` para chamar `activateRequest` automaticamente quando `token` vem da URL, com um estado de carregamento substituindo o form enquanto a ativação está em andamento. Este spec **não reabre** essa decisão; ele assume que a auto-ativação também será implementada (na mesma leva de trabalho, já que a decisão 4 abaixo depende dela) e descreve como o restante da tela se organiza ao redor dela.

Não existe um componente de "bottom sheet" no design system web atual (`src/components/ui/`) — o mais próximo é `ConfirmDialog.tsx`, um modal centralizado (backdrop, `role="dialog"`, fecha com Escape ou clique fora, disparado por um contexto global `ConfirmContext`). Para este caso, o modal de fallback é local a `Activate.tsx` (sem contexto global), mas reaproveita o mesmo padrão visual e de acessibilidade do `ConfirmDialog`.

## Decisões

1. **Conteúdo principal reorganizado.** Ordem final na tela, sempre visível (quando não há ativação automática em andamento):
   título ("Verifique seu email", inalterado) → subtítulo com o email (inalterado) → aviso único fundido → botão "Reenviar e-mail" → link de texto "Já confirmei, entrar" → link discreto "Problemas para ativar?" (novo, ver decisão 2).

   O aviso único substitui as duas frases atuais:
   - Antes: "Enviamos um código de ativação para {email}." + "Cole o código abaixo para ativar sua conta. Não esqueça de checar a pasta de spam."
   - Depois: "Enviamos um email para {email}." (subtítulo, mantém menção ao email) + aviso fundido: **"Abra o e-mail que enviamos e clique no botão de ativação. Não encontrou? Verifique a caixa de spam ou lixo eletrônico."**

   O botão "Reenviar e-mail" deixa de ser um link de texto (`<button className="... text-green-700">`) e passa a ser `<Button variant="secondary">`, mantendo exatamente a lógica atual (cooldown de 30s, `isResending`, `resendActivationRequest`, toast de sucesso/erro — nada disso muda, só o componente visual).

2. **Fallback manual vira modal.** Novo componente `ManualActivationModal`, em `src/components/ui/ManualActivationModal.tsx`, seguindo o mesmo padrão visual/acessibilidade de `ConfirmDialog.tsx` (`fixed inset-0` + backdrop `bg-black/40` clicável, `role="dialog"` `aria-modal="true"`, fecha com `Escape` ou clique no backdrop, foco inicial no campo do modal ao abrir, foco retorna ao elemento que abriu o modal ao fechar). Recebe como props o necessário para renderizar o form atual (token, tokenError, isActivating, onChange, onSubmit, onClose) — `Activate.tsx` continua dono do estado.

   Dentro do modal: exatamente o bloco que existe hoje na tela principal — `TextField` (placeholder "Código de ativação"), `tokenError` inline em vermelho abaixo, `Button` "Ativar conta"/"Ativando..." — sem nenhuma mudança de comportamento.

   Aberto por um link de texto discreto no fim da tela principal: "Problemas para ativar?". Estado de abertura é local a `Activate.tsx` (`useState<boolean>`), não entra em nenhum contexto global.

3. **Erro de ativação também em toast.** Quando a ativação automática (implementada pela spec de auto-submit) falhar, `Activate.tsx` chama `showToast(message)` (mesma função `useToast()` já usada em `handleResend`) além de setar `tokenError` — porque o campo com o erro inline só é visível se o usuário abrir o modal, e o erro pode acontecer sem que ele tenha feito isso (ativação automática via link do email). Erro de ativação **manual** (usuário abriu o modal e submeteu o form ele mesmo) continua mostrando só o inline — o campo já está visível, toast seria redundante.

## Fora de escopo

- Contrato de API: `activateRequest`, `resendActivationRequest`, formato de request/response (`src/services/api.ts:60-88`) — inalterado.
- A lógica de auto-submit em si (`useEffect` que dispara `activateRequest` ao montar com `token` na URL, estado de carregamento "Ativando sua conta...") — coberta pela spec `2026-07-27-activation-auto-submit-magic-link-design.md`, não redefinida aqui.
- Mudanças de rota (`/activate` continua sendo a mesma rota, registrada em `src/App.tsx`).
- `ConfirmContext`/`ConfirmDialog.tsx` não mudam — `ManualActivationModal` é um componente novo e independente, não uma extensão do dialog de confirmação global.

## Arquivos Afetados

```
src/routes/Activate.tsx           (reescrito: reorganização + integração com o modal)
src/components/ui/ManualActivationModal.tsx   (novo)
```

## Testes

Se este repositório tiver/ganhar testes de componente para rotas (verificar convenção atual antes de implementar):
1. Tela sem `token` na URL renderiza título, subtítulo, aviso fundido, botão "Reenviar e-mail", link "Já confirmei" e link "Problemas para ativar?" — sem campo de código visível.
2. Clicar em "Problemas para ativar?" abre `ManualActivationModal`; `Escape` ou clique no backdrop fecha.
3. Submeter o form dentro do modal com token inválido mostra `tokenError` inline no modal, sem toast adicional.
4. Falha da ativação automática (cenário coberto pela spec de auto-submit) dispara `showToast` com a mensagem de erro, sem abrir o modal sozinho.
5. "Reenviar e-mail" e "Já confirmei, entrar" mantêm o comportamento atual (cooldown, toast de sucesso/erro do reenvio, navegação para `/login`).

## Critérios de Aceitação

- Ao abrir `/activate` sem token na URL, o usuário vê: título, subtítulo com o email, aviso fundido (instrução + spam), botão "Reenviar e-mail", link "Já confirmei, entrar" e um link discreto "Problemas para ativar?" — **sem** campo de código visível por padrão.
- Clicar em "Problemas para ativar?" abre um modal com o campo de código e o botão "Ativar conta", idêntico ao comportamento atual desse par campo+botão (incluindo erro inline).
- Token inválido/expirado/usado, vindo da ativação automática via link do email, mostra o erro como toast — a tela permanece em `/activate`, sem o modal abrir sozinho.
- Ativação manual (usuário abre o modal e cola o código) continua funcionando exatamente como hoje, incluindo erro inline no campo.
- "Reenviar e-mail" e "Já confirmei, entrar" continuam com o comportamento atual, inalterado.
