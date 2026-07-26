# Referência de Design — Página Principal (Home) do FlowFuel

> Documento de referência extraído do app Android FlowFuel, para servir de
> inspiração ao portar a ideia para um projeto Web. Descreve estrutura,
> estados, componentes e estilo visual — não é código, é a "receita" da tela.

## Ideia geral

A Home é um **dashboard do veículo ativo do usuário**. Ela não é uma lista de
ações — é uma tela de "estado atual": quanto foi gasto, como está o consumo,
qual o odômetro, quando foi o último abastecimento, o que está para vencer.
As ações (registrar abastecimento, ver histórico) ficam em elementos fixos
(FAB e navegação), não competindo com o conteúdo informativo.

Dois princípios guiam a experiência:

1. **Carregamento em camadas, nunca tudo ou nada.** O cabeçalho do veículo e
   o dashboard principal aparecem primeiro (são "críticos" e bloqueantes).
   As demais seções (resumo financeiro, atividade recente, próximos eventos)
   carregam **em paralelo, cada uma independente**, com seu próprio
   loading/erro/retry. Se uma seção falhar ou demorar, as outras não travam.
2. **Estado vazio guiado, não tela em branco.** Se o usuário nunca registrou
   nenhum abastecimento, a tela troca os cards de números por um único
   "empty state" com botão de ação, e algumas seções somem (não faz sentido
   mostrar indicadores zerados).

---

## Estrutura, de cima para baixo

Container: lista vertical rolável, com respiro fixo entre os blocos
(≈12–16px de gap, ≈16px de padding lateral).

### 1. Cabeçalho do veículo
- Nome do veículo (marca + modelo) — clicável, abre um seletor (bottom
  sheet) para trocar de veículo ativo.
- Subtítulo dinâmico conforme o tempo desde o último abastecimento:
  "Pronto para rodar" (nunca abasteceu) / "Abastecido hoje" / "Último
  abastecimento foi ontem" / "Há N dias sem abastecer".
- Dois ícones à direita: "Sobre o app" (info) e notificações (hoje é só
  visual, reservado para o futuro).

### 2. Ramo condicional: primeiro uso vs. uso normal
- **Primeiro uso** (zero abastecimentos): mostra só um card central com
  ícone, título ("Pronto para começar"), descrição e botão de ação
  ("Registrar abastecimento"). Os cards de gasto e indicadores (itens 3 e 4)
  não aparecem.
- **Uso normal:** segue para os itens 3 e 4 normalmente.

### 3. Card "Gasto do mês" (carrossel de 2 páginas)
- Página 1: valor grande do gasto do mês atual (fonte numérica, destacada) +
  selo de tendência opcional ("+79% vs. mês anterior"), com **cor invertida**
  (gasto subindo = vermelho, gasto caindo = verde — o oposto de "métrica que
  sobe é boa").
- Página 2: gasto total acumulado (sem selo de tendência).
- Dois pontinhos indicadores embaixo, mostrando a página ativa.

### 4. Grid 2x2 de indicadores
Quatro cartões pequenos e iguais, lado a lado em 2 linhas:
- Consumo médio (km/L ou km/kWh)
- Preço médio (por litro/kWh)
- Odômetro atual
- Último abastecimento (rótulo textual: Hoje/Ontem/Há N dias)

Cada cartão: rótulo pequeno em cima, valor grande embaixo (mesma fonte
numérica do card de gasto), unidade ao lado do valor.

### 5. Card "Dica do dia"
Sempre visível, mesmo no primeiro uso. Uma frase curta de dica de economia,
escolhida de uma lista fixa e trocada automaticamente uma vez por dia (sem
precisar de API — é só uma função do dia do ano). Dá vida à tela sem custo
de rede.

### 6. Card "Último abastecimento" (detalhado)
Some no primeiro uso. Lista de linhas rótulo→valor, cada uma **só aparece se
o dado existir**:
- Data
- Litros (ou "Energia" se for elétrico)
- Valor pago
- Preço por litro (calculado localmente = valor ÷ litros) — linha destacada
  em negrito/cor de destaque, por ser o dado mais "de leitura rápida".

### 7. Card "Atividade recente"
Some no primeiro uso. Lista mesclando abastecimentos e eventos de
manutenção numa única timeline, mais recentes primeiro. Cada linha: ícone
por tipo (posto de gasolina / ferramenta / recibo), título, data por
extenso, valor em BRL alinhado à direita. Estado vazio próprio: "Nenhuma
atividade registrada ainda."

### 8. Seção "Próximos eventos"
**Sempre visível**, mesmo no primeiro uso — é a única seção que não depende
de já ter abastecido. Três cartões fixos lado a lado (sem carrossel):
Troca de óleo, Rodízio de pneus, Licenciamento. Cada um com ícone colorido
por categoria e um texto de status:
- Atrasado → texto vermelho ("Atrasado N km" / "Venceu há N dias").
- Em dia → texto neutro ("Em N km" / "Vence em N dias").
- Caso especial do Licenciamento sem data cadastrada → "Defina a data de
  licenciamento" (abre um seletor de data ao tocar).

---

## Estados especiais

- **Loading de página inteira:** um "esqueleto" cinza simulando os blocos
  reais (mesmas alturas aproximadas de cada seção), com efeito de brilho
  (shimmer) deslizando — dá sensação de progresso mesmo sem dado nenhum.
- **Erro de página inteira:** ícone + "Tivemos um problema" + botão "Tentar
  novamente", centralizado, substitui a tela toda (só ocorre se o dado
  crítico — veículo + dashboard — falhar).
- **Erro de seção individual:** cada uma das 3 seções paralelas tem seu
  próprio card de erro pequeno ("Não foi possível carregar esta seção" +
  botão de retry), sem afetar as demais.
- **Puxar para atualizar (pull-to-refresh):** não troca a tela para o
  esqueleto de loading — só mostra o indicador nativo de refresh no topo
  enquanto busca os dados de novo por trás.
- **Troca de veículo em andamento:** se o usuário troca de veículo ativo
  enquanto uma seção ainda está carregando os dados do veículo anterior, o
  resultado antigo é descartado ao chegar (evita o dado do veículo errado
  "piscar" na tela por um instante).

---

## Navegação e ação primária (fora da lista rolável)

- Barra inferior fixa com 5 abas: **Home, Histórico, Postos, Eventos,
  Perfil** (ícone outline quando inativa, preenchido quando ativa).
- Botão flutuante (FAB) embutido na barra inferior, contextual por aba:
  ícone de "+" com "Novo evento" na aba Eventos; em qualquer outra aba
  (inclusive Home), ícone de posto de gasolina com "Registrar
  abastecimento" — abre um formulário rápido por cima da tela atual, sem
  navegar para outra rota.
- Trocar de aba preserva o estado de rolagem/scroll de cada uma.

---

## Paleta de cores

| Papel | Light | Dark | Uso |
|---|---|---|---|
| Primária (grafite) | `#334155` | `#94A3B8` | Textos de destaque, ícones ativos, ponto ativo do carrossel |
| Verde de marca | `#0B6E4F` | `#34D399` | Acento pontual (logo), não é a cor primária da UI |
| Sucesso (verde) | `#2E7D32` | `#8FD89A` | Tendência boa, card "Rodízio de pneus" |
| Aviso (âmbar) | `#E5A100` | — | Card "Troca de óleo" |
| Erro (vermelho) | `#B3261E` | — | Itens atrasados, tendência ruim |
| Fundo da tela | `#F8FAFC` (slate-50) | `#0F172A` (slate-900) | — |
| Fundo dos cards | branco puro | `#1E293B` (slate-800) | — |
| Texto secundário | slate-600 | slate-400 | Rótulos, subtítulos |

**Insight principal para o projeto Web:** a cor "de marca" (verde) é tratada
como acento raro, não como cor primária de interface — a UI no dia a dia é
predominantemente neutra (grafite/slate sobre fundo claro), e o verde/vermelho
aparecem só para comunicar sentido (bom/ruim, atenção).

## Tipografia

- Fonte de UI: **Inter** (pesos normal/médio/semibold) para tudo — títulos,
  corpo, rótulos.
- Fonte separada para **números de destaque**: monoespaçada, em 3 tamanhos
  (grande ≈32px/semibold, médio ≈22px, pequeno ≈16px). Usada especificamente
  nos valores do card de gasto, nos 4 indicadores do grid e nos valores em
  R$ da atividade recente. É esse detalhe (números em mono, texto em Inter)
  que dá a sensação de "painel financeiro" à tela.

## Espaçamento e forma

- Escala de espaçamento: 4 / 8 / 16 / 24 / 32 / 48 px.
- Gap padrão entre cards empilhados: **12px**. Padding lateral da tela: 16px.
- Cantos arredondados nos cards: **16px** de raio. Badges/pills: totalmente
  arredondados.
- Elevação/sombra dos cards é bem sutil (quase plano) — a separação visual
  vem mais do espaçamento e do fundo levemente diferente (`surface` vs.
  `background`) do que de sombra.

---

## Resumo do que vale copiar para a Web

1. Layout em pilha vertical de "cards de dashboard", não em formulário.
2. Hierarquia de carregamento em camadas — crítico primeiro, resto em
   paralelo com skeleton/erro isolados por seção.
3. Estado vazio "guiado" no primeiro uso, escondendo métricas que não fazem
   sentido sem dado.
4. Números importantes em fonte monoespaçada, diferente do resto do texto.
5. Cor verde como acento raro de marca/sucesso, não como cor primária de UI.
6. Regra de "cor invertida" em indicadores de gasto (subir = vermelho).
7. Ação primária fixa (equivalente a um FAB) sempre visível e contextual,
   fora do fluxo de rolagem do conteúdo.
