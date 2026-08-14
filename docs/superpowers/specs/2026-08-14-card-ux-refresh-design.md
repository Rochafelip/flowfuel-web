# Refresh de UX dos cards — Dashboard, Abastecimentos, Eventos, Veículos, Postos

## Contexto

Todos os cards do app (`src/components/ui/Card.tsx`) usam hoje `rounded-xl bg-white p-3 shadow-sm`: sem borda, sombra quase imperceptível, e nenhum estado de hover/focus. Isso foi validado com o usuário via mockups no companion visual (antes/depois do card de abastecimento em `Refuels.tsx`) e o feedback foi para aplicar a mesma correção em todos os outros cards do app: `Home` (dashboard), `Refuels` (abastecimentos), `VehicleEvents`, `Vehicles` (carros) e `Stations`.

Problemas identificados e aprovados para correção:
1. Card se funde com o fundo em telas grandes (sem borda, sombra fraca).
2. Nenhum estado de hover/focus em cards ou ações — o app é Web mas só reage a `active:` (toque).
3. Ações como "Editar"/"Excluir"/"Revogar"/"Aceitar"/"Rejeitar" são `<button>`/`<Link>` estilizados como texto colorido puro, sem borda nem affordance de botão.
4. Par "label cinza + valor em negrito/mono" duplicado em pelo menos 6 lugares (`MetricCard`, `FuelMetricsCard`, `LastRefuelDetailCard`, `Refuels`, sem componente compartilhado).
5. Empty states inconsistentes: `Home` tem um card ilustrado (ícone + texto + CTA) só para o estado "primeiro uso"; `Refuels`/`VehicleEvents`/`Vehicles` mostram apenas uma linha de texto cinza solta.

## Escopo

- `src/components/ui/Card.tsx` (base)
- `src/components/ui/Button.tsx` (nova variante `ghost`/`ghost-danger` + tamanho `sm`)
- Novo `src/components/ui/DataField.tsx`
- Novo `src/components/ui/EmptyState.tsx`
- `src/routes/Home.tsx`
- `src/routes/Refuels.tsx`
- `src/routes/VehicleEvents.tsx`
- `src/routes/Vehicles.tsx`
- `src/routes/Stations.tsx`

Fora de escopo: paleta de cores, tipografia, navegação, dark mode, telas de formulário (`RefuelForm`, `VehicleEventForm`, `VehicleNew`, etc. não usam `Card`).

## 1. `Card.tsx`

```
rounded-xl bg-white p-3 shadow-sm
```
vira
```
rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow
```
Nova prop opcional `interactive?: boolean` (padrão `false`). Quando `true`, soma `hover:shadow-md hover:border-gray-300`. Usada nos cards de lista clicáveis/com ações (Refuels, VehicleEvents, Vehicles, Stations); os cards puramente informativos do Home (`MetricCard`, `FuelMetricsCard`, carrosséis) continuam com o padrão sem hover, já que não têm ação própria no corpo do card.

## 2. `Button.tsx`

Duas novas variantes, reaproveitando a mesma tabela `variantClasses`:
- `ghost`: `border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100`
- `ghost-danger`: `border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 active:bg-red-100`

Nova prop `size?: 'md' | 'sm'` (padrão `'md'`, preserva `h-11`). `'sm'` aplica `h-9 px-3 text-sm` em vez de `h-11 text-base`, usado para ações secundárias dentro de um card (Editar/Excluir/Revogar/etc.), no lugar de `fullWidth={false}` + `px-6`.

Todas as variantes ganham `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600` (`focus-visible:outline-red-600` nas variantes `danger`/`ghost-danger`) — hoje nenhum elemento clicável do app tem indicação de foco de teclado.

As ações de texto cru (`<Link>`/`<button>` com `className="rounded-md px-2 py-3 text-sm font-bold text-green-700 active:bg-green-50"` etc.) em `Refuels`, `VehicleEvents` e `Vehicles` são substituídas por `<Button variant="ghost" size="sm">`/`<Button variant="ghost-danger" size="sm">`. Onde a ação é navegação (`Editar` via `Link`), mantém-se `Link` mas com as mesmas classes de `ghost`/`sm` extraídas (não dá pra usar o componente `Button`, que renderiza `<button>`, então essas classes viram uma constante exportada `ghostButtonClasses`/`ghostDangerButtonClasses` em `Button.tsx` para reuso em `Link`).

## 3. `DataField.tsx` (novo)

```tsx
function DataField({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`font-mono font-bold ${accent ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
```
Substitui os pares `<p className="text-sm text-gray-600">label</p><p className="font-mono font-bold ...">valor</p>` duplicados em:
- `Home.tsx`: `MetricCard`, `FuelMetricsCard`, `LastRefuelDetailCard`
- `Refuels.tsx`: grid de odômetro/quantidade/preço/total

O rótulo passa de `text-sm text-gray-600` para `text-xs uppercase tracking-wide text-gray-500`, reforçando a hierarquia (rótulo claramente secundário, valor em destaque) — mesmo ajuste em todos os usos para consistência visual.

## 4. `EmptyState.tsx` (novo)

Generaliza o card ilustrado que hoje só existe no `Home` (`isFirstUse`):
```tsx
function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) { /* Card + ícone grande + título + descrição + Button opcional, texto centralizado */ }
```
Aplicado em:
- `Home.tsx`: refatora o bloco `isFirstUse` existente para usar o novo componente (mesmo conteúdo/copy).
- `Refuels.tsx`: troca `<p className="text-gray-600">Nenhum abastecimento registrado</p>` por `EmptyState` com CTA "Registrar abastecimento" (mesma ação do botão do header).
- `VehicleEvents.tsx`: troca `<p>Nenhum evento registrado</p>` por `EmptyState` com CTA "Novo evento".
- `Vehicles.tsx`: troca `<p>Nenhum veículo cadastrado</p>` por `EmptyState` com CTA "Novo veículo".
- `Stations.tsx`: mantém como está — os estados vazios ali já têm ícone implícito (texto + botão) e dependem de geolocalização, não de dados do usuário; fora de escopo para não misturar com o fluxo de permissão de localização.

## 5. Aplicação por página

| Página | Mudança |
|---|---|
| `Home.tsx` | `MetricCard`/`FuelMetricsCard`/`LastRefuelDetailCard` passam a usar `DataField`. `RecentActivityCard`: item de lista ganha `hover:bg-gray-50 rounded-lg` (é o único lugar do Home com potencial de virar link no futuro — por ora só o hover visual, sem navegação, já que os itens não têm rota própria). `isFirstUse` usa `EmptyState`. |
| `Refuels.tsx` | Cards da lista ganham `interactive`. Grid de dados usa `DataField`. Ações "Editar"/"Excluir" viram `ghost`/`ghost-danger` `size="sm"`. Empty state vira `EmptyState`. |
| `VehicleEvents.tsx` | Mesmo padrão de `Refuels.tsx` (cards `interactive`, ações como botões, `EmptyState`). Sem `DataField` no corpo (os campos não são um grid label/valor — descrição e odômetro são linhas soltas), mantido como está. |
| `Vehicles.tsx` | Cards `interactive`. Botões "Definir como ativo"/"Editar"/"Excluir"/"Compartilhar"/"Revogar"/"Aceitar"/"Rejeitar" viram `ghost`/`ghost-danger` `size="sm"`. Empty state (`Nenhum veículo cadastrado`) vira `EmptyState`. |
| `Stations.tsx` | Cards `interactive` (têm ação "Traçar rota" e são clicáveis por natureza — postos próximos). Sem `DataField` (layout já é linha única, não grid label/valor). Empty states de localização mantidos como texto simples (fora de escopo, ver seção 4). |

## Fora de escopo / riscos aceitos

- Sem testes visuais automatizados; validação por deploy (Vercel/preview) e checagem manual, conforme preferência já registrada do usuário de validar via deploy em vez de servidor local.
- `focus-visible` depende de suporte do navegador (bem suportado em navegadores modernos); sem polyfill.
- Não há mudança de comportamento/dados, só apresentação — nenhuma rota, chamada de API ou lógica de negócio é alterada.
