# Documentação Técnica - Plataforma de Educação Conectada

## Índice
1. [Visão Geral](#1-visão-geral)
   - [1.1 Objetivo](#11-objetivo)
   - [1.2 Arquitetura](#12-arquitetura)
   - [1.3 Fluxo de Dados](#13-fluxo-de-dados)
2. [Tecnologias Utilizadas](#2-tecnologias-utilizadas)
   - [2.1 Frontend](#21-frontend)
   - [2.2 Backend](#22-backend)
   - [2.3 Banco de Dados](#23-banco-de-dados)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Autenticação e Autorização](#5-autenticação-e-autorização)
6. [Funcionalidades Principais](#6-funcionalidades-principais)
7. [Integração com Supabase](#7-integração-com-supabase)
8. [Segurança](#8-segurança)
9. [Testes](#9-testes)
10. [Deploy](#10-deploy)
11. [Perguntas Frequentes](#11-perguntas-frequentes)
12. [Melhorias Futuras](#12-melhorias-futuras)
13. [Contribuição](#13-contribuição)

---

## 1. Visão Geral

### 1.1 Objetivo
A Plataforma de Educação Conectada é uma solução inovadora que visa facilitar a interação entre estudantes e educadores, proporcionando um ambiente virtual completo para gestão de eventos acadêmicos, compartilhamento de materiais e comunicação em tempo real.

### 1.2 Arquitetura
- **Frontend**: Aplicação React com TypeScript
- **Backend**: Supabase (BaaS - Backend as a Service)
- **Banco de Dados**: PostgreSQL (gerenciado pelo Supabase)
- **Autenticação**: Serviço de autenticação do Supabase
- **Estilização**: Tailwind CSS
- **Build e Deploy**: Vite

### 1.3 Fluxo de Dados
1. O usuário acessa a aplicação através do navegador
2. O frontend se conecta ao Supabase para autenticação
3. Dados são armazenados e recuperados do PostgreSQL via API do Supabase
4. Atualizações em tempo real são gerenciadas através de WebSockets

## 2. Tecnologias Utilizadas

### 2.1 Frontend
- React 18 com TypeScript
- Vite como bundler e servidor de desenvolvimento
- Tailwind CSS para estilização
- React Query para gerenciamento de estado do servidor
- React Hook Form para validação de formulários
- React Router para navegação

### 2.2 Backend
- Supabase para autenticação, banco de dados e armazenamento
- PostgreSQL como banco de dados relacional
- Funções serverless para lógica de negócios complexa

### 2.3 Banco de Dados
- PostgreSQL 14+
- Supabase para gerenciamento
- Migrações versionadas
- Row Level Security (RLS) para controle de acesso

## 3. Estrutura do Projeto

```
src/
├── assets/           # Recursos estáticos (imagens, ícones, etc.)
├── components/       # Componentes React reutilizáveis
│   ├── ui/          # Componentes de UI genéricos
│   ├── layout/      # Componentes de layout
│   └── features/    # Componentes específicos de funcionalidades
├── contexts/        # Contextos React para gerenciamento de estado
├── hooks/           # Hooks personalizados
├── lib/             # Código de infraestrutura
│   └── supabase.ts  # Configuração do cliente Supabase
├── pages/           # Componentes de página
├── services/        # Serviços para chamadas à API
├── types/           # Definições de tipos TypeScript
└── utils/           # Utilitários e funções auxiliares
```

## 4. Configuração do Ambiente

### 4.1 Pré-requisitos
- Node.js 16+
- npm ou yarn
- Conta no Supabase

### 4.2 Instalação

1. Clonar o repositório:
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd educacao_conectada
   ```

2. Instalar dependências:
   ```bash
   npm install
   # ou
   yarn
   ```

3. Configurar variáveis de ambiente:
   Criar arquivo `.env` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

4. Iniciar servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

## 5. Autenticação e Autorização

### 5.1 Fluxo de Autenticação
1. O usuário faz login com email/senha, Google ou GitHub
2. O Supabase valida as credenciais e retorna um token JWT
3. O token é armazenado em um cookie HTTP-only
4. Todas as requisições subsequentes incluem o token no cabeçalho

### 5.2 Níveis de Acesso
- **Estudante**: Pode visualizar eventos, enviar mensagens e acessar materiais
- **Professor**: Todas as permissões de estudante, mais criação e gerenciamento de eventos
- **Administrador**: Acesso total ao sistema

## 6. Funcionalidades Principais

### 6.1 Gestão de Eventos
- Criação, edição e exclusão de eventos
- Convite de participantes
- Notificações em tempo real
- Compartilhamento de materiais

### 6.2 Chat em Tempo Real
- Mensagens instantâneas
- Upload de arquivos
- Histórico de conversas
- Notificações de mensagens não lidas

### 6.3 Perfil de Usuário
- Informações pessoais
- Preferências de notificação
- Histórico de atividades
- Configurações de privacidade

## 7. Integração com Supabase

### 7.1 Configuração
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

### 7.2 Operações Comuns
```typescript
// Autenticação
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@exemplo.com',
  password: 'senha-segura'
});

// Consulta a dados
const { data: events, error } = await supabase
  .from('events')
  .select('*')
  .eq('is_cancelled', false);

// Inserção de dados
const { data, error } = await supabase
  .from('events')
  .insert([{ title: 'Aula de Matemática', ... }]);

// Atualização em tempo real
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('Nova mensagem:', payload.new);
    }
  )
  .subscribe();
```

## 8. Segurança

### 8.1 Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado. Exemplo de política:

```sql
-- Permite que usuários vejam apenas seus próprios perfis
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

### 8.2 Boas Práticas
- Todas as senhas são armazenadas com hash
- Tokens JWT com tempo de expiração curto
- Proteção contra CSRF
- Validação de entrada em todos os formulários

## 9. Testes

### 9.1 Testes Unitários
```bash
npm test
# ou
yarn test
```

### 9.2 Testes de Integração
```typescript
describe('EventService', () => {
  it('deve criar um novo evento', async () => {
    const eventData = { title: 'Teste', start_date: '2025-01-01', ... };
    const event = await EventService.createEvent(eventData);
    expect(event).toHaveProperty('id');
  });
});
```

## 10. Deploy

### 10.1 Ambiente de Produção
1. Construir a aplicação:
   ```bash
   npm run build
   ```

2. Os arquivos estáticos serão gerados em `/dist`

3. Configurar o Supabase para produção:
   - Ativar RLS
   - Configurar domínios permitidos
   - Configurar políticas de segurança

## 11. Perguntas Frequentes

### 11.1 Como adicionar um novo provedor de autenticação?
1. Acesse o painel do Supabase
2. Vá para Authentication > Providers
3. Habilite o provedor desejado (Google, GitHub, etc.)
4. Siga as instruções para configurar as credenciais

### 11.2 Como fazer backup do banco de dados?
```bash
# Usando pg_dump
pg_dump -h db.xxx.supabase.co -p 5432 -U postgres -d postgres > backup.sql
```

### 11.3 Como depurar problemas de autenticação?
1. Verifique o console do navegador
2. Verifique os logs do Supabase
3. Confira se as variáveis de ambiente estão corretas

## 12. Melhorias Futuras

### 12.1 Próximos Passos
- [ ] Implementar testes de integração
- [ ] Adicionar suporte a temas escuro/claro
- [ ] Melhorar acessibilidade
- [ ] Adicionar suporte a múltiplos idiomas

### 12.2 Recursos Planejados
- [ ] Sistema de avaliações
- [ ] Fórum de discussão
- [ ] Integração com ferramentas de videoconferência
- [ ] Aplicativo móvel

## 13. Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**Nota**: Esta documentação está sujeita a atualizações conforme o projeto evolui. Última atualização: Novembro de 2025.
