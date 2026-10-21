# Projeto Casamento - Lucas & Amanda

Visão geral, estrutura e integrações: [README.md](README.md). Banco, deploy
e pendências: [docs/banco-e-deploy.md](docs/banco-e-deploy.md).

## Regras do projeto

- **A identidade visual está aprovada.** Cores e fontes vêm de
  `src/app/globals.css` e `tailwind.config.ts` (azul mariano, dourado,
  Cormorant Garamond e Lato). Não mudar sem pedido explícito.
- Textos do site em português do Brasil.
- Código só de servidor fica em `src/lib/servidor/` e importa
  `"server-only"`. Segredos nunca com prefixo `NEXT_PUBLIC_`.
- Preço, valor e status de pagamento vêm sempre do banco ou do Mercado Pago,
  nunca do navegador.
- Tabela ou coluna nova: `src/db/esquema.ts`, `npm run db:gerar` e, se o
  site escreve nela, `scripts/permissoes.ts`.
- Administradores só pelo dono do banco; o site nunca ganha permissão de
  escrita em `administradores`.

## Verificar antes de concluir

```bash
npm run lint
npm test
npm run build
npm run test:banco   # com Docker rodando
```

Mudança visual: conferir no app rodando (`npm run dev`, porta 3000) e em
375px de largura.
