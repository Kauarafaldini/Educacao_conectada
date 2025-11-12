# Documentação do Banco de Dados - Educação Conectada

## Visão Geral
Este documento descreve a estrutura do banco de dados do sistema Educação Conectada, incluindo tabelas, relacionamentos, funções e fluxos de dados.

## Tabelas Principais

### 1. `profiles`
Armazena os perfis de usuários do sistema (professores e alunos).

**Campos:**
- `id`: UUID (chave primária, referência para auth.users)
- `email`: Texto (único, obrigatório)
- `full_name`: Texto (obrigatório)
- `role`: Texto (obrigatório) - 'professor' ou 'student'
- `avatar_url`: Texto (opcional)
- `created_at`: Timestamp com fuso horário
- `updated_at`: Timestamp com fuso horário

### 2. `events`
Armazena os eventos acadêmicos (aulas, seminários, reuniões).

**Campos:**
- `id`: UUID (chave primária)
- `title`: Texto (obrigatório)
- `description`: Texto (opcional)
- `event_type`: Texto (obrigatório) - 'aula', 'seminario', 'reuniao'
- `start_date`: Timestamp com fuso horário (obrigatório)
- `end_date`: Timestamp com fuso horário (obrigatório)
- `location`: Texto (opcional)
- `creator_id`: UUID (referência para profiles, obrigatório)
- `is_cancelled`: Booleano (padrão: false)
- `is_online`: Booleano (padrão: false)
- `meeting_link`: Texto (opcional)
- `meeting_platform`: Texto (opcional) - 'google_meet', 'zoom', 'teams', 'other'
- `created_at`: Timestamp com fuso horário
- `updated_at`: Timestamp com fuso horário

### 3. `event_participants`
Tabela de junção que relaciona eventos e participantes.

**Campos:**
- `id`: UUID (chave primária)
- `event_id`: UUID (referência para events, obrigatório)
- `user_id`: UUID (referência para profiles, obrigatório)
- `invitation_status`: Texto (padrão: 'pending') - 'pending', 'accepted', 'declined'
- `notified_at`: Timestamp com fuso horário (opcional)
- `created_at`: Timestamp com fuso horário

### 4. `materials`
Armazena materiais educacionais anexados a eventos.

**Campos:**
- `id`: UUID (chave primária)
- `event_id`: UUID (referência para events, obrigatório)
- `title`: Texto (obrigatório)
- `description`: Texto (opcional)
- `file_url`: Texto (opcional)
- `file_type`: Texto (obrigatório) - 'pdf', 'video', 'link', 'document', 'image', 'other'
- `file_size`: Número inteiro (opcional)
- `uploaded_by`: UUID (referência para profiles, obrigatório)
- `created_at`: Timestamp com fuso horário

### 5. `tasks`
Armazena tarefas e atividades atribuídas a eventos.

**Campos:**
- `id`: UUID (chave primária)
- `event_id`: UUID (referência para events, opcional)
- `title`: Texto (obrigatório)
- `description`: Texto (opcional)
- `due_date`: Timestamp com fuso horário (opcional)
- `max_grade`: Numérico (padrão: 100)
- `created_by`: UUID (referência para profiles, obrigatório)
- `created_at`: Timestamp com fuso horário
- `updated_at`: Timestamp com fuso horário

### 6. `task_submissions`
Armazena as submissões dos alunos para as tarefas.

**Campos:**
- `id`: UUID (chave primária)
- `task_id`: UUID (referência para tasks, obrigatório)
- `student_id`: UUID (referência para profiles, obrigatório)
- `content`: Texto (opcional)
- `file_url`: Texto (opcional)
- `grade`: Numérico (opcional)
- `feedback`: Texto (opcional)
- `submitted_at`: Timestamp com fuso horário (padrão: now())
- `graded_at`: Timestamp com fuso horário (opcional)

## Funções e Gatilhos

### 1. `handle_updated_at()`
Atualiza automaticamente o campo `updated_at` quando um registro é modificado.

**Tabelas que utilizam:**
- profiles
- events
- tasks

### 2. `handle_new_user()`
Cria automaticamente um perfil quando um novo usuário se registra no sistema.

**Tabelas afetadas:**
- profiles

## Fluxo de Dados

### 1. Criação de Evento
1. Um professor cria um novo evento na tabela `events`
2. Os participantes são adicionados na tabela `event_participants`
3. Notificações são geradas na tabela `notifications`

### 2. Submissão de Tarefa
1. Um professor cria uma tarefa na tabela `tasks`
2. Os alunos submetem suas respostas na tabela `task_submissions`
3. O professor avalia e atualiza a submissão com nota e feedback

### 3. Acompanhamento de Presença
1. O sistema registra a presença na tabela `attendance`
2. O status de presença pode ser: 'present', 'absent', 'late', 'excused'

## Segurança

### Row Level Security (RLS)
Todas as tabelas têm RLS habilitado com políticas que garantem:
- Usuários autenticados podem ver apenas seus próprios dados
- Professores podem gerenciar seus eventos e materiais
- Alunos podem ver apenas eventos aos quais foram convidados
- Apenas criadores de eventos podem modificá-los

## Índices

### Índices Principais
- `idx_events_creator`: Otimiza buscas por criador de evento
- `idx_events_start_date`: Otimiza ordenação por data de início
- `idx_event_participants_event`: Acelera buscas por participantes de um evento
- `idx_event_participants_user`: Acelera buscas por eventos de um usuário
- `idx_task_submissions_student`: Otimiza buscas por submissões de um aluno

## Convenções

### Nomenclatura
- Tabelas: sempre no plural e em inglês (ex: `profiles`, `events`)
- Chaves estrangeiras: `nome_da_tabela_no_singular_id` (ex: `event_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`

### Tipos de Dados
- IDs: UUID
- Textos curtos: `text`
- Valores numéricos: `numeric` ou `integer`
- Datas: `timestamptz` (timestamp com timezone)

## Considerações de Desempenho
- Índices criados em colunas frequentemente consultadas
- Chaves estrangeiras com `ON DELETE CASCADE` para manter a integridade
- Timestamps em UTC para consistência
- Limpeza automática de registros antigos quando aplicável

## Boas Práticas
1. Sempre use transações para operações atômicas
2. Respeite as permissões definidas nas políticas de RLS
3. Mantenha os índices atualizados conforme o padrão de consultas evolui
4. Documente quaisquer alterações no esquema do banco de dados
5. Faça backup regularmente dos dados importantes
