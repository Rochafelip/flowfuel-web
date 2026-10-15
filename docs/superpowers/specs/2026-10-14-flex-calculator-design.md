# Calculadora flex (etanol x gasolina) — Design

## Objetivo

Permitir que o usuário descubra rapidamente se compensa abastecer com etanol ou gasolina em um carro flex, usando a regra dos 70% ou o cálculo exato com o consumo do carro.

## Escopo

- Calculadora 100% no cliente, sem chamadas ao backend.
- Valores digitados pelo usuário (preços e consumo). Sem integração com veículo ou histórico de abastecimentos.
- Nada é persistido; a tela abre limpa.

Fora de escopo: sugerir consumo a partir do histórico, salvar cálculos, histórico de comparações.

## Estrutura

- `src/lib/flexFuel.ts` — funções puras:
  - `ratioRule(ethanolPrice, gasolinePrice)` → `{ ratio, winner }`. `ratio = etanol / gasolina`. `ratio < 0.70` → `'ethanol'`, `ratio > 0.70` → `'gasoline'`, igual a 0.70 → `'tie'`.
  - `exactCost({ ethanolPrice, gasolinePrice, ethanolKmPerLiter, gasolineKmPerLiter })` → `{ ethanolCostPerKm, gasolineCostPerKm, winner, savingsPercent }`. Custo por km = preço / km por litro. `savingsPercent` = economia do vencedor em relação ao mais caro. Custos iguais → `'tie'`.
  - `parseDecimal(text)` → `number | null`. Aceita vírgula ou ponto; retorna `null` para vazio, não numérico, zero ou negativo.
- `src/routes/FlexCalculator.tsx` — a tela.
- `src/App.tsx` — rota `/flex-calculator` dentro de `ProtectedRoute` + `AppLayout`.
- `src/components/layout/NavLinks.tsx` — item "Calculadora" (🧮) entre Postos e Exportar.

## Tela

- `SegmentedToggle` no topo: "Regra dos 70%" (padrão) | "Cálculo exato".
- Campos de preço (etanol e gasolina, R$/litro) nos dois modos.
- No modo exato, também os campos de consumo (km/l com etanol e com gasolina).
- Resultado em `Card`, exibido assim que os campos necessários são válidos (sem botão de calcular):
  - Regra dos 70%: "Abasteça com etanol" / "Abasteça com gasolina" e a razão em % (ex.: 68,5%).
  - Exato: custo por km de cada combustível, o vencedor e a economia em %.
  - Empate: "Tanto faz".
- Trocar de modo mantém os preços já digitados.

## Entrada e erros

- Parse pt-BR (vírgula decimal) via `parseDecimal`.
- Campo preenchido com valor inválido (não numérico, zero ou negativo) mostra uma dica abaixo do campo; sem resultado enquanto houver campo obrigatório inválido ou vazio.
- Sem estado de erro de servidor, pois não há rede.

## Verificação

O projeto não tem runner de testes. Verificação via `npm run build` (tsc + vite) e teste manual após deploy. A lógica fica em funções puras para facilitar testes futuros.
