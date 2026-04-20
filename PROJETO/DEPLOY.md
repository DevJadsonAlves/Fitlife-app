# Deploy FitLife

Fluxo simples para trabalhar com preview e producao no Vercel.

Projeto atualmente linkado na Vercel: `jadsonalves/fitlife`.

## Preview

Use quando quiser testar uma alteracao antes de publicar para todo mundo.

```bash
npm run deploy:preview
```

Isso gera uma URL unica de preview no Vercel.

Observacao:
se o preview nascer sem as variaveis publicas do Supabase, complete o ambiente `Preview` no painel da Vercel com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
Se quiser usar Form Check com IA de camera, configure tambem `ANTHROPIC_API_KEY` (server-side, sem prefixo `VITE_`).
Em alguns projetos o Vercel pede escopo por branch no Preview; nesse caso, adicione as variaveis para uma branch de preview valida no GitHub.

## Producao

Use apenas quando a versao estiver aprovada.

```bash
npm run deploy:prod
```

Esse comando publica a versao de producao.

## Variaveis do Vercel

Se precisar puxar as variaveis salvas na Vercel:

```bash
npm run vercel:pull:preview
npm run vercel:pull:prod
```

## Observabilidade (opcional, recomendado)

Para habilitar auditoria e log de erros no Supabase, rode:

- `supabase_security_observability_schema.sql`

## Fluxo recomendado

1. Desenvolver localmente com `npm run dev`
2. Validar com `npm run check`
3. Subir preview com `npm run deploy:preview`
4. Testar no celular
5. Publicar com `npm run deploy:prod`
