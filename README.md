# IronPulse — Hipertrofia & Sobrecarga Progressiva

Aplicativo offline-first em **React Native + Expo + TypeScript (strict)** com **SQLite local (`expo-sqlite`)**, design system **Dark Mode nativo** (`#0D0D0F`, `#18181B`, `#F97316`, `#84CC16`) e gráficos interativos (`react-native-gifted-charts`).

## Funcionalidades Principais

- **Autenticação & Multi-Conta Offline:** Cadastro de conta (nome, e-mail, senha com hash SHA-256 + salt, objetivo de treino e opção de iniciar com fichas prontas), login persistente em SQLite (`users` e `auth_sessions`), isolamento total dos treinos/fichas/medidas/cardio por usuário, tela **Minha Conta** (editar perfil, alterar senha e logout) e **Conta Demo** pronta (`demo@ironpulse.app` / `123456`).
- **Gestão de Rotinas & Biblioteca:** Múltiplas fichas/perfis (`Upper/Lower`, `PPL`, `ABC`, `Full Body`, `Custom`), 36 exercícios pré-populados cobrindo 9 grupos musculares e 5 equipamentos + criação de exercícios customizados, configuração de séries, faixa de reps, descanso, carga total/unilateral e observações.
- **Modo Treino Ativo:** Cronômetro global, tipos de série (`W`, `N`, `D`, `F`), alternância de carga **Total** vs **Por Lado (×2)** com volume real automático, **RPE / RIR**, valores *ghost* do último treino com preenchimento rápido, **Timer de Descanso Automático** (`-15s`, `+15s`, `Pular`, vibração/haptics), **substituição rápida sem alterar a ficha** e **Resumo Pós-Treino com PRs**.
- **Dashboards & Analytics:** Heatmap de consistência (12 semanas) + contador de sequência (*streak*), volume semanal de séries válidas por músculo (zona ideal 10–20 séries), gráfico interativo por exercício (**1RM Estimado de Epley**, **Carga Máxima**, **Volume Total**), **Detecção Automática de Platô** (3+ sessões estagnadas) e **Sinal de Progressão** (teto da faixa atingido em todas as séries).
- **Relatórios, Exportação, Corpo & Cardio:** Comparativo semanal e mensal, exportação **CSV** e **JSON**, backup e restauração local, registro biométrico (peso, % gordura, braço, peito, cintura, coxa) com gráfico de tendência e cardio integrado ao calendário semanal.
- **Seed Realista (4 semanas):** Inicializado automaticamente na primeira abertura com 16 sessões de musculação, 8 sessões de cardio, 5 medições corporais, 1 exercício em platô (*Rosca Direta com Barra*) e 1 pronto para progressão (*Supino Reto com Barra*).

## Como Executar

```bash
npm install --legacy-peer-deps

# Rodar direto no navegador (Web com SQLite via sql.js + localStorage)
npm run web

# Ou abrir o menu interativo do Expo (Android / iOS / Web)
npm start
```

> **Dica PowerShell:** No npm, scripts customizados usam `npm run web` (ou `npx expo start --web`), não `npm web` nem `expo start` global.

- **Validação TypeScript (strict):** `npm run typecheck`
- **Testes de lógica e cálculos:** `npm run test:logic`

## Gerar APK Android para Enviar (WhatsApp / Instalação Direta)

O projeto já está configurado com `eas.json` (`buildType: "apk"`), ícone de alta resolução (`assets/icon.png`) e splash screen (`assets/splash-icon.png`).

```powershell
# 1. Faça login na sua conta gratuita do Expo (crie em expo.dev se não tiver)
npx eas-cli login

# 2. Gere o APK instalável na nuvem (não precisa de Android Studio)
npm run build:apk
```

Ao finalizar (~5–10 min), o terminal exibe um **link direto e QR Code para baixar o `.apk`**. Basta enviar o arquivo `.apk` ou o link para instalar no Android (habilitando *"Instalar apps desconhecidos"* se o celular pedir).
