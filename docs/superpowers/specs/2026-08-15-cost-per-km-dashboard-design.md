# Custo por km no dashboard

## Contexto

O tipo `Dashboard` (`src/types/Dashboard.ts`) já expõe `costPerKm`, calculado pelo backend em toda chamada de `GET /dashboard/vehicle/{id}` (soma do valor pago em cada abastecimento dividido pela distância percorrida entre odômetros, cobrindo combustão, elétrico e híbrido). O valor nunca é `null`; é `0` quando há menos de 2 abastecimentos registrados. Hoje esse campo não é exibido em nenhum lugar da UI.

## Objetivo

Exibir `costPerKm` de forma discreta, sem adicionar um novo card e sem poluir a tela do dashboard.

## Mudança

Em `src/routes/Home.tsx`, no componente `SpendCarousel`:

- Receber `costPerKm: number` como prop.
- Quando a página atual for "Gasto do mês" (índice 0) **e** `costPerKm > 0`, renderizar uma linha secundária logo abaixo do valor grande, ex.: `R$ 0,42/km`.
- Quando `costPerKm === 0` (usuário com menos de 2 abastecimentos), não renderizar nada — evita mostrar "R$ 0,00/km" enganoso.
- Não exibir nas outras páginas do carrossel ("Gasto de combustível", "Gastos totais").

Estilo: mesmo padrão visual de texto secundário já usado no app (`text-sm text-gray-600 dark:text-gray-400`), sem ícone, sem cor de destaque, para manter o valor grande como protagonista visual.

`Home` passa `dashboard.costPerKm` para `SpendCarousel` — nenhuma outra mudança de dados é necessária.

## Fora de escopo

- Comparação com mês anterior, breakdown por categoria de custo/km, gráficos históricos — não fazem parte desta mudança.
- Mudanças de API/backend — o campo já existe e já é calculado corretamente.

## Testes

Estender os testes existentes de `Home.tsx` (se houver) para cobrir:
- A linha `R$/km` aparece na página "Gasto do mês" quando `costPerKm > 0`.
- A linha não aparece quando `costPerKm === 0`.
- A linha não aparece nas outras páginas do carrossel.
