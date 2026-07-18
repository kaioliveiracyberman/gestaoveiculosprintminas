# Segurança

## Antes de publicar

1. Execute `sql/vehicle_incident_status.sql` no SQL Editor do Supabase.
2. Crie o usuário administrador no Supabase Authentication.
3. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `ADMIN_EMAIL` no Netlify.
4. Nunca publique a chave `service_role` ou senhas.

## Importante

A tela de administrador controla o acesso na interface. Para proteção completa, o Supabase precisa usar RLS: as políticas devem impedir edição e exclusão por visitantes, mesmo que alguém tente acessar o banco fora do site.

Não use `sql/rls_policies_simple.sql` em produção; ele permite alterações anônimas.
