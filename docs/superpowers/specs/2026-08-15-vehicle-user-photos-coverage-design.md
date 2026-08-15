# Cobertura de foto de carro/usuário no Web

## Contexto

Foto de carro e foto de usuário já existem no backend e já são usadas em dois lugares do Web hoje: o formulário de cadastro/edição de veículo (`VehicleNew.tsx` / `VehicleEdit.tsx`, via `Step4Photo`) e a página de Perfil (`Profile.tsx`). Em nenhum outro lugar do Web essas fotos aparecem, mesmo onde o carro ou o usuário já são exibidos — hoje eles aparecem só como texto ou um emoji fixo.

## Objetivo

Mostrar a foto do carro (com fallback 🚗) e a foto do usuário (com fallback = inicial do nome) nos 4 lugares onde eles são referenciados mas a foto não aparece:

1. Lista "Meus veículos" (`Vehicles.tsx`)
2. Tela "Selecionar veículo" (`SelectVehicle.tsx`)
3. Seletor de veículo ativo no Topbar (`VehicleSwitcherLink.tsx`)
4. Item "Perfil" da navegação (`NavLinks.tsx`, usado por `Sidebar` e `MobileDrawer`)

Sem telas novas, sem mudança de fluxo — só exibição.

## Fonte de dados (nenhuma mudança de backend)

A API já retorna `photo`/`profilePicture` em todos os payloads envolvidos; o trabalho é 100% frontend:

- `Vehicles.tsx` já recebe `Vehicle[]` completo via `listVehicles()` — o tipo `Vehicle` (`src/types/Vehicle.ts`) já tem `photo: string | null`.
- `SelectVehicle.tsx` chama `authenticatedRequest('/vehicles')` diretamente e tipa a resposta com uma interface local `VehicleListItem` que **não declara** `photo` hoje, embora a API já mande o campo. Ajuste: adicionar `photo: string | null` a essa interface.
- `VehicleSwitcherLink.tsx` usa `activeVehicle` do `VehicleContext`, que já é um `Vehicle` completo (com `photo`) — zero fetch novo.
- O avatar do usuário é o único caso sem dado disponível hoje: `NavLinks.tsx` só tem acesso ao `AuthContext`, que guarda apenas o token (sem nome/foto). `NavLinks` passa a buscar o perfil (`getProfileRequest`, de `services/profile.ts`) uma vez ao montar, do mesmo jeito que `Profile.tsx` já faz (`decodeUserIdFromToken` + `getProfileRequest(userId)`).

## Componentes novos

Para não duplicar a lógica de imagem-ou-fallback em 4 lugares, dois componentes de apresentação em `src/components/ui/`:

### `VehiclePhoto`

```ts
type VehiclePhotoProps = {
  path: string | null
  size?: 'sm' | 'md' | 'lg' // 24px / 32px / 48px
  className?: string
}
```

- Usa `useAuthenticatedImage(path)` (hook já existente, reusado sem mudanças).
- Enquanto carrega ou sem foto: fallback 🚗 sobre fundo neutro (mesmo padrão visual já usado hoje em `SelectVehicle.tsx`), em vez de estado de loading dedicado — evita flash perceptível dado que as imagens são pequenas.
- `object-cover`, cantos arredondados (`rounded-lg`), mesmo tratamento em todos os tamanhos.

### `UserAvatar`

```ts
type UserAvatarProps = {
  path: string | null
  name: string
  size?: 'sm' | 'md' // 20px / 24px
  className?: string
}
```

- Usa `useAuthenticatedImage(path)`.
- Fallback: inicial de `name` maiúscula, mesmo padrão do círculo em `Profile.tsx` (`rounded-full`, fundo neutro, texto cinza).

Ambos ficam só na pasta `ui/` (mesmo nível de `Card.tsx`, `Spinner.tsx` etc.) — não precisam de contexto, história ou estado próprio além do hook existente.

## Onde exatamente

### 1. `Vehicles.tsx` — lista de veículos

Dentro do `<Card>` de cada veículo, `VehiclePhoto` tamanho `lg` (48px) à esquerda do nome (`{vehicle.brand} {vehicle.model}`), num `flex` horizontal. Não altera o restante do card (placa, odômetro, ações, compartilhamento).

### 2. `SelectVehicle.tsx` — seleção de veículo

Troca o `<div>` fixo com `🚗` (hoje hardcoded, `h-8 w-8` = 32px) por `VehiclePhoto` tamanho `md` (32px) no mesmo lugar/tamanho de layout — mantém o tamanho atual do bloco. Requer o ajuste de tipo descrito acima (`VehicleListItem.photo`).

### 3. `VehicleSwitcherLink.tsx` — Topbar

`VehiclePhoto` tamanho `sm` (24px, circular via `rounded-full` — único uso "redondo" do componente, controlado pelo `className` passado) antes do texto `{activeVehicle.brand} {activeVehicle.model}`. Só renderiza quando já existe `activeVehicle` (mesma condição atual).

### 4. `NavLinks.tsx` — item "Perfil"

O item de menu "Perfil" (`{ to: '/profile', label: 'Perfil', icon: '👤' }`) passa a renderizar `UserAvatar` no lugar do `<span>{item.icon}</span>`, só para esse item específico — os demais itens continuam com emoji. Mesmo tamanho visual dos outros ícones (`sm`, ~20px). O fetch do perfil (`getProfileRequest`) acontece uma vez, no mount do `NavLinks`; falha silenciosa (mantém fallback com inicial) segue o mesmo padrão de tratamento de erro já usado em outras chamadas do app (`console.log` + estado local, sem toast).

## Fora de escopo

- Qualquer mudança de backend — todos os dados já existem nos payloads atuais.
- Cache/compartilhamento do perfil do usuário entre `NavLinks` e `Profile.tsx` (ex. via contexto global) — cada um busca de forma independente; é uma chamada leve e pouco frequente, introduzir um contexto novo só para isso seria prematuro.
- Upload/edição de foto nesses 4 lugares — eles só exibem, a edição continua exclusiva de `VehicleEdit`/`VehicleNew`/`Profile`.
- Skeleton/estado de carregamento dedicado para as miniaturas — usa o mesmo fallback de "sem foto" enquanto carrega.

## Testes

Sem infraestrutura de testes automatizados configurada no repo frontend hoje. Validação via `tsc -b` (typecheck) e checagem visual após deploy (preferência já registrada de checar via deploy em vez de servidor local).
