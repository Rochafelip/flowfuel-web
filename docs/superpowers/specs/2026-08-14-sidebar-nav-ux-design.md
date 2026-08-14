# Correção de UX do menu de navegação (Sidebar desktop + Drawer mobile)

## Contexto

O usuário compartilhou screenshots do app em produção (desktop e mobile) mostrando o menu lateral. Validado via mockups no companion visual (antes/depois), os seguintes problemas foram aprovados para correção:

1. **Ícone duplicado**: "Abastecimentos" e "Postos" usam o mesmo emoji (⛽), quebrando o escaneamento visual rápido do menu.
2. **"Sair" misturado com navegação**: renderizado na mesma lista, com o mesmo estilo dos itens de página — nada sinaliza que é uma ação diferente (final/destrutiva).
3. **Wayfinding fraco**: o item ativo só muda a cor de fundo; falta um indicador mais forte.
4. **Logo não é link**: "⛽ FlowFuel" não leva ao Dashboard, quebrando o padrão universal "logo = home".
5. **Sem foco de teclado visível** em nenhum item do menu, no logo, ou nos botões de abrir/fechar o drawer mobile.

Decisão explícita: **não** adicionar um rodapé com nome/e-mail do usuário na sidebar. Hoje `AuthContext` só guarda o token — mostrar dados de conta exigiria uma chamada de API extra só para decorar a sidebar, o que não se justifica já que "Perfil" já é um item do menu e cobre esse caso de uso.

## Escopo

- `src/components/layout/NavLinks.tsx` — concentra a maior parte da mudança (ícone de Postos, indicador ativo, separação do "Sair", foco de teclado). É reaproveitado tanto pelo `Sidebar.tsx` (desktop) quanto pelo `MobileDrawer.tsx` (mobile), então a correção se propaga automaticamente para os dois.
- `src/components/layout/Sidebar.tsx` — logo vira link.
- `src/components/layout/MobileDrawer.tsx` — logo vira link; botão de fechar (✕) ganha foco de teclado.
- `src/components/layout/Topbar.tsx` — botão de abrir o drawer (☰) ganha foco de teclado.

Fora de escopo: `VehicleSwitcherLink.tsx` (já tem hover, não foi citado como problema), reestruturação dos itens de navegação (adicionar/remover páginas), rodapé de conta (decisão explícita acima), troca de emojis por ícones SVG (fora do que foi pedido; o app inteiro usa emoji como padrão visual, trocar só aqui criaria inconsistência).

## 1. `NavLinks.tsx`

- **Ícone de "Postos"**: `⛽` → `📍` (pin de localização — reforça que a página é sobre proximidade/geolocalização, e remove a duplicata com "Abastecimentos").
- **Indicador de item ativo**: soma uma borda esquerda de 3px (`border-l-[3px]`) à cor de fundo já existente. Item inativo usa `border-l-[3px] border-transparent` (mesma espessura sempre reservada, pra não deslocar o texto ao ativar/desativar). Ativo: `border-green-600`.
- **Foco de teclado**: todo `NavLink` e o botão "Sair" ganham `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600`.
- **"Sair" isolado**: sai do `<nav>` de itens de página e vira um bloco irmão, separado por `mt-auto` (empurra pro fim do container flex da sidebar/drawer) + `border-t border-gray-100 pt-3 mt-3` (divisória). Estilo muda de "igual aos itens de nav" para neutro-que-fica-vermelho-no-hover: `text-gray-600 hover:bg-red-50 hover:text-red-600 focus-visible:outline-red-600` — comunica "ação diferente" sem precisar de cor vermelha o tempo todo (evita alarme falso constante).
- Isso muda a estrutura de retorno do componente: hoje é um único `<nav>` com todos os itens + botão de sair dentro; passa a ser um `<div className="flex flex-1 flex-col">` contendo o `<nav>` de páginas e, depois, o bloco de "Sair" com `mt-auto`. Isso exige que os componentes-pai (`Sidebar`, `MobileDrawer`) sejam contêineres flex-column com altura completa — ambos já são (`lg:flex lg:flex-col` e `flex flex-col`), então basta que `NavLinks` ocupe `flex-1` dentro deles.

## 2. `Sidebar.tsx`

O `<p>` do logo vira `<Link to="/">` com o mesmo texto/estilo, mais `hover:bg-green-50` e `focus-visible:outline`.

## 3. `MobileDrawer.tsx`

Mesma troca de `<p>` → `<Link to="/" onClick={onClose}>` no logo (precisa fechar o drawer ao navegar, como os demais itens). O botão de fechar (✕) ganha `focus-visible:outline`.

## 4. `Topbar.tsx`

O botão de abrir o drawer (☰) ganha `focus-visible:outline`.

## Fora de escopo / riscos aceitos

- Sem testes automatizados (não há framework de testes no projeto); validação por `npx tsc -b`, `npm run build` e deploy, como no refresh anterior dos cards.
- Mudar a estrutura interna de `NavLinks` (de `<nav>` único para `<div><nav>...</nav><div>Sair</div></div>`) é uma mudança de marcação, não de comportamento — nenhuma rota ou lógica de autenticação é alterada.
