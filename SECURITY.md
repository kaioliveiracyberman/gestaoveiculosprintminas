# Segurança e publicação

## Antes de publicar

1. Execute `sql/vehicle_incident_status.sql` no **SQL Editor** do Supabase.
2. Não use `sql/rls_policies_simple.sql` em produção. Ele permite leitura e alteração anônimas para qualquer pessoa que descubra a URL do projeto.
3. Configure autenticação no Supabase e aplique políticas baseadas em usuários autenticados. O arquivo `sql/rls_policies.sql` é somente um ponto de partida e deve ser adaptado ao perfil de cada usuário.
4. Mantenha somente a chave `anon`/publishable no front-end. Nunca coloque uma `service_role` em `js/config.js`, GitHub ou Netlify.

## Limitações conhecidas

Este projeto ainda não possui tela de login. Enquanto o acesso anônimo estiver habilitado no Supabase, a proteção real dos dados dependerá de restringir a URL do site e migrar para autenticação antes do uso operacional.

## Consultas oficiais de multa

O app organiza as multas registradas internamente. Consultar bases oficiais requer uma fonte autorizada, placas cadastradas e credenciais que não devem ser expostas no navegador. Essa integração deve ser feita por uma função segura no servidor.
