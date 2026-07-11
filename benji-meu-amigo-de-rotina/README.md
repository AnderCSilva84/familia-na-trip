# Benji — Meu Amigo de Rotina

MVP em React e TypeScript para apoiar crianças autistas com rotinas visuais previsíveis, tranquilas e positivas. O responsável organiza crianças e missões; a criança inicia, acompanha etapas, pede ajuda ou pausa e conclui sem punições.

## Instalação

```bash
npm install
copy .env.example .env
npm run dev
```

Validação e build:

```bash
npm run lint
npm run build
npm run preview
```

Sem variáveis Firebase, o projeto usa `localStorage` como fallback exclusivo de desenvolvimento.

## Firebase

1. Crie um projeto Firebase e um app Web.
2. Ative Authentication por e-mail/senha, Firestore e Storage.
3. Preencha `.env` a partir do `.env.example`.
4. Publique `firestore.rules`, `storage.rules` e `firestore.indexes.json`.

As regras limitam crianças, rotinas, execuções, preferências e arquivos ao usuário proprietário.

## Funcionalidades

- autenticação Firebase e recuperação de senha;
- cadastro de crianças e CRUD de rotinas/etapas;
- modos responsável e criança protegidos;
- missões diárias, ajuda, pausa, conclusão e estrelas;
- histórico acolhedor e preferências sensoriais;
- Benji animado com redução de movimento;
- voz por Web Speech API;
- escrita em Canvas e desafio de matemática;
- PWA instalável e persistência offline do Firestore.

## Estrutura

```text
src/
  components/  constants/  contexts/  firebase/
  pages/       routes/     services/  types/
```

## Netlify

Use este diretório como base, `npm run build` como comando e `dist` como publicação. Cadastre as variáveis `VITE_FIREBASE_*` no painel. O `netlify.toml` já configura o fallback SPA.

## Limitações do MVP

- upload/gravação de áudio e reordenação visual ainda precisam de interface dedicada;
- a fila offline usa a persistência nativa do Firestore, sem tela de conflitos;
- matemática inclui soma básica; outros desafios são evolução;
- onboarding, modelos prontos e gráficos avançados permanecem como próximos passos.
