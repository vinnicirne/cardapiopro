# Prompt de Engenharia: Clonagem do Sistema SaaS Cardápio

**Objetivo:** Este documento serve como o "Master Prompt" para ser enviado a uma Inteligência Artificial (como Claude, GPT-4, ou Gemini) com o objetivo de recriar integralmente a arquitetura, o banco de dados e as funcionalidades do SaaS Cardápio.

---

## Instruções Iniciais para a IA
Atue como um Engenheiro de Software Sênior. Você irá construir uma plataforma SaaS Multi-Tenant de Cardápios Digitais. A plataforma permite que lojistas criem cardápios públicos, gerenciem pedidos e paguem uma assinatura mensal para usar o sistema.

**Tech Stack Exigida:**
- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Ícones: `lucide-react`
- Roteamento: `react-router-dom` (com `BrowserRouter`)
- Banco de Dados e Autenticação: Supabase (PostgreSQL) com Row Level Security (RLS)
- Gerenciamento de Estado: Zustand (`zustand`)
- Design: Glassmorphism, temas escuros com cores primárias vibrantes (Laranja/Primary).

---

## Módulo 1: Arquitetura de Banco de Dados (Supabase PostgreSQL)

A base do sistema exige Multi-Tenancy. Cada tabela deve ter `store_id` (exceto a própria tabela de `stores`), e o RLS deve isolar os dados por lojista usando `auth.uid() = owner_id`.

**Tabelas Necessárias:**
1. `stores`: id, owner_id (FK auth.users), name, slug (UNIQUE), is_open (boolean), opening_hours (jsonb).
2. `categories`: id, store_id, name.
3. `products`: id, store_id, category_id, name, description, price, original_price, image_url, is_preorder (boolean), preorder_notice (text).
4. `product_options` (Complementos): id, product_id, name, max_choices, is_required.
5. `product_option_items`: id, option_id, name, price.
6. `delivery_areas`: id, store_id, name, fee, estimated_time.
7. `orders` e `order_items`: Pedidos do cliente final. Status: pending, preparing, ready, delivered, cancelled.
8. `customers`: id, store_id, name, phone, total_orders, total_spent.
9. `plans`: id, name, stripe_price_id, price, features, active, is_popular, max_products.
10. `subscriptions`: id, store_id, plan_id, status (active, past_due, canceled).

**Políticas (RLS) Cruciais:**
- Leitura pública (SELECT): `stores`, `categories`, `products`, `delivery_areas`, `plans`.
- Inserção pública: `orders`, `order_items` (clientes fazem pedidos sem login).
- Gerenciamento Privado: Lojista só pode fazer UPDATE/INSERT/DELETE onde `store_id` pertence a uma loja cujo `owner_id = auth.uid()`.

---

## Módulo 2: Stores Zustand (Gerenciamento de Estado)

Crie os seguintes stores globais usando `zustand`:
- `authStore.ts`: Gerencia sessão ativa, login, logout e registra `user` do Supabase.
- `platformStore.ts`: Gerencia configurações globais da plataforma e o plano atual do lojista logado.
- `cartStore.ts`: Gerencia o carrinho do cliente no front-end da loja pública (itens, subtotal, taxa de entrega).

---

## Módulo 3: Landing Page Pública (SaaS)

Uma landing page focada em conversão de donos de restaurante.
**Sessões:**
- **Hero:** Título chamativo, subtítulo, botão "Criar meu cardápio" e botão secundário "Ver demonstração" (Link para `/demo`). Efeito glassmorphism e cores neon.
- **Recursos:** Cards com ícones `lucide-react` (Interface Mobile-first, Pedidos em tempo real).
- **Depoimentos:** Seção com testemunhos falsos de sucesso, classificação de estrelas nativas.
- **Preços:** Busca os planos ativados na tabela `plans`. O botão de "Assinar" envia o lojista para o `/register` passando o link de pagamento do gateway na URL (`?checkout=link`).
- **FAQ:** Perguntas frequentes usando tags nativas `<details>` e `<summary>`.

---

## Módulo 4: Autenticação e Onboarding

- **Login:** Autenticação padrão com E-mail e Senha.
- **Registro (Onboarding):** Tela que capta e-mail, senha, nome da loja e slug da loja.
  - *Fluxo crítico:* Cria o usuário no auth, e imediatamente faz o `INSERT` na tabela `stores` criando a loja. Redireciona o cliente dinamicamente para o checkout do gateway de pagamentos usando a URL salva na etapa de Preços.

---

## Módulo 5: Visão Pública do Cardápio (`/:storeSlug`)

Esta é a tela onde o cliente final compra.
- Ao entrar em `/:storeSlug`, busque a `store` pelo slug. Se não achar, mostre tela de erro.
- Se a loja estiver fechada (`is_open = false` ou validação pelo `opening_hours` JSONB), exibir um banner flutuante informando que está fechada.
- **Listagem:** Separe os produtos por categoria. 
- **Detalhe do Produto:** Um Modal que permite escolher complementos (`product_options`). Se `is_preorder` for verdadeiro, mostre um Badge (Sob Encomenda) e o aviso.
- **Carrinho (CheckoutModal):** Modal inferior que resume o pedido, calcula o frete baseado na tabela `delivery_areas`, exige que o cliente preencha Nome, Telefone e Endereço.
- Se o carrinho tiver itens "Sob Encomenda", exiba um campo obrigatório para escolher Data/Hora desejada.
- **Finalização:** Ao fechar o pedido, insira em `orders` e `order_items` no Supabase e redirecione o cliente para o WhatsApp do lojista com o texto de resumo formatado.

---

## Módulo 6: Painel do Lojista (Dashboard)

Rota protegida (`/dashboard/*`). Menu lateral e topbar.
- **Pedidos (Real-time):** Listagem em estilo Kanban (Pendente, Preparando, Concluído). Use `supabase.channel('custom-insert-channel')` para ouvir novos pedidos ao vivo e tocar alerta sonoro.
- **Impressão Térmica:** O modal de detalhe do pedido precisa de um botão "Imprimir Comanda". A interface deve esconder menus laterais no `@media print` para caber em impressoras 80mm.
- **Catálogo:** CRUD completo de Categorias, Produtos, Complementos e Opções. Suporte a upload de imagem para o bucket do Supabase (com crop nativo usando `react-easy-crop`).
- **Áreas de Entrega:** CRUD simples de raio/bairro, valor e tempo estimado.
- **Clientes:** Lista de clientes gerada automaticamente a partir dos telefones registrados nos pedidos (CRM básico).
- **Premium Gating:** Telas como "Cupons" exigem verificação se a loja tem um plano pago. Se não tiver, exiba um overlay com cadeado e botão "Fazer Upgrade" (Bloqueio de Funcionalidade).

---

## Módulo 7: Painel Super Admin (`/admin`)
Uma área restrita apenas para administradores da plataforma (verificado se `email = admin@admin.com` ou flag no JWT).
- **Gerenciador de Lojas:** Lista todas as lojas cadastradas na plataforma.
- **Gerenciador de Planos:** Criação de pacotes SaaS (Grátis, Pro, Premium) configurando limites (`max_products`) e links de checkout.
- **Gerenciador de Assinaturas:** Conexão manual via webhook (Kiwify ou Stripe Edge Functions) para atualizar o status de pagamento de uma loja.

---
## Regras de Estilo e Padrão de Código
- Não crie arquivos CSS separados exceto o `index.css` principal com Tailwind directives.
- Use tipagem estrita no TypeScript. Exporte `interface` para todos os payloads de banco de dados.
- Mantenha funções pequenas. Separe modals lógicos em componentes dentro de `/components/shared/` ou `/components/dashboard/`.
- Tratamento de erro robusto com blocos `try/catch` ao comunicar com o Supabase. Exiba feedbacks visuais claros (toasts ou banners).
