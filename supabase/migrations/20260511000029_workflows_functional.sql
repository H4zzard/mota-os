-- ─── Etapa J.1 — Workflows funcionais ────────────────────────────────────────
-- Adiciona colunas faltantes, atualiza índices e seeds sem apagar dados.

-- ─── 1. Ajustar tabela workflows ─────────────────────────────────────────────

-- Permitir company_id null (= workflow global)
ALTER TABLE workflows ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE workflows ALTER COLUMN company_id DROP DEFAULT;

-- Colunas novas
ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS input_schema     jsonb        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS prompt_template  text,
  ADD COLUMN IF NOT EXISTS default_agent_id uuid         REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS output_type      text         NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata         jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by       uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at      timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz;

-- Preencher category a partir de area para rows existentes
UPDATE workflows SET category = area WHERE category IS NULL AND area IS NOT NULL;

-- ─── 2. Ajustar tabela workflow_runs ─────────────────────────────────────────

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS input         jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS output_json   jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_id      uuid         REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider      text,
  ADD COLUMN IF NOT EXISTS model_used    text,
  ADD COLUMN IF NOT EXISTS input_tokens  integer,
  ADD COLUMN IF NOT EXISTS output_tokens integer,
  ADD COLUMN IF NOT EXISTS started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS metadata      jsonb        NOT NULL DEFAULT '{}';

-- Migrar values → input para runs existentes
UPDATE workflow_runs SET input = values WHERE input = '{}' AND values IS NOT NULL;

-- ─── 3. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS workflows_company_status_idx  ON workflows (company_id, status);
CREATE INDEX IF NOT EXISTS workflows_category_idx        ON workflows (category);
CREATE INDEX IF NOT EXISTS workflows_deleted_idx         ON workflows (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx    ON workflow_runs (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_company_idx     ON workflow_runs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_status_idx      ON workflow_runs (status);

-- ─── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflows: authenticated full access" ON workflows;
CREATE POLICY "workflows: authenticated read" ON workflows
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "workflows: admin write" ON workflows
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 5. Seeds — workflows globais padrão ─────────────────────────────────────
-- Usa ON CONFLICT (name, company_id) para não duplicar.
-- Esses são globais (company_id = null).

-- Workflow 1: Criar campanha de leads
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'Criar campanha de leads',
  'Estrutura completa de campanha: objetivo, público, criativos, landing page e configurações de anúncio.',
  'marketing', 'Marketing', '#16a34a', 'active', 'campaign_plan', NULL,
  '[
    {"id":"produto",   "label":"Produto / Oferta",        "type":"text",     "required":true, "placeholder":"Ex: Intensivão PMPE 2026"},
    {"id":"objetivo",  "label":"Objetivo principal",       "type":"select",   "required":true, "options":["Geração de leads","Vendas diretas","Reconhecimento de marca","Tráfego para site"]},
    {"id":"publico",   "label":"Público-alvo",             "type":"textarea", "required":true, "placeholder":"Descreva o perfil do público"},
    {"id":"periodo",   "label":"Período da campanha",      "type":"text",     "required":false,"placeholder":"Ex: 4 semanas"},
    {"id":"orcamento", "label":"Orçamento disponível",     "type":"text",     "required":false,"placeholder":"Ex: R$ 5.000/mês"}
  ]',
  'Você é um especialista em marketing digital. Crie uma campanha completa de captação de leads para o produto: {{produto}}.

Objetivo: {{objetivo}}
Público-alvo: {{publico}}
Período: {{periodo}}
Orçamento: {{orcamento}}

Entregue:
1. Estratégia geral (2-3 parágrafos)
2. Sugestão de 3 criativos (formato, copy principal, CTA)
3. Configuração recomendada de anúncio (plataforma, segmentação, lance)
4. KPIs e metas esperadas
5. Cronograma simplificado',
  '[
    {"title":"Produto e objetivo","description":"Defina o produto e objetivo da campanha.","fields":[
      {"id":"produto","label":"Produto / Oferta","type":"text","required":true,"placeholder":"Ex: Intensivão PMPE 2026"},
      {"id":"objetivo","label":"Objetivo principal","type":"select","required":true,"options":["Geração de leads","Vendas diretas","Reconhecimento de marca","Tráfego para site"]}
    ]},
    {"title":"Público e budget","description":"Quem você quer atingir e quanto pode investir.","fields":[
      {"id":"publico","label":"Público-alvo","type":"textarea","required":true,"placeholder":"Descreva o perfil do público"},
      {"id":"periodo","label":"Período","type":"text","required":false,"placeholder":"Ex: 4 semanas"},
      {"id":"orcamento","label":"Orçamento","type":"text","required":false,"placeholder":"Ex: R$ 5.000/mês"}
    ]},
    {"title":"Revisar e executar","description":"Confirme as informações e execute.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 2: Gerar relatório diário
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000002-0000-0000-0000-000000000002',
  'Gerar relatório diário',
  'Relatório de performance de campanhas e métricas do dia para apresentar à equipe.',
  'reports', 'Relatórios', '#0ea5e9', 'active', 'report', NULL,
  '[
    {"id":"periodo",  "label":"Período",           "type":"text",     "required":true,  "placeholder":"Ex: 01/05 a 07/05/2025"},
    {"id":"metricas", "label":"Métricas principais","type":"textarea", "required":true,  "placeholder":"Ex: Leads: 120, CPL: R$8,50, CTR: 3,2%..."},
    {"id":"campanhas","label":"Campanhas ativas",   "type":"textarea", "required":false, "placeholder":"Liste as campanhas ativas"}
  ]',
  'Você é um analista de marketing digital. Gere um relatório executivo de performance para o período {{periodo}}.

Métricas coletadas:
{{metricas}}

Campanhas ativas:
{{campanhas}}

Entregue:
1. Resumo executivo (3-4 linhas)
2. Análise por campanha (se fornecido)
3. Destaques positivos
4. Pontos de atenção
5. Recomendações para o próximo período',
  '[
    {"title":"Dados do período","description":"Informe as métricas coletadas.","fields":[
      {"id":"periodo","label":"Período","type":"text","required":true,"placeholder":"Ex: 01/05 a 07/05/2025"},
      {"id":"metricas","label":"Métricas principais","type":"textarea","required":true,"placeholder":"Ex: Leads: 120, CPL: R$8,50..."},
      {"id":"campanhas","label":"Campanhas ativas","type":"textarea","required":false,"placeholder":"Liste as campanhas"}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere o relatório.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 3: Planejar conteúdo semanal
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000003-0000-0000-0000-000000000003',
  'Planejar conteúdo semanal',
  'Calendário editorial com temas, formatos e CTAs para a semana.',
  'content', 'Conteúdo', '#8b5cf6', 'active', 'content_calendar', NULL,
  '[
    {"id":"semana",    "label":"Semana de referência","type":"text",    "required":true,  "placeholder":"Ex: 12 a 18 de maio"},
    {"id":"canais",    "label":"Canais",              "type":"select",  "required":true,  "options":["Instagram","Facebook","Instagram + Facebook","YouTube","TikTok","Todos"]},
    {"id":"temas",     "label":"Temas / campanha",    "type":"textarea","required":true,  "placeholder":"Ex: Lançamento do curso X, dicas de concurso..."},
    {"id":"frequencia","label":"Posts por semana",    "type":"select",  "required":true,  "options":["3","5","7","10","14"]}
  ]',
  'Você é um especialista em marketing de conteúdo. Crie um calendário editorial para a semana {{semana}}.

Canais: {{canais}}
Temas / campanha: {{temas}}
Frequência: {{frequencia}} posts por semana

Entregue um calendário com:
- Dia da semana
- Formato (feed, reels, stories, carrossel)
- Tema / título do conteúdo
- Copy resumida (2-3 linhas)
- CTA principal
- Hashtags sugeridas (se aplicável)',
  '[
    {"title":"Dados da semana","description":"Configure o planejamento semanal.","fields":[
      {"id":"semana","label":"Semana de referência","type":"text","required":true,"placeholder":"Ex: 12 a 18 de maio"},
      {"id":"canais","label":"Canais","type":"select","required":true,"options":["Instagram","Facebook","Instagram + Facebook","YouTube","TikTok","Todos"]},
      {"id":"temas","label":"Temas / campanha","type":"textarea","required":true,"placeholder":"Temas da semana..."},
      {"id":"frequencia","label":"Posts por semana","type":"select","required":true,"options":["3","5","7","10","14"]}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere o calendário.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 4: Criar briefing para designer
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000004-0000-0000-0000-000000000004',
  'Criar briefing para designer',
  'Documento completo de briefing visual para entrega à equipe criativa.',
  'content', 'Design', '#f59e0b', 'active', 'text', NULL,
  '[
    {"id":"peca",      "label":"Tipo de peça",        "type":"select",  "required":true, "options":["Post Instagram","Carrossel","Banner site","Flyer","Stories","Thumbnail YouTube"]},
    {"id":"campanha",  "label":"Campanha / contexto", "type":"text",    "required":true, "placeholder":"Ex: Lançamento PMPE 2026"},
    {"id":"objetivo",  "label":"Objetivo visual",     "type":"text",    "required":true, "placeholder":"Ex: Gerar urgência, mostrar benefício..."},
    {"id":"referencias","label":"Referências visuais","type":"textarea","required":false,"placeholder":"Links ou descrição do estilo desejado"},
    {"id":"copy",      "label":"Copy principal",      "type":"textarea","required":false,"placeholder":"Texto que deve aparecer na peça"}
  ]',
  'Você é um diretor de arte. Crie um briefing detalhado para um designer executar a seguinte peça:

Tipo: {{peca}}
Campanha: {{campanha}}
Objetivo: {{objetivo}}
Copy principal: {{copy}}
Referências: {{referencias}}

O briefing deve incluir:
1. Objetivo da peça (1-2 frases)
2. Formato e dimensões recomendadas
3. Hierarquia visual (o que deve ter mais destaque)
4. Paleta de cores sugerida (com contexto)
5. Tipografia e estilo
6. Elementos obrigatórios
7. Elementos opcionais
8. Tom e sensação esperados
9. Copy exata a ser usada (se não fornecida, sugerir)
10. Checklist de entrega',
  '[
    {"title":"Peça e objetivo","description":"Defina o que será criado.","fields":[
      {"id":"peca","label":"Tipo de peça","type":"select","required":true,"options":["Post Instagram","Carrossel","Banner site","Flyer","Stories","Thumbnail YouTube"]},
      {"id":"campanha","label":"Campanha / contexto","type":"text","required":true,"placeholder":"Ex: Lançamento PMPE 2026"},
      {"id":"objetivo","label":"Objetivo visual","type":"text","required":true,"placeholder":"Ex: Gerar urgência..."}
    ]},
    {"title":"Conteúdo e referências","description":"Forneça copy e referências visuais.","fields":[
      {"id":"references","label":"Referências visuais","type":"textarea","required":false,"placeholder":"Links ou descrição do estilo"},
      {"id":"copy","label":"Copy principal","type":"textarea","required":false,"placeholder":"Texto da peça"}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere o briefing.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 5: Criar script de WhatsApp
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000005-0000-0000-0000-000000000005',
  'Criar script de WhatsApp',
  'Sequência de mensagens de vendas para WhatsApp com fluxo de atendimento e fechamento.',
  'sales', 'Comercial', '#ef4444', 'active', 'sales_script', NULL,
  '[
    {"id":"produto",  "label":"Produto / oferta",     "type":"text",    "required":true, "placeholder":"Ex: Curso PMPE 2026"},
    {"id":"preco",    "label":"Preço / condições",    "type":"text",    "required":true, "placeholder":"Ex: R$ 297 ou 12x R$ 29,70"},
    {"id":"objecoes", "label":"Principais objeções",  "type":"textarea","required":false,"placeholder":"Ex: Muito caro, não tenho tempo..."},
    {"id":"urgencia", "label":"Gatilho de urgência",  "type":"text",    "required":false,"placeholder":"Ex: Vagas limitadas, desconto até sexta"}
  ]',
  'Você é um especialista em vendas consultivas. Crie um script de WhatsApp para vender: {{produto}}

Preço / condições: {{preco}}
Principais objeções: {{objecoes}}
Gatilho de urgência: {{urgencia}}

Entregue uma sequência de mensagens numeradas para:
1. Abertura / quebra-gelo
2. Identificação da necessidade (2-3 perguntas)
3. Apresentação do produto (benefícios, não características)
4. Prova social / depoimento sugerido
5. Oferta e preço
6. Manejo das principais objeções
7. Fechamento com urgência
8. Follow-up (caso não responda)

Use linguagem natural, emojis estratégicos e CTAs claros em cada mensagem.',
  '[
    {"title":"Produto e preço","description":"Defina o que será vendido e o valor.","fields":[
      {"id":"produto","label":"Produto / oferta","type":"text","required":true,"placeholder":"Ex: Curso PMPE 2026"},
      {"id":"preco","label":"Preço / condições","type":"text","required":true,"placeholder":"Ex: R$ 297 ou 12x"}
    ]},
    {"title":"Objeções e urgência","description":"Configure o contexto de vendas.","fields":[
      {"id":"objecoes","label":"Principais objeções","type":"textarea","required":false,"placeholder":"Ex: Muito caro, não tenho tempo..."},
      {"id":"urgencia","label":"Gatilho de urgência","type":"text","required":false,"placeholder":"Ex: Vagas limitadas"}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere o script.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 6: Analisar campanha Meta Ads
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000006-0000-0000-0000-000000000006',
  'Analisar campanha Meta Ads',
  'Diagnóstico de performance de campanhas no Facebook/Instagram Ads com recomendações.',
  'traffic', 'Tráfego Pago', '#3b82f6', 'active', 'report', NULL,
  '[
    {"id":"periodo",    "label":"Período analisado",  "type":"text",    "required":true,  "placeholder":"Ex: 01/05 a 15/05"},
    {"id":"objetivo",   "label":"Objetivo da campanha","type":"select", "required":true,  "options":["Conversão","Leads","Alcance","Tráfego","Reconhecimento"]},
    {"id":"metricas",   "label":"Métricas (cole aqui)","type":"textarea","required":true, "placeholder":"Impressões, alcance, cliques, CTR, CPC, CPL, ROAS..."},
    {"id":"orcamento",  "label":"Orçamento investido", "type":"text",   "required":false, "placeholder":"Ex: R$ 3.000"}
  ]',
  'Você é um especialista em Meta Ads. Analise a seguinte campanha:

Período: {{periodo}}
Objetivo: {{objetivo}}
Orçamento: {{orcamento}}

Métricas:
{{metricas}}

Entregue:
1. Diagnóstico geral (está performando bem ou mal e por quê)
2. Análise de cada métrica principal com benchmark de referência
3. Pontos fortes da campanha
4. Problemas identificados
5. Recomendações de otimização (pelo menos 5, priorizadas)
6. Próximos passos sugeridos',
  '[
    {"title":"Dados da campanha","description":"Informe as métricas coletadas no Meta Ads.","fields":[
      {"id":"periodo","label":"Período","type":"text","required":true,"placeholder":"Ex: 01/05 a 15/05"},
      {"id":"objetivo","label":"Objetivo","type":"select","required":true,"options":["Conversão","Leads","Alcance","Tráfego","Reconhecimento"]},
      {"id":"orcamento","label":"Orçamento investido","type":"text","required":false,"placeholder":"Ex: R$ 3.000"},
      {"id":"metricas","label":"Métricas (cole aqui)","type":"textarea","required":true,"placeholder":"Impressões, CTR, CPL..."}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere a análise.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 7: Organizar tarefas da equipe
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000007-0000-0000-0000-000000000007',
  'Organizar tarefas da equipe',
  'Priorização e delegação de tarefas com prazos e responsáveis.',
  'management', 'Gestão', '#6366f1', 'active', 'task_list', NULL,
  '[
    {"id":"tarefas",     "label":"Liste as tarefas",    "type":"textarea","required":true, "placeholder":"Descreva as tarefas pendentes..."},
    {"id":"equipe",      "label":"Membros da equipe",   "type":"textarea","required":false,"placeholder":"Ex: João (design), Maria (marketing)..."},
    {"id":"prazo",       "label":"Prazo geral",         "type":"text",   "required":false,"placeholder":"Ex: Fim desta semana"},
    {"id":"prioridade",  "label":"Critério de prioridade","type":"select","required":false,"options":["Urgência + Impacto","Deadline","Dependências","Esforço estimado"]}
  ]',
  'Você é um gestor experiente. Organize as seguintes tarefas da equipe:

Tarefas:
{{tarefas}}

Equipe disponível:
{{equipe}}

Prazo: {{prazo}}
Critério de prioridade: {{prioridade}}

Entregue:
1. Lista priorizada de tarefas (com nível: 🔴 urgente, 🟡 importante, 🟢 normal)
2. Sugestão de delegação por membro (se equipe informada)
3. Estimativa de tempo para cada tarefa
4. Dependências entre tarefas
5. Ordem de execução recomendada
6. Riscos e gargalos identificados',
  '[
    {"title":"Tarefas e equipe","description":"Liste as tarefas e a equipe disponível.","fields":[
      {"id":"tarefas","label":"Liste as tarefas","type":"textarea","required":true,"placeholder":"Descreva as tarefas..."},
      {"id":"equipe","label":"Membros da equipe","type":"textarea","required":false,"placeholder":"Ex: João (design)..."}
    ]},
    {"title":"Prazo e critérios","description":"Configure a priorização.","fields":[
      {"id":"prazo","label":"Prazo geral","type":"text","required":false,"placeholder":"Ex: Fim desta semana"},
      {"id":"prioridade","label":"Critério de prioridade","type":"select","required":false,"options":["Urgência + Impacto","Deadline","Dependências","Esforço estimado"]}
    ]},
    {"title":"Revisar e executar","description":"Confirme e organize as tarefas.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 8: Criar plano de lançamento
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000008-0000-0000-0000-000000000008',
  'Criar plano de lançamento',
  'Plano completo de lançamento de produto/curso com fases, ações e cronograma.',
  'launch', 'Lançamentos', '#f97316', 'active', 'project_plan', NULL,
  '[
    {"id":"produto",    "label":"Produto / curso",      "type":"text",    "required":true, "placeholder":"Ex: Concurso PMPE 2026"},
    {"id":"data_lan",   "label":"Data de lançamento",   "type":"text",    "required":true, "placeholder":"Ex: 10 de junho"},
    {"id":"meta",       "label":"Meta de vendas",       "type":"text",    "required":false,"placeholder":"Ex: 500 matrículas"},
    {"id":"canais",     "label":"Canais disponíveis",   "type":"textarea","required":true, "placeholder":"Ex: Instagram, WhatsApp, e-mail..."},
    {"id":"diferenciais","label":"Diferenciais do produto","type":"textarea","required":true,"placeholder":"O que faz esse produto ser especial?"}
  ]',
  'Você é um estrategista de lançamentos digitais. Crie um plano completo de lançamento:

Produto: {{produto}}
Data de lançamento: {{data_lan}}
Meta: {{meta}}
Canais: {{canais}}
Diferenciais: {{diferenciais}}

Entregue um plano estruturado com:
1. Estratégia geral do lançamento (tipo: PLF, perpétuo, live, etc.)
2. Fases do lançamento (pré-lançamento, lançamento, pós)
3. Cronograma semana a semana com ações específicas
4. Ações por canal
5. Sequência de e-mails/mensagens sugerida
6. Metas por fase (leads, abertos, vendas)
7. Checklist de preparação
8. Plano B se não atingir 50% da meta',
  '[
    {"title":"Produto e data","description":"Defina o que será lançado e quando.","fields":[
      {"id":"produto","label":"Produto / curso","type":"text","required":true,"placeholder":"Ex: Concurso PMPE 2026"},
      {"id":"data_lan","label":"Data de lançamento","type":"text","required":true,"placeholder":"Ex: 10 de junho"},
      {"id":"meta","label":"Meta de vendas","type":"text","required":false,"placeholder":"Ex: 500 matrículas"}
    ]},
    {"title":"Canais e diferenciais","description":"Configure a estratégia de divulgação.","fields":[
      {"id":"canais","label":"Canais disponíveis","type":"textarea","required":true,"placeholder":"Instagram, WhatsApp, e-mail..."},
      {"id":"diferenciais","label":"Diferenciais do produto","type":"textarea","required":true,"placeholder":"O que faz esse produto ser especial?"}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere o plano.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 9: Analisar concorrentes
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000009-0000-0000-0000-000000000009',
  'Analisar concorrentes',
  'Análise competitiva com pontos fortes, fracos e oportunidades de diferenciação.',
  'marketing', 'Pesquisa', '#0ea5e9', 'active', 'report', NULL,
  '[
    {"id":"produto",      "label":"Nosso produto",         "type":"text",    "required":true, "placeholder":"Ex: Curso preparatório PMPE"},
    {"id":"concorrentes", "label":"Concorrentes (liste)",  "type":"textarea","required":true, "placeholder":"Ex: Alfacon, Gran Cursos, Estratégia..."},
    {"id":"diferenciais", "label":"Nossos diferenciais",   "type":"textarea","required":false,"placeholder":"O que nos torna únicos?"},
    {"id":"foco",         "label":"Foco da análise",       "type":"select",  "required":false,"options":["Preço e posicionamento","Conteúdo e marketing","Produto e funcionalidades","Todos"]}
  ]',
  'Você é um analista de marketing estratégico. Faça uma análise competitiva:

Nosso produto: {{produto}}
Concorrentes: {{concorrentes}}
Nossos diferenciais: {{diferenciais}}
Foco: {{foco}}

Entregue:
1. Tabela comparativa (nosso produto vs. concorrentes) com: preço, proposta de valor, pontos fortes, pontos fracos
2. Análise de posicionamento de cada concorrente
3. Gaps de mercado identificados
4. Oportunidades de diferenciação
5. Ameaças e riscos competitivos
6. Recomendações estratégicas (pelo menos 5)',
  '[
    {"title":"Produto e concorrentes","description":"Defina o contexto competitivo.","fields":[
      {"id":"produto","label":"Nosso produto","type":"text","required":true,"placeholder":"Ex: Curso preparatório PMPE"},
      {"id":"concorrentes","label":"Concorrentes","type":"textarea","required":true,"placeholder":"Ex: Alfacon, Gran Cursos..."}
    ]},
    {"title":"Foco da análise","description":"Configure o escopo.","fields":[
      {"id":"diferenciais","label":"Nossos diferenciais","type":"textarea","required":false,"placeholder":"O que nos torna únicos?"},
      {"id":"foco","label":"Foco da análise","type":"select","required":false,"options":["Preço e posicionamento","Conteúdo e marketing","Produto e funcionalidades","Todos"]}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere a análise.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;

-- Workflow 10: Otimizar landing page
INSERT INTO workflows (id, name, description, category, area, area_color, status, output_type, company_id,
  input_schema, prompt_template, steps)
VALUES (
  'a0000010-0000-0000-0000-000000000010',
  'Otimizar landing page',
  'Análise e recomendações de otimização de conversão para landing pages.',
  'traffic', 'Conversão', '#14b8a6', 'active', 'text', NULL,
  '[
    {"id":"url",          "label":"URL da landing page","type":"text",    "required":false,"placeholder":"https://..."},
    {"id":"produto",      "label":"Produto / oferta",   "type":"text",    "required":true, "placeholder":"Ex: Curso PMPE 2026"},
    {"id":"descricao",    "label":"Descreva a página",  "type":"textarea","required":true, "placeholder":"Seções, headlines, CTA atual, o que funciona..."},
    {"id":"taxa",         "label":"Taxa de conversão atual","type":"text","required":false,"placeholder":"Ex: 2,3%"},
    {"id":"objetivo",     "label":"Objetivo de melhoria","type":"text",   "required":false,"placeholder":"Ex: Aumentar para 5%"}
  ]',
  'Você é um especialista em CRO (Conversion Rate Optimization). Analise e otimize a landing page:

Produto: {{produto}}
URL: {{url}}
Descrição da página:
{{descricao}}

Taxa de conversão atual: {{taxa}}
Objetivo: {{objetivo}}

Entregue:
1. Análise geral da estrutura atual
2. Problemas identificados (pelo menos 5) com impacto estimado
3. Recomendações de headline (3 variações para A/B test)
4. Melhorias no CTA (texto, cor, posição)
5. Elementos de prova social a adicionar
6. Estrutura de página recomendada (seção por seção)
7. Checklist de otimização priorizada
8. Estimativa de impacto nas conversões',
  '[
    {"title":"Página atual","description":"Descreva a landing page.","fields":[
      {"id":"produto","label":"Produto / oferta","type":"text","required":true,"placeholder":"Ex: Curso PMPE 2026"},
      {"id":"url","label":"URL","type":"text","required":false,"placeholder":"https://..."},
      {"id":"descricao","label":"Descreva a página","type":"textarea","required":true,"placeholder":"Seções, headlines, CTA..."}
    ]},
    {"title":"Métricas e objetivo","description":"Configure as metas de otimização.","fields":[
      {"id":"taxa","label":"Taxa de conversão atual","type":"text","required":false,"placeholder":"Ex: 2,3%"},
      {"id":"objetivo","label":"Objetivo de melhoria","type":"text","required":false,"placeholder":"Ex: Aumentar para 5%"}
    ]},
    {"title":"Revisar e executar","description":"Confirme e gere as recomendações.","fields":[]}
  ]'
)
ON CONFLICT (id) DO UPDATE SET
  input_schema    = EXCLUDED.input_schema,
  prompt_template = EXCLUDED.prompt_template,
  category        = EXCLUDED.category,
  output_type     = EXCLUDED.output_type;
