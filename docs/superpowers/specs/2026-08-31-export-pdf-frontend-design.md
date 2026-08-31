# Exportação em PDF — Frontend Web

## Contexto

A spec `2026-07-26-export-refuels-events-frontend-design.md` (mesmo
repositório) implementou a tela `/export` com seletor CSV/XLSX, consumindo
os endpoints do backend (`GET /exports/refuels`, `GET /exports/events`),
que já suportava `format=csv|xlsx` — e explicitamente marcava PDF como
fora de escopo, porque o backend não tinha PDF pronto na época.

Isso mudou: o backend já tem `ExportFormat.PDF` ligado ponta a ponta há
algum tempo (só nunca exposto em nenhum cliente), e a spec
`2026-08-31-export-pdf-report-design.md` (repositório `flowfuel`) está
evoluindo esse PDF de tabela crua para um relatório com cabeçalho de
veículo/período e resumo, além de corrigir um bug de `Content-Type` que
fazia o PDF ser servido como `text/csv`.

Esta spec cobre a mudança do lado do frontend: **trocar a opção "Excel"
pela opção "PDF"** no seletor de formato de `Export.tsx` — decisão do
usuário de não oferecer XLSX na web, mantendo apenas os dois formatos mais
usados (CSV para importar em outra planilha, PDF para relatório pronto para
ler/imprimir). O endpoint continua aceitando `format=xlsx` no backend; só a
UI web deixa de oferecer esse botão.

## Estado atual

`src/routes/Export.tsx` já foi editado para isso antes desta spec ser
escrita — o `type ExportFileFormat` é `'csv' | 'pdf'` e o
`SegmentedToggle` de formato mostra "CSV"/"PDF" no lugar de "CSV"/"Excel".
Esta spec formaliza essa mudança (para ficar documentada, igual às demais
specs do projeto) e verifica que não sobrou nada dependente do XLSX.

## Mudanças

- `src/routes/Export.tsx`: `ExportFileFormat` passa de `'csv' | 'xlsx'`
  para `'csv' | 'pdf'`; o `SegmentedToggle` de formato usa
  `{ value: 'csv', label: 'CSV' }` / `{ value: 'pdf', label: 'PDF' }` no
  lugar da opção `xlsx`/"Excel". (Já aplicado.)
- Nenhuma mudança em `src/services/export.ts` — `downloadExport` já é
  agnóstico de formato: lê `Content-Type`/`Content-Disposition` da resposta
  e baixa o blob, funciona igual para `application/pdf` assim que o backend
  corrigir o Content-Type (spec do backend). Antes dessa correção, o
  download funcionaria mas com a extensão/mimetype errados no navegador —
  por isso esta mudança de frontend depende da spec de backend para o
  formato PDF funcionar corretamente ponta a ponta.
- Nenhuma outra tela ou componente referencia `'xlsx'`/Excel (confirmado
  por busca em `src/`) — não há limpeza adicional a fazer.

## Fluxo de interação

Idêntico ao já documentado na spec original — nenhuma mudança de UX além
da label do botão de formato. Query string enviada ao backend passa a levar
`format=pdf` em vez de `format=xlsx` quando o usuário escolhe essa opção;
`format=csv` inalterado.

## Erros

Mesma tabela de erros já documentada na spec original — nenhum cenário
novo introduzido por esta mudança.

## Testes / verificação manual

Sem suíte automatizada no frontend (mesma situação da spec original).
Verificação manual, após o deploy da correção de backend:

- Exportar abastecimentos em PDF, sem filtros — arquivo abre como PDF
  válido, com cabeçalho de veículo/período e resumo visíveis.
- Exportar eventos em PDF, filtrando por categoria e por período.
- Exportar em CSV continua funcionando sem regressão (fluxo inalterado).
- Confirmar que o botão de formato mostra apenas "CSV" e "PDF" (sem
  "Excel").

## Fora de escopo

- Qualquer mudança de layout do PDF em si — isso é definido inteiramente
  pelo backend (spec `2026-08-31-export-pdf-report-design.md`); o frontend
  só troca qual valor de `format` é enviado.
- Reintroduzir XLSX na UI web (decisão deliberada de simplificar para dois
  formatos).
