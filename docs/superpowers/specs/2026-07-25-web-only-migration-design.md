# Migração para web-only (Vite + React)

## Contexto

O `flowfuel-frontend` é hoje um app Expo/React Native (Expo Router, RN Web) com telas de login, registro, seleção de veículo e cadastro de veículo, consumindo a API `flowfuel` (Spring Boot, em produção em `https://flowfuel-api.fly.dev`). O produto nunca terá versão mobile nativa — só web. O app não precisa de SEO/SSR (fica atrás de login).

## Decisão de escopo

Substituir o projeto Expo/React Native por uma SPA client-side, **no mesmo repositório**, mantendo o histórico do git. Sem servidor, sem SSR.

## Stack

| Camada | Antes | Depois |
|---|---|---|
| Bundler/dev server | Expo CLI / Metro | Vite |
| Roteamento | Expo Router (file-based) | React Router (declarativo) |
| Estilização | `StyleSheet.create` | Tailwind CSS |
| Persistência local | `@react-native-async-storage/async-storage` | `localStorage` |
| Componentes | `View`/`Text`/`TextInput`/`TouchableOpacity` (RN) | elementos HTML nativos |
| React / TypeScript | mantidos | mantidos (React 19, TS) |

Dependências removidas: `expo*`, `react-native*`, `@react-navigation/*`, `@react-native-async-storage/async-storage`, `react-native-web`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-worklets`, `@expo/vector-icons`.

Dependências adicionadas: `vite`, `@vitejs/plugin-react`, `react-router-dom`, `tailwindcss` (+ `postcss`, `autoprefixer`).

## Estrutura de pastas

```
src/
  main.tsx                 # entry point, monta <App /> no #root
  App.tsx                  # <BrowserRouter> + rotas + AuthProvider/VehicleProvider
  context/
    AuthContext.tsx        # portado, AsyncStorage -> localStorage
    VehicleContext.tsx     # portado, AsyncStorage -> localStorage, paths de API corrigidos
  routes/
    ProtectedRoute.tsx     # substitui a lógica de redirect do RootLayout/_layout atual
    Login.tsx
    Register.tsx
    SelectVehicle.tsx
    VehicleNew.tsx
    Home.tsx               # placeholder simples, tela vazia pós-login
  services/
    api.ts                 # BASE_URL via import.meta.env.VITE_API_URL, paths corrigidos
  types/
    Dashboard.ts           # portado sem alteração
index.html
vite.config.ts
tailwind.config.js
postcss.config.js
.env.example                # VITE_API_URL=https://flowfuel-api.fly.dev
```

Removidos: `app/`, `context/RootLayout.tsx` (duplicado do `_layout.tsx`, não usado), `components/` (todo o conteúdo é boilerplate do template Expo: `hello-wave`, `parallax-scroll-view`, `haptic-tab`, `icon-symbol.*`, `themed-*`, `external-link`, `collapsible`), `hooks/use-color-scheme*`, `constants/theme.ts`, `app.json`, `expo-env.d.ts`, `scripts/reset-project.js`.

## Rotas

| Rota | Tela | Proteção |
|---|---|---|
| `/login` | Login | pública |
| `/register` | Register | pública |
| `/select-vehicle` | SelectVehicle | requer token |
| `/vehicles/new` | VehicleNew | requer token |
| `/` | Home (placeholder) | requer token + veículo ativo |

Sem tab bar — a home é uma rota simples até existirem mais seções reais.

`ProtectedRoute` replica a lógica hoje em `app/_layout.tsx`: enquanto `AuthContext`/`VehicleContext` carregam, mostra um spinner; sem token → `/login`; com token mas sem veículo ativo → `/select-vehicle`; caso contrário renderiza a rota.

## Correções de API (bugs pré-existentes)

O código atual usa paths com prefixo `/api` que não existe no backend (`UserController` mapeia em `/auth`, `VehicleController` em `/vehicles`, sem `context-path` configurado). Também usa verbos/paths de ativação de veículo que não batem com o endpoint real (`PUT /vehicles/{id}/active`). Corrigido na migração:

| Uso atual (frontend) | Endpoint real (backend) |
|---|---|
| `POST /api/auth/login` | `POST /auth/login` |
| `POST /api/auth/register` | `POST /auth/register` |
| `GET /api/vehicles/active` | `GET /vehicles/active` |
| `GET /api/vehicles` | `GET /vehicles` |
| `POST /api/vehicles` | `POST /vehicles` |
| `PATCH /api/vehicles/{id}/activate` (SelectVehicle) | `PUT /vehicles/{id}/active` |
| `PUT /api/vehicles/{id}/activate` (VehicleNew) | `PUT /vehicles/{id}/active` |

`BASE_URL` deixa de ser hardcoded (`http://192.168.1.2:8080`) e passa a vir de `import.meta.env.VITE_API_URL`, com `https://flowfuel-api.fly.dev` como default de produção. Em dev local, `.env` local pode apontar para `http://localhost:8090` (porta do backend local, ver `application.properties`).

## Estilização

Tailwind substitui os objetos `StyleSheet.create` linha a linha — cores, tamanhos e espaçamentos atuais (`#f8f9fa`, `#0d6efd`, `border-radius: 8/12`, etc.) são preservados como classes utilitárias equivalentes, para manter a aparência atual sem redesenhar.

## Formulários migrados (comportamento preservado)

- **Login**: email + senha, validação client-side de campos vazios, chama `loginRequest`, em sucesso chama `signIn(token)`.
- **Register**: nome, email, senha, confirmar senha; valida campos vazios, senha == confirmação, senha ≥ 6 caracteres; registra e já faz login em seguida.
- **SelectVehicle**: lista veículos do usuário (`GET /vehicles`); se vazio, mostra CTA para cadastrar; ao clicar num veículo, ativa (`PUT /vehicles/{id}/active`) e redireciona pra Home.
- **VehicleNew**: formulário com marca, modelo, ano modelo, ano fabricação, tipo, tipo de energia, subtipo combustível, capacidade, cor, placa, km atual; ao salvar, cria (`POST /vehicles`) e ativa o veículo, redireciona pra Home.

Nenhuma regra de negócio nova é introduzida — é port 1:1 da lógica atual, só trocando a camada de UI/roteamento/storage.

## Fora de escopo

- Dark mode (RN tinha `useColorScheme`; web fica com tema único claro).
- Animações (Reanimated não é portado; se necessário no futuro, usar CSS transitions).
- Testes automatizados (não existem hoje; não estão sendo adicionados nesta migração).
- Qualquer feature nova de produto (dashboard real, etc.) — Home fica como placeholder.

## Critério de sucesso

- `npm run dev` sobe a SPA via Vite.
- `npm run build` gera build estático de produção.
- Fluxo login → select-vehicle → vehicles/new → home funciona de ponta a ponta contra a API de produção.
- Nenhuma dependência `expo*`/`react-native*` remanescente no `package.json`.
