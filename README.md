# Web APIs

Laboratório de testes e demonstrações de APIs web em navegador, construído com TypeScript + Vite.

Este projeto explora recursos do navegador e demonstra comportamentos práticos de APIs como IndexedDB, Service Worker, Web Worker, Geolocation, File System Access API e Media Devices. A ideia é facilitar a validação de uso real, limites de UI e diferenças entre processamento na main thread e no worker.

## Funcionalidades

- Fila offline-first com IndexedDB
- Registro de Service Worker para cache/offline
- Comparação entre processamento em Web Worker e Main Thread
- Infinite scroll com Intersection Observer
- Leitura de geolocalização do navegador
- Edição de arquivos locais com File System Access API
- Captura de tela local com `getDisplayMedia()`
- Geração de arquivo de teste de 50 MB para validação de performance

## Estrutura do projeto

```text
.
├── index.html
├── package.json
├── tsconfig.json
├── public/
│   └── sw.js
├── src/
│   ├── db.ts
│   ├── hash.worker.ts
│   ├── main.ts
│   └── scripts/
│       └── generate-test-file.ts
└── bun.lock
```

## Requisitos

- Node.js
- Bun (opcional, mas recomendado para este projeto)
- Navegador moderno com suporte às APIs testadas (Chrome/Edge recomendados para File System Access e Media Devices)

## Instalação

Com npm:

```bash
npm install
```

Com Bun:

```bash
bun install
```

## Executando localmente

```bash
npm run dev
```

ou

```bash
bun run dev
```

A aplicação será servida localmente pelo Vite e pode ser acessada no navegador.

## Gerando arquivo de teste

Para criar um arquivo de 50 MB para simular processamento pesado:

```bash
npm run gen:test-file
```

ou

```bash
bun run gen:test-file
```

## Build de produção

```bash
npm run build
```

ou

```bash
bun run build
```

## Observações

- Algumas APIs dependem de permissões do navegador e podem exigir acesso manual do usuário.
- A experiência de `File System Access API` e `getDisplayMedia()` funciona melhor em Chromium-based browsers.
- O projeto foi pensado como um laboratório de experimentação para demonstrar uso prático e comparação de comportamento de APIs web.

## Tecnologias

- TypeScript
- Vite
- Zod
- Bun
