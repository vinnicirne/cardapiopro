# Log de Atualizações (Saas Cardápio)

Registro cronológico de mudanças estruturais, otimizações e correções do sistema.

## v1.1.0 - Módulo de Encomendas e Refinamentos de Assinatura
- **Mudanças Estruturais:**
  - Implementação de funcionalidade de Encomendas (Pre-orders). Adicionado campos `is_preorder` e `preorder_notice` na tabela `products`.
  - Sistema exige entrada de Data e Horário na finalização da compra (CheckoutModal) quando itens sob encomenda estão no carrinho.
  - Criação da Loja de Demonstração pública (botão na Landing Page aponta para `/cardapio/demo`). Loja criada sem `owner_id` para bloquear edições não autorizadas mantendo visualização pública.
  - Correção do join de planos: a consulta em `stores` agora é feita via `subscriptions(plans(*))` evitando falhas HTTP 400.
  - Introdução do "Feature Gating": bloqueio de funções exclusivas (como Cupons) no painel de Lojistas com o Plano Grátis.
- **Otimizações e Correções:**
  - Correção no CSS de impressão (`@media print`) na tela de Gestão de Pedidos para permitir a impressão da Comanda Térmica.
  - Correção de tipagem TypeScript no `RegisterPage` para resolver falhas no build da Vercel.

## v1.0.0 - Lançamento Inicial e Estrutura Core
- **Mudanças Estruturais:**
  - Configuração do projeto com React, Vite e Supabase.
  - Tabelas de Lojas, Produtos, Pedidos, Clientes, Horários de Funcionamento e Planos SaaS criadas com Row Level Security (RLS) configurado.
  - Lógica de carrinho, subtotal e cálculo de taxa de entrega com integração visual pelo WhatsApp.
  - Integração inicial com webhook da Kiwify via Supabase Edge Functions.
