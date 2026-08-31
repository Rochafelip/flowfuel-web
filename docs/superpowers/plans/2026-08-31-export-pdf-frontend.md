# Exportação em PDF — Frontend Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a opção "Excel" pelo formato "PDF" no seletor de formato da tela `/export`, ligando com o relatório PDF que o backend está evoluindo (`docs/superpowers/plans/2026-08-31-export-pdf-report.md` no repositório `flowfuel`).

**Architecture:** Mudança isolada em `src/routes/Export.tsx` — troca de union type e de uma opção do `SegmentedToggle`. `src/services/export.ts` (`downloadExport`) já é agnóstico de formato (lê `Content-Type`/`Content-Disposition` da resposta e baixa o blob), não precisa de mudança.

**Tech Stack:** React 19, TypeScript, Vite. Sem suíte de testes automatizada neste repositório — verificação via `npm run dev`.

---

### Task 1: Confirmar e commitar a troca de XLSX por PDF

**Files:**
- Modify: `src/routes/Export.tsx:22,194` (já editado no working tree, ver diff abaixo — este task só confere e commita)

**Interfaces:** nenhuma nova — `ExportFileFormat` deixa de incluir `'xlsx'` e passa a incluir `'pdf'`.

- [ ] **Step 1: Conferir o diff pendente**

Run: `git diff src/routes/Export.tsx`
Expected:
```diff
 type DataType = 'REFUELS' | 'EVENTS'
-type ExportFileFormat = 'csv' | 'xlsx'
+type ExportFileFormat = 'csv' | 'pdf'
```
e
```diff
           options={[
             { value: 'csv', label: 'CSV' },
-            { value: 'xlsx', label: 'Excel' },
+            { value: 'pdf', label: 'PDF' },
           ]}
```

Se o diff já bate exatamente com isso, pule o Step 2 e vá direto ao Step 3. Se o arquivo não tiver essa mudança (por exemplo, se foi revertido), aplique-a manualmente antes de prosseguir.

- [ ] **Step 2: Aplicar a mudança (só se o Step 1 mostrou que ela não está presente)**

Em `src/routes/Export.tsx`, linha 22, trocar:
```ts
type ExportFileFormat = 'csv' | 'xlsx'
```
por:
```ts
type ExportFileFormat = 'csv' | 'pdf'
```

E no `SegmentedToggle` de formato (próximo ao fim do componente), trocar:
```tsx
        <SegmentedToggle
          value={format}
          onChange={setFormat}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'xlsx', label: 'Excel' },
          ]}
        />
```
por:
```tsx
        <SegmentedToggle
          value={format}
          onChange={setFormat}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'pdf', label: 'PDF' },
          ]}
        />
```

- [ ] **Step 3: Confirmar que não sobrou nenhuma referência a XLSX/Excel no projeto**

Run: `grep -rn "xlsx\|XLSX\|Excel" src/`
Expected: nenhum resultado.

- [ ] **Step 4: Type-check do projeto**

Run: `npx tsc -b --noEmit`
Expected: sem erros (confirma que nenhum outro arquivo dependia do literal `'xlsx'` do tipo `ExportFileFormat`).

- [ ] **Step 5: Commit**

```bash
git add src/routes/Export.tsx
git commit -m "feat(export): trocar opção Excel por PDF no seletor de formato de exportação"
```

---

### Task 2: Verificação manual end-to-end

**Files:** nenhum (apenas execução)

Depende do backend ter o Task 5 do plano `2026-08-31-export-pdf-report.md` (repositório `flowfuel`) aplicado — antes disso, `format=pdf` no backend já responde com `Content-Type: application/pdf` (Task 1 daquele plano), mas o PDF ainda pode estar na versão "tabela simples" (sem resumo) se os Tasks 3-5 de lá ainda não tiverem sido aplicados. A verificação abaixo cobre o comportamento visível no frontend independente disso.

- [ ] **Step 1: Rodar o frontend localmente**

Run: `npm run dev`
Expected: servidor Vite sobe em `http://localhost:5173` (ou porta configurada).

- [ ] **Step 2: Verificação manual no navegador**

Checklist (autenticado, com ao menos um veículo e um abastecimento/evento cadastrado):

- Abrir `/export`. O botão de formato mostra apenas "CSV" e "PDF" (sem "Excel").
- Escolher "Abastecimentos" + "PDF", sem filtros de data, clicar em "Exportar" — o navegador baixa um arquivo `.pdf` que abre corretamente (não corrompido).
- Escolher "Eventos" + "PDF", com filtro de categoria e de período — mesmo resultado.
- Escolher "CSV" — continua funcionando sem regressão (fluxo inalterado desde a spec original).
- Tentar exportar com apenas uma data preenchida — erro inline continua aparecendo, sem request (comportamento não tocado por esta mudança).

- [ ] **Step 3: Reportar qualquer divergência**

Se o PDF baixado não abrir, ou vier com `Content-Type` errado, ou (após o backend concluir o plano de relatório) não mostrar o resumo esperado — não é um problema deste plano de frontend; volte ao plano `2026-08-31-export-pdf-report.md` no repositório `flowfuel` para depurar o lado do backend.
