# Segurança

## Antes de publicar

1. Execute `sql/vehicle_incident_status.sql` no SQL Editor do Supabase.
2. Crie o usuário administrador no Supabase Authentication.
3. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `ADMIN_EMAIL` no Netlify.
4. Nunca publique a chave `service_role` ou senhas.

## Importante

A tela de administrador controla o acesso na interface. Para proteção completa, o Supabase precisa usar RLS: as políticas devem impedir edição e exclusão por visitantes, mesmo que alguém tente acessar o banco fora do site.

Não use `sql/rls_policies_simple.sql` em produção; ele permite alterações anônimas.

## Revisão de segurança — julho de 2026

- A chave `anon` do Supabase pode ficar no navegador; a chave `service_role` nunca pode ser publicada.
- O modo administrador protege os botões da interface, mas não substitui RLS no banco.
- Não execute `sql/disable_rls_public.sql` em produção. Ele abre leitura e alteração para qualquer pessoa que conheça a URL do projeto.
- O fluxo de multas não armazena senha nem tenta automatizar o login gov.br. A consulta é aberta diretamente no portal oficial do DNIT.

Para proteção completa de edição e exclusão, a próxima evolução necessária é mover essas operações para uma função segura no servidor (Netlify Function ou Supabase Edge Function) e aplicar políticas RLS baseadas no usuário autenticado.
