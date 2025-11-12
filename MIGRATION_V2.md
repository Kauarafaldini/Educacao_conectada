# Educação Conectada - Guia de Migração V1 → V2

## Visão Geral

A versão 2 da plataforma "Educação Conectada" expande significativamente as funcionalidades mantendo 100% de compatibilidade com os dados existentes.

## Novos Recursos

### 1. Melhorias de UX/UI

✅ **Dashboard Inicial com Estatísticas**
- Resumo do dia com próximos eventos
- Contadores de tarefas pendentes e concluídas
- Eventos do dia
- Comunicados recentes

✅ **Modo Escuro e Acessibilidade**
- Toggle entre modo claro e escuro
- 3 tamanhos de fonte (pequena, média, grande)
- Modo alto contraste
- Configurações persistidas por usuário

✅ **Navegação Aprimorada**
- Menu lateral responsivo
- Navegação entre módulos
- Design mobile-first
- Animações suaves

### 2. Expansão Acadêmica

✅ **Materiais Didáticos**
- Upload de PDFs, vídeos e links
- Organização por evento
- Tipos: PDF, Vídeo, Link, Documento, Imagem
- Gerenciamento de materiais por professores

🚧 **Controle de Presença** (Estrutura pronta)
- Tabela `attendance` criada
- Suporte para QR Code
- Status: presente, ausente, atrasado, justificado
- Check-in digital

🚧 **Tarefas e Avaliações** (Estrutura pronta)
- Tabelas `tasks` e `task_submissions` criadas
- Sistema de notas e feedback
- Prazos e acompanhamento
- Interface em desenvolvimento

### 3. Comunicação Interna

🚧 **Chat de Evento** (Estrutura pronta)
- Tabela `messages` criada
- Chat por evento
- Interface em desenvolvimento

🚧 **Fórum de Discussão** (Estrutura pronta)
- Tabelas `forum_topics` e `forum_posts` criadas
- Sistema de tópicos e respostas
- Categorias e moderação
- Interface em desenvolvimento

🚧 **Anúncios** (Estrutura pronta)
- Tabela `announcements` criada
- Prioridades: baixa, normal, alta, urgente
- Data de expiração
- Exibição no dashboard

✅ **Feed de Atividades**
- Tabela `activity_feed` criada
- Registro de ações do sistema
- Base para notificações inteligentes

### 4. Integrações

✅ **Preparação para Reuniões Online**
- Campos `is_online`, `meeting_link`, `meeting_platform` adicionados aos eventos
- Suporte para Google Meet, Zoom, Teams
- Interface de criação atualizada

🔜 **Sincronização com Calendários** (Planejado)
- Google Calendar
- Outlook Calendar

🔜 **Armazenamento em Nuvem** (Planejado)
- Google Drive
- OneDrive

### 5. Administração

✅ **Controle de Perfis Aprimorado**
- Todos os usuários podem visualizar todos os perfis
- Preparação para adicionar role 'admin'

✅ **Logs de Auditoria**
- Tabela `audit_logs` criada
- Rastreamento de ações críticas
- IP e User Agent

🔜 **Painel Administrativo** (Planejado)
- CRUD de usuários
- Gestão de turmas
- Relatórios de engajamento

### 6. Segurança

✅ **Row Level Security (RLS)**
- Todas as novas tabelas têm RLS habilitado
- Políticas granulares de acesso
- Proteção de dados por padrão

✅ **Preferências de Usuário**
- Tabela `user_preferences` com criptografia
- Configurações pessoais isoladas

## Migração do Banco de Dados

### Passo 1: Aplicar Nova Migration

O arquivo de migração está em:
```
supabase/migrations/20250102000000_add_advanced_features.sql
```

**Opção A: Via Supabase Dashboard**
1. Acesse o SQL Editor no Supabase
2. Cole o conteúdo do arquivo de migração
3. Execute o SQL

**Opção B: Via Supabase CLI**
```bash
supabase db push
```

### Passo 2: Verificar Tabelas Criadas

Execute no SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'materials', 'attendance', 'tasks', 'task_submissions',
  'messages', 'forum_topics', 'forum_posts', 'announcements',
  'activity_feed', 'user_preferences', 'audit_logs'
);
```

Você deve ver 11 novas tabelas.

### Passo 3: Verificar Colunas Adicionadas

Execute:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('is_online', 'meeting_link', 'meeting_platform');
```

## Compatibilidade com Dados Existentes

### ✅ Totalmente Compatível

Todos os dados existentes continuam funcionando normalmente:
- ✅ Perfis de usuários
- ✅ Eventos
- ✅ Participantes de eventos
- ✅ Notificações

### 🆕 Novos Dados

As novas tabelas iniciam vazias e serão populadas conforme o uso:
- Materiais didáticos
- Registros de presença
- Tarefas e submissões
- Mensagens de chat
- Tópicos e posts do fórum
- Comunicados
- Feed de atividades
- Preferências de usuário (criadas automaticamente)
- Logs de auditoria

## Mudanças na Interface

### Antes (V1)
- Dashboard simples com calendário e lista de eventos
- Sem navegação entre módulos
- Apenas modo claro

### Agora (V2)
- Dashboard inicial com estatísticas e resumo
- Menu lateral com navegação entre módulos
- Modo escuro/claro
- Configurações de acessibilidade
- Preparação para novos módulos

## Próximos Passos de Desenvolvimento

### Prioridade Alta
1. Finalizar interface de Tarefas e Avaliações
2. Implementar Chat de Evento
3. Criar módulo de Presença com QR Code

### Prioridade Média
4. Completar Fórum de Discussão
5. Implementar Comunicados institucionales
6. Adicionar painel administrativo

### Prioridade Baixa
7. Integração com Google Meet/Zoom
8. Sincronização com calendários externos
9. Sistema de recomendações com IA

## Como Usar os Novos Recursos

### Modo Escuro
1. Clique em "Configurações" no menu lateral
2. Toggle o botão "Tema"
3. A preferência é salva automaticamente

### Materiais Didáticos
1. Acesse um evento (criador apenas)
2. Clique em "Materiais"
3. Adicione título, tipo e URL do arquivo
4. Materiais ficam disponíveis para todos os participantes

### Dashboard Inicial
- Ao fazer login, você vê automaticamente:
  - Estatísticas de eventos e tarefas
  - Próximos 5 eventos
  - Tarefas pendentes
  - Comunicados recentes

## Rollback (Se Necessário)

Se precisar reverter para V1:

1. **Manter os dados:**
```sql
-- As novas tabelas podem ser mantidas sem afetar o funcionamento
-- Apenas remova as colunas adicionadas se necessário
ALTER TABLE events DROP COLUMN IF EXISTS is_online;
ALTER TABLE events DROP COLUMN IF EXISTS meeting_link;
ALTER TABLE events DROP COLUMN IF EXISTS meeting_platform;
```

2. **Código frontend:**
- Use o arquivo `DashboardV1.tsx` se foi preservado
- Ou reverta para o commit anterior do Git

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console do navegador
2. Revise os logs de erro do Supabase
3. Consulte a documentação das tabelas no arquivo de migração

## Checklist de Verificação Pós-Migração

- [ ] Todas as 11 novas tabelas foram criadas
- [ ] 3 novas colunas adicionadas à tabela `events`
- [ ] RLS habilitado em todas as novas tabelas
- [ ] Login funciona normalmente
- [ ] Dashboard inicial carrega com estatísticas
- [ ] Modo escuro funciona
- [ ] Eventos existentes aparecem normalmente
- [ ] Calendário funciona corretamente
- [ ] Criação de novos eventos funciona
- [ ] Configurações são salvas

## Performance

A V2 inclui otimizações:
- ✅ Indexes em todas as colunas frequentemente consultadas
- ✅ Lazy loading de módulos
- ✅ Queries otimizadas
- ✅ Cache local de preferências

## Conclusão

A migração V1 → V2 é **não destrutiva** e **compatível com dados existentes**. Todos os recursos da V1 continuam funcionando, com novos recursos adicionados de forma incremental.
