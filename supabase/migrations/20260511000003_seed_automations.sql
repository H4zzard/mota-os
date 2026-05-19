-- ═══════════════════════════════════════════════════════════════════════════════
-- Mota OS — Seed: Automações, Workflows e Fontes
-- Migration: 20260511000003
-- Popula: skills, schedules, watchers, workflows, sources
-- Depende de: 20260508000001_seed.sql (agentes já inseridos)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── Skills ──────────────────────────────────────────────────────────────────

insert into skills (id, name, description, icon, color, category, status, usage_count, prompt_template) values
  (
    'aa000001-0000-0000-0000-000000000001',
    'Criar copy de anúncio',
    'Gera variações de copies persuasivos para Meta Ads e Google Ads a partir de briefing.',
    'Megaphone', '#16a34a', 'Marketing', 'active', 34,
    'Crie {count} variações de copy para anúncio do produto "{produto}" com objetivo de {objetivo}. Empresa: {empresa}. Tom: persuasivo, urgente, focado em benefício.'
  ),
  (
    'aa000002-0000-0000-0000-000000000002',
    'Resumir relatório de tráfego',
    'Analisa dados brutos de campanhas e gera um resumo executivo com insights.',
    'BarChart3', '#3b82f6', 'Tráfego', 'active', 28,
    'Analise os seguintes dados de campanha e gere um resumo executivo com: principais métricas, pontos de atenção, recomendações de otimização e próximos passos. Dados: {dados}'
  ),
  (
    'aa000003-0000-0000-0000-000000000003',
    'Gerar pauta de reunião',
    'Cria pauta estruturada e objetiva a partir de tópicos e metas informados.',
    'ListChecks', '#06b6d4', 'Gestão', 'active', 19,
    'Crie uma pauta de reunião profissional para {tipo_reuniao} com duração de {duracao} minutos. Tópicos a cobrir: {topicos}. Participantes: {participantes}.'
  ),
  (
    'aa000004-0000-0000-0000-000000000004',
    'Criar legenda para post',
    'Gera legendas para feed e Reels com hashtags relevantes e CTA otimizado.',
    'MessageCircle', '#8b5cf6', 'Conteúdo', 'active', 41,
    'Crie uma legenda para post de {rede_social} sobre "{assunto}" para a empresa {empresa}. Tom: {tom}. Inclua emojis, CTA e até {num_hashtags} hashtags relevantes.'
  ),
  (
    'aa000005-0000-0000-0000-000000000005',
    'Análise de concorrente',
    'Estrutura a análise de posicionamento, anúncios e diferenciais de um concorrente.',
    'Search', '#a3e635', 'Pesquisa', 'active', 11,
    'Faça uma análise de concorrente para "{concorrente}" comparando com "{nossa_empresa}". Analise: posicionamento, proposta de valor, canais de marketing, pontos fortes e fracos, oportunidades para nos diferenciar.'
  ),
  (
    'aa000006-0000-0000-0000-000000000006',
    'Quebra de objeção',
    'Gera respostas para as principais objeções de venda no comercial e WhatsApp.',
    'MessageCircle', '#f59e0b', 'Comercial', 'active', 22,
    'Crie respostas para a objeção "{objecao}" no contexto de venda de "{produto}" por {empresa}. Gere {num_variacoes} variações do curta a longa, mantendo tom empático e focado em valor.'
  ),
  (
    'aa000007-0000-0000-0000-000000000007',
    'Auditar landing page',
    'Analisa a LP e sugere melhorias em copy, CTA, estrutura e elementos de conversão.',
    'Globe', '#67e8f9', 'Conversão', 'paused', 8,
    'Audite a landing page a seguir e gere um relatório com: avaliação do headline, clareza da proposta de valor, força do CTA, provas sociais, objeções não tratadas e 5 recomendações de melhoria prioritárias. URL/conteúdo: {conteudo_lp}'
  ),
  (
    'aa000008-0000-0000-0000-000000000008',
    'Planejar lançamento',
    'Cria o esquema inicial de lançamento com cronograma, mecânica e canais.',
    'Rocket', '#ec4899', 'Lançamentos', 'active', 5,
    'Planeje um lançamento digital para "{produto}" da empresa {empresa} com início em {data_inicio}. Orçamento aproximado: R$ {orcamento}. Inclua: cronograma por semanas, mecanismo de lançamento sugerido, canais, sequência de conteúdo e métricas de sucesso.'
  )
on conflict (id) do nothing;


-- ─── Schedules ───────────────────────────────────────────────────────────────
-- Agentes referenciados (IDs do seed 20260508000001):
--   a0000002 = Tráfego Pago
--   a0000003 = Conteúdo
--   a0000007 = Gestão

insert into schedules (id, name, description, agent_id, frequency, cron_expression, next_run_at, last_run_at, status, payload) values
  (
    'ab000001-0000-0000-0000-000000000001',
    'Relatório diário de tráfego',
    'Gera automaticamente o relatório consolidado das campanhas ativas todos os dias às 8h.',
    'a0000002-0000-0000-0000-000000000002',
    'daily', '0 8 * * *',
    (current_date + interval '1 day' + interval '8 hours'),
    (current_date + interval '8 hours'),
    'active',
    '{"prompt": "Gere o relatório diário de tráfego pago de todas as campanhas ativas. Inclua: CPL, CPC, ROAS, investimento total e principais variações em relação a ontem."}'::jsonb
  ),
  (
    'ab000002-0000-0000-0000-000000000002',
    'Calendário editorial semanal',
    'Gera o calendário da próxima semana toda segunda-feira às 9h para revisão.',
    'a0000003-0000-0000-0000-000000000003',
    'weekly', '0 9 * * 1',
    date_trunc('week', current_date + interval '7 days') + interval '9 hours',
    date_trunc('week', current_date) + interval '9 hours',
    'active',
    '{"prompt": "Gere o calendário editorial da próxima semana para todas as marcas do Grupo Mota. Inclua: datas, horários sugeridos, formato (feed/stories/reels), tema e sugestão de copy."}'::jsonb
  ),
  (
    'ab000003-0000-0000-0000-000000000003',
    'Consolidado mensal',
    'Relatório consolidado do mês anterior com todas as métricas, no 1º dia de cada mês às 7h.',
    'a0000002-0000-0000-0000-000000000002',
    'monthly', '0 7 1 * *',
    date_trunc('month', current_date + interval '1 month') + interval '7 hours',
    date_trunc('month', current_date) + interval '7 hours',
    'active',
    '{"prompt": "Gere o relatório mensal consolidado do mês anterior com: investimento total, leads gerados, CPL médio, ROAS, top campanhas, top criativos e recomendações para o próximo mês."}'::jsonb
  ),
  (
    'ab000004-0000-0000-0000-000000000004',
    'Pauta semanal de gestão',
    'Gera a pauta da reunião de alinhamento de marketing toda sexta-feira às 17h.',
    'a0000007-0000-0000-0000-000000000007',
    'weekly', '0 17 * * 5',
    date_trunc('week', current_date + interval '7 days') + interval '4 days' + interval '17 hours',
    date_trunc('week', current_date) + interval '4 days' + interval '17 hours',
    'paused',
    '{"prompt": "Gere a pauta para a reunião semanal de marketing. Inclua: revisão de KPIs da semana, pendências da semana anterior, prioridades da próxima semana e itens de decisão necessários."}'::jsonb
  )
on conflict (id) do nothing;


-- ─── Watchers ────────────────────────────────────────────────────────────────

insert into watchers (id, name, description, trigger_type, trigger_config, action_type, action_config, status, triggers_count, last_trigger_at) values
  (
    'ac000001-0000-0000-0000-000000000001',
    'CPL acima do limite',
    'Alerta quando o CPL de qualquer campanha ativa ultrapassar R$6,00 por lead.',
    'threshold',
    '{"metric": "cpl", "operator": ">", "value": 6.00, "unit": "BRL", "source": "meta_ads"}'::jsonb,
    'notify',
    '{"channel": "rocketchat", "message": "⚠️ CPL acima do limite detectado! Verificar campanhas no Meta Ads."}'::jsonb,
    'active', 3,
    now() - interval '2 days'
  ),
  (
    'ac000002-0000-0000-0000-000000000002',
    'Nova mensagem sem resposta',
    'Monitora o RocketChat e alerta quando uma conversa ficou mais de 30 min sem resposta.',
    'absence',
    '{"channel": "rocketchat", "absence_minutes": 30, "during_hours": {"start": "08:00", "end": "18:00"}}'::jsonb,
    'notify',
    '{"channel": "rocketchat", "message": "⏰ Conversa sem resposta há mais de 30 minutos. Verificar atendimento."}'::jsonb,
    'active', 12,
    now() - interval '4 hours'
  ),
  (
    'ac000003-0000-0000-0000-000000000003',
    'Orçamento diário esgotado',
    'Detecta campanhas que consumiram 100% do orçamento diário antes das 18h.',
    'threshold',
    '{"metric": "budget_spent_percent", "operator": ">=", "value": 100, "before_time": "18:00", "source": "meta_ads"}'::jsonb,
    'notify',
    '{"channel": "rocketchat", "message": "🚨 Orçamento diário esgotado antes das 18h. Verificar e ajustar campanha.", "also_pause": true}'::jsonb,
    'active', 1,
    now() - interval '3 days'
  ),
  (
    'ac000004-0000-0000-0000-000000000004',
    'Engajamento abaixo da média',
    'Monitora posts publicados e alerta quando engajamento está 40% abaixo da média histórica.',
    'threshold',
    '{"metric": "engagement_rate", "operator": "<", "value": 0.6, "comparison": "historical_average", "source": "instagram"}'::jsonb,
    'notify',
    '{"channel": "rocketchat", "message": "📉 Post com engajamento abaixo da média. Considerar impulsionar.", "suggest_boost": true}'::jsonb,
    'paused', 0,
    null
  )
on conflict (id) do nothing;


-- ─── Workflows ───────────────────────────────────────────────────────────────

insert into workflows (id, name, description, area, area_color, icon, status, estimated_minutes, steps_count, runs, steps) values
  (
    'ad000001-0000-0000-0000-000000000001',
    'Criar campanha de leads',
    'Estrutura completa de campanha: objetivo, público, criativos, landing page e configurações de anúncio.',
    'Marketing', '#16a34a', 'Megaphone', 'active', 8, 4, 14,
    '[
      {"title":"Produto e objetivo","description":"Defina a empresa, produto e o objetivo principal da campanha.","fields":[
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["CPPEM Concursos","Unicive","Colégio CPPEM","Everton Mota"]},
        {"id":"produto","label":"Produto / Oferta","type":"text","required":true,"placeholder":"Ex: Intensivão PMPE 2026"},
        {"id":"objetivo","label":"Objetivo principal","type":"select","required":true,"options":["Geração de leads (WhatsApp)","Vendas diretas","Reconhecimento de marca","Tráfego para site"]},
        {"id":"periodo","label":"Período da campanha","type":"text","placeholder":"Ex: 4 semanas"}
      ]},
      {"title":"Público-alvo","description":"Descreva o público que deve ser impactado pela campanha.","fields":[
        {"id":"publico_desc","label":"Descreva o público","type":"textarea","required":true,"placeholder":"Ex: Homens e mulheres 20-35 anos, interessados em concursos públicos, PE e nordeste"},
        {"id":"publico_faixa","label":"Faixa etária","type":"text","placeholder":"Ex: 22-40"},
        {"id":"publico_regiao","label":"Região","type":"text","placeholder":"Ex: Recife, PE e Grande Recife"},
        {"id":"orcamento","label":"Orçamento mensal (R$)","type":"number","required":true,"placeholder":"Ex: 3000"}
      ]},
      {"title":"Criativos","description":"Defina os formatos e direcionamentos criativos da campanha.","fields":[
        {"id":"formatos","label":"Formatos","type":"multiselect","required":true,"options":["Feed estático","Stories","Reels/Vídeo","Carrossel","Google Search","Google Display"]},
        {"id":"beneficio_principal","label":"Principal benefício / proposta de valor","type":"textarea","required":true,"placeholder":"Ex: Aprovação rápida com metodologia focada em questões"},
        {"id":"tom","label":"Tom de comunicação","type":"select","options":["Urgente e direto","Motivacional","Institucional","Informativo"]},
        {"id":"cta","label":"CTA principal","type":"text","placeholder":"Ex: Garante sua vaga agora!"}
      ]},
      {"title":"Configurações finais","description":"Informações complementares para a estrutura da campanha.","fields":[
        {"id":"landing_page","label":"URL da landing page","type":"text","placeholder":"https://..."},
        {"id":"whatsapp","label":"Número de WhatsApp (com DDD)","type":"text","placeholder":"Ex: 81999999999"},
        {"id":"observacoes","label":"Observações adicionais","type":"textarea","placeholder":"Informações extras que o agente deve considerar..."}
      ]}
    ]'::jsonb
  ),
  (
    'ad000002-0000-0000-0000-000000000002',
    'Gerar relatório de tráfego pago',
    'Consolida dados de Meta Ads, Google Ads e GA4 em um relatório executivo com insights e recomendações.',
    'Tráfego', '#3b82f6', 'BarChart3', 'active', 5, 3, 22,
    '[
      {"title":"Período e plataformas","description":"Defina o período e as plataformas a incluir no relatório.","fields":[
        {"id":"periodo","label":"Período do relatório","type":"select","required":true,"options":["Hoje","Últimos 7 dias","Últimos 14 dias","Mês atual","Mês anterior"]},
        {"id":"plataformas","label":"Plataformas","type":"multiselect","required":true,"options":["Meta Ads","Google Ads","Google Analytics 4","Reportei"]},
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["Todas","CPPEM Concursos","Unicive","Colégio CPPEM","Everton Mota"]}
      ]},
      {"title":"Métricas prioritárias","description":"Quais métricas são mais importantes para este relatório?","fields":[
        {"id":"metricas","label":"Métricas prioritárias","type":"multiselect","options":["CPL","CPC","CTR","ROAS","Investimento","Impressões","Leads","Vendas","Taxa de conversão"]},
        {"id":"meta_cpl","label":"Meta de CPL (R$)","type":"number","placeholder":"Ex: 5.00"},
        {"id":"meta_roas","label":"Meta de ROAS","type":"number","placeholder":"Ex: 3.0"}
      ]},
      {"title":"Formato e destinatário","description":"Como e para quem o relatório será entregue?","fields":[
        {"id":"formato","label":"Formato","type":"select","options":["Resumo executivo","Relatório detalhado","Apresentação de slides"]},
        {"id":"destinatario","label":"Destinatário principal","type":"text","placeholder":"Ex: Equipe de marketing, Diretoria"},
        {"id":"observacoes","label":"Destaques ou pontos de atenção","type":"textarea","placeholder":"Ex: Campanha PMPE teve queda no CTR esta semana"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000003-0000-0000-0000-000000000003',
    'Criar script de WhatsApp',
    'Gera scripts de abordagem, follow-up e quebra de objeções para a equipe comercial no WhatsApp.',
    'Comercial', '#f97316', 'MessageCircle', 'active', 4, 2, 9,
    '[
      {"title":"Contexto do script","description":"Defina o produto, perfil do lead e o objetivo do script.","fields":[
        {"id":"produto","label":"Produto / Curso","type":"text","required":true,"placeholder":"Ex: Intensivão PMPE 2026"},
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["CPPEM Concursos","Unicive","Colégio CPPEM","Everton Mota"]},
        {"id":"tipo_script","label":"Tipo de script","type":"select","required":true,"options":["Primeiro contato (lead novo)","Follow-up D+1","Follow-up D+3","Follow-up D+7","Quebra de objeção","Recuperação de carrinho"]},
        {"id":"perfil_lead","label":"Perfil do lead","type":"text","placeholder":"Ex: Servidor público, interessado no concurso PMPE"}
      ]},
      {"title":"Tom e personalização","description":"Ajuste o tom e os elementos de personalização.","fields":[
        {"id":"tom","label":"Tom da mensagem","type":"select","options":["Próximo e informal","Profissional e direto","Motivacional","Urgência leve"]},
        {"id":"objecoes","label":"Objeções mais comuns (opcional)","type":"textarea","placeholder":"Ex: Está caro, preciso pensar, já tenho outro curso"},
        {"id":"preco","label":"Preço / condições (opcional)","type":"text","placeholder":"Ex: 12x R$ 49,90 ou R$ 497 à vista"},
        {"id":"urgencia","label":"Gatilho de urgência (opcional)","type":"text","placeholder":"Ex: Turma fecha domingo, vagas limitadas"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000004-0000-0000-0000-000000000004',
    'Planejar calendário editorial',
    'Gera o calendário editorial mensal com temas, formatos, datas e sugestões de copy para todas as redes.',
    'Conteúdo', '#8b5cf6', 'Calendar', 'active', 10, 3, 7,
    '[
      {"title":"Configuração do mês","description":"Defina o período e os canais do calendário.","fields":[
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["CPPEM Concursos","Unicive","Colégio CPPEM","Everton Mota","Grupo Mota"]},
        {"id":"mes","label":"Mês / período","type":"text","required":true,"placeholder":"Ex: Junho 2026"},
        {"id":"canais","label":"Canais a cobrir","type":"multiselect","required":true,"options":["Instagram Feed","Instagram Stories","Instagram Reels","Facebook","YouTube Shorts","TikTok","LinkedIn"]},
        {"id":"frequencia","label":"Posts por semana","type":"select","options":["2-3 posts","4-5 posts","7 posts (diário)","Personalizado"]}
      ]},
      {"title":"Temas e contexto","description":"Informe os temas prioritários e eventos do mês.","fields":[
        {"id":"temas","label":"Temas prioritários","type":"textarea","required":true,"placeholder":"Ex: Abertura de matrículas, resultado concurso PMPE, dicas de estudo"},
        {"id":"eventos","label":"Datas importantes do mês","type":"textarea","placeholder":"Ex: 12/06 - Dia dos Namorados, 15/06 - Aniversário da escola"},
        {"id":"produtos_foco","label":"Produtos em destaque","type":"text","placeholder":"Ex: Intensivão PMPE, Curso EAD Pedagogia"}
      ]},
      {"title":"Estilo e referências","description":"Defina o estilo visual e referências de conteúdo.","fields":[
        {"id":"tom","label":"Tom de voz","type":"select","options":["Motivacional e inspirador","Educativo e informativo","Próximo e humano","Autoridade e técnico"]},
        {"id":"referencias","label":"Referências ou exemplos","type":"textarea","placeholder":"Descreva posts que funcionaram bem ou o estilo desejado"},
        {"id":"restricoes","label":"O que NÃO fazer / evitar","type":"textarea","placeholder":"Ex: Não mencionar concorrentes, evitar temas políticos"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000005-0000-0000-0000-000000000005',
    'Estruturar lançamento digital',
    'Cria o cronograma completo de lançamento com PLF, sequência de e-mails, webinar e redes sociais.',
    'Lançamentos', '#ec4899', 'Rocket', 'active', 15, 5, 3,
    '[
      {"title":"Produto e objetivo","description":"Defina o produto e o modelo de lançamento.","fields":[
        {"id":"produto","label":"Nome do produto / curso","type":"text","required":true,"placeholder":"Ex: Intensivão PMPE 2026"},
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["CPPEM Concursos","Unicive","Everton Mota"]},
        {"id":"modelo","label":"Modelo de lançamento","type":"select","required":true,"options":["PLF (Product Launch Formula)","Lançamento Relâmpago","Perpétuo com webinar","Pré-venda"]},
        {"id":"meta_leads","label":"Meta de leads","type":"number","placeholder":"Ex: 1000"},
        {"id":"meta_vendas","label":"Meta de vendas","type":"number","placeholder":"Ex: 150"}
      ]},
      {"title":"Datas e cronograma","description":"Defina as datas-chave do lançamento.","fields":[
        {"id":"data_abertura_lista","label":"Abertura de lista (opt-in)","type":"text","required":true,"placeholder":"Ex: 01/06/2026"},
        {"id":"data_pre_lancamento","label":"Início do pré-lançamento","type":"text","placeholder":"Ex: 10/06/2026"},
        {"id":"data_abertura_carrinho","label":"Abertura do carrinho","type":"text","required":true,"placeholder":"Ex: 17/06/2026"},
        {"id":"data_fechamento","label":"Fechamento do carrinho","type":"text","required":true,"placeholder":"Ex: 20/06/2026"},
        {"id":"orcamento_trafego","label":"Orçamento de tráfego (R$)","type":"number","placeholder":"Ex: 5000"}
      ]},
      {"title":"Mecânica e canais","description":"Configure a mecânica de vendas e canais de comunicação.","fields":[
        {"id":"canais_captacao","label":"Canais de captação","type":"multiselect","options":["Meta Ads","Google Ads","Instagram orgânico","WhatsApp","E-mail","YouTube"]},
        {"id":"canais_nutricao","label":"Canais de nutrição","type":"multiselect","options":["E-mail","WhatsApp","Instagram Stories","YouTube","Webinar ao vivo"]},
        {"id":"mecanismo","label":"Mecanismo de conversão principal","type":"select","options":["Webinar ao vivo","VSL (Video Sales Letter)","Página de vendas direta","WhatsApp com consultor","Combo webinar + WhatsApp"]}
      ]},
      {"title":"Oferta e preço","description":"Defina os detalhes da oferta.","fields":[
        {"id":"preco_normal","label":"Preço normal (R$)","type":"number","placeholder":"Ex: 997"},
        {"id":"preco_lancamento","label":"Preço de lançamento (R$)","type":"number","placeholder":"Ex: 497"},
        {"id":"parcelamento","label":"Parcelamento máximo","type":"text","placeholder":"Ex: 12x sem juros"},
        {"id":"bonus","label":"Bônus inclusos","type":"textarea","placeholder":"Ex: Mentoria em grupo, Simulado PMPE, Apostila digital"}
      ]},
      {"title":"Observações finais","description":"Informações adicionais para o agente considerar.","fields":[
        {"id":"diferenciais","label":"Principais diferenciais do produto","type":"textarea","placeholder":"Ex: Metodologia própria, professores aprovados, taxa de aprovação de 40%"},
        {"id":"objecoes","label":"Objeções mais comuns","type":"textarea","placeholder":"Ex: Está caro, não tenho tempo, já tentei outros cursos"},
        {"id":"observacoes","label":"Observações adicionais","type":"textarea"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000006-0000-0000-0000-000000000006',
    'Analisar desempenho de post',
    'Avalia o desempenho de um post publicado e sugere otimizações para os próximos conteúdos.',
    'Conteúdo', '#8b5cf6', 'TrendingUp', 'active', 3, 2, 18,
    '[
      {"title":"Dados do post","description":"Informe os dados de desempenho do post para análise.","fields":[
        {"id":"rede_social","label":"Rede social","type":"select","required":true,"options":["Instagram","Facebook","TikTok","YouTube","LinkedIn"]},
        {"id":"tipo_post","label":"Tipo de post","type":"select","required":true,"options":["Feed estático","Carrossel","Reels","Stories","Vídeo longo"]},
        {"id":"tema","label":"Tema / assunto do post","type":"text","required":true,"placeholder":"Ex: Dica de estudo para concursos"},
        {"id":"alcance","label":"Alcance","type":"number","placeholder":"Ex: 12500"},
        {"id":"impressoes","label":"Impressões","type":"number","placeholder":"Ex: 18000"},
        {"id":"engajamento","label":"Total de engajamentos (curtidas + comentários + compartilhamentos)","type":"number","placeholder":"Ex: 890"}
      ]},
      {"title":"Contexto e objetivos","description":"Forneça o contexto para uma análise mais precisa.","fields":[
        {"id":"objetivo_post","label":"Objetivo do post","type":"select","options":["Engajamento","Alcance","Leads","Venda direta","Autoridade"]},
        {"id":"media_historica","label":"Engajamento médio histórico da conta (%)","type":"number","placeholder":"Ex: 3.5"},
        {"id":"copy_post","label":"Copy/legenda do post (opcional)","type":"textarea","placeholder":"Cole aqui a legenda do post para análise mais precisa"},
        {"id":"observacoes","label":"O que você quer entender com esta análise?","type":"textarea","placeholder":"Ex: Por que este post performou abaixo do esperado?"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000007-0000-0000-0000-000000000007',
    'Criar FAQ de atendimento',
    'Gera respostas padronizadas para as perguntas mais frequentes do atendimento ao cliente.',
    'Atendimento', '#f43f5e', 'HelpCircle', 'active', 6, 2, 4,
    '[
      {"title":"Produto e contexto","description":"Defina o produto e o contexto do atendimento.","fields":[
        {"id":"produto","label":"Produto / Curso","type":"text","required":true,"placeholder":"Ex: Intensivão PMPE 2026"},
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["CPPEM Concursos","Unicive","Colégio CPPEM","Everton Mota"]},
        {"id":"canal","label":"Canal de atendimento","type":"select","options":["WhatsApp","E-mail","RocketChat","Instagram DM","Todos"]},
        {"id":"perguntas_comuns","label":"Liste as perguntas mais frequentes","type":"textarea","required":true,"placeholder":"Ex:\n1. Qual o preço?\n2. Tem parcelamento?\n3. Quando começa?\n4. Tem certificado?"}
      ]},
      {"title":"Informações do produto","description":"Forneça as informações para que as respostas sejam precisas.","fields":[
        {"id":"preco","label":"Preço e condições","type":"text","placeholder":"Ex: R$ 497 à vista ou 12x de R$ 49,90"},
        {"id":"inicio","label":"Data de início","type":"text","placeholder":"Ex: 10 de junho de 2026"},
        {"id":"duracao","label":"Duração do curso","type":"text","placeholder":"Ex: 3 meses"},
        {"id":"diferenciais","label":"Principais diferenciais","type":"textarea","placeholder":"Ex: Material atualizado, professores aprovados, grupo de dúvidas"},
        {"id":"garantia","label":"Garantia / política de reembolso","type":"text","placeholder":"Ex: 7 dias de garantia incondicional"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000008-0000-0000-0000-000000000008',
    'Elaborar ata de reunião',
    'Estrutura uma ata profissional a partir das notas e pontos discutidos na reunião.',
    'Gestão', '#06b6d4', 'FileText', 'active', 4, 2, 11,
    '[
      {"title":"Dados da reunião","description":"Informações básicas sobre a reunião realizada.","fields":[
        {"id":"tipo_reuniao","label":"Tipo de reunião","type":"select","required":true,"options":["Alinhamento de marketing","Reunião de resultados","Planejamento estratégico","Reunião de equipe","Reunião com cliente","Outro"]},
        {"id":"data","label":"Data e horário","type":"text","required":true,"placeholder":"Ex: 11/05/2026 às 14h"},
        {"id":"participantes","label":"Participantes","type":"text","required":true,"placeholder":"Ex: Alexandre, Itallo Mota, Gestor de Tráfego"},
        {"id":"duracao","label":"Duração","type":"text","placeholder":"Ex: 1h30min"}
      ]},
      {"title":"Conteúdo da reunião","description":"Informe os pontos discutidos para gerar a ata.","fields":[
        {"id":"pauta","label":"Pauta / pontos discutidos","type":"textarea","required":true,"placeholder":"Ex:\n- Resultado das campanhas PMPE\n- Revisão do calendário editorial\n- Definição de metas para junho"},
        {"id":"decisoes","label":"Decisões tomadas","type":"textarea","placeholder":"Ex:\n- Aumentar orçamento Meta Ads para R$3.000\n- Pausar campanha Google Display"},
        {"id":"acoes","label":"Ações e responsáveis","type":"textarea","placeholder":"Ex:\n- Alexandre: criar novos criativos até 13/05\n- GT: otimizar campanhas até quinta"},
        {"id":"proximos_passos","label":"Próximos passos / data da próxima reunião","type":"text","placeholder":"Ex: Próxima reunião: 18/05 às 14h"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000009-0000-0000-0000-000000000009',
    'Criar estratégia de conteúdo',
    'Desenvolve uma estratégia completa de conteúdo para 30 dias com objetivos, pilares e KPIs.',
    'Conteúdo', '#8b5cf6', 'BookOpen', 'active', 12, 4, 2,
    '[
      {"title":"Contexto e objetivos","description":"Defina a empresa, canais e objetivos estratégicos.","fields":[
        {"id":"empresa","label":"Empresa","type":"select","required":true,"options":["CPPEM Concursos","Unicive","Colégio CPPEM","Everton Mota","Grupo Mota"]},
        {"id":"canais","label":"Canais principais","type":"multiselect","required":true,"options":["Instagram","Facebook","YouTube","TikTok","LinkedIn","Blog","E-mail"]},
        {"id":"objetivo_principal","label":"Objetivo principal","type":"select","required":true,"options":["Aumentar reconhecimento de marca","Gerar leads qualificados","Nutrir base de leads","Aumentar engajamento","Vender produto específico"]},
        {"id":"periodo","label":"Período da estratégia","type":"text","placeholder":"Ex: Junho 2026"}
      ]},
      {"title":"Público e posicionamento","description":"Defina o público-alvo e o posicionamento desejado.","fields":[
        {"id":"publico","label":"Público-alvo principal","type":"textarea","required":true,"placeholder":"Ex: Policiais militares e civis de PE, 25-40 anos, interessados em progressão na carreira"},
        {"id":"posicionamento","label":"Posicionamento desejado","type":"text","placeholder":"Ex: Referência em aprovação para concursos policiais no Nordeste"},
        {"id":"tom_voz","label":"Tom de voz","type":"select","options":["Autoridade e técnico","Motivacional","Próximo e humano","Educativo"]}
      ]},
      {"title":"Pilares de conteúdo","description":"Quais são os temas-chave desta estratégia?","fields":[
        {"id":"pilares","label":"Pilares de conteúdo (3-5)","type":"textarea","required":true,"placeholder":"Ex:\n1. Dicas de estudo e metodologia\n2. Histórias de alunos aprovados\n3. Informações sobre concursos abertos\n4. Bastidores da escola"},
        {"id":"restricoes","label":"O que NÃO abordar","type":"textarea","placeholder":"Ex: Política, outros cursos concorrentes, temas polêmicos"}
      ]},
      {"title":"KPIs e referências","description":"Defina as métricas de sucesso e referências de conteúdo.","fields":[
        {"id":"kpis","label":"KPIs para 30 dias","type":"textarea","placeholder":"Ex:\n- Seguidores: +500\n- Engajamento médio: 4%\n- Leads via stories: 200"},
        {"id":"referencias","label":"Perfis de referência","type":"text","placeholder":"Ex: @profile1, @profile2 — canais que você admira"},
        {"id":"orcamento_impulsionamento","label":"Orçamento para impulsionamento (R$)","type":"number","placeholder":"Ex: 800"}
      ]}
    ]'::jsonb
  ),
  (
    'ad000010-0000-0000-0000-000000000010',
    'Otimizar landing page',
    'Analisa e reescreve os elementos-chave de uma landing page para maximizar a conversão.',
    'Conversão', '#67e8f9', 'Globe', 'paused', 7, 3, 6,
    '[
      {"title":"Dados da landing page","description":"Forneça as informações sobre a LP atual.","fields":[
        {"id":"produto","label":"Produto / Oferta","type":"text","required":true,"placeholder":"Ex: Intensivão PMPE 2026"},
        {"id":"url_lp","label":"URL da landing page","type":"text","placeholder":"https://..."},
        {"id":"objetivo","label":"Objetivo da LP","type":"select","required":true,"options":["Captar lead (nome + WhatsApp)","Venda direta","Inscrição em webinar","Download de material"]},
        {"id":"taxa_conversao_atual","label":"Taxa de conversão atual (%)","type":"number","placeholder":"Ex: 3.2"}
      ]},
      {"title":"Conteúdo atual","description":"Cole os elementos principais da LP para análise.","fields":[
        {"id":"headline_atual","label":"Headline atual","type":"text","required":true,"placeholder":"Ex: Seja aprovado no PMPE 2026"},
        {"id":"copy_atual","label":"Copy principal (resumo)","type":"textarea","placeholder":"Cole os principais parágrafos da LP"},
        {"id":"cta_atual","label":"CTA atual","type":"text","placeholder":"Ex: Quero me inscrever agora"},
        {"id":"o_que_nao_funciona","label":"O que você acha que não está funcionando?","type":"textarea","placeholder":"Ex: O botão não converte, a oferta não está clara"}
      ]},
      {"title":"Público e contexto de tráfego","description":"Contexto do tráfego para calibrar a linguagem.","fields":[
        {"id":"fonte_trafego","label":"Fonte de tráfego principal","type":"select","options":["Meta Ads (frio)","Meta Ads (remarketing)","Google Search","Google Display","Orgânico/SEO","WhatsApp/Lista própria"]},
        {"id":"temperatura_lead","label":"Temperatura do lead","type":"select","options":["Frio (nunca ouviu falar)","Morno (já conhece o produto)","Quente (pronto para comprar)"]},
        {"id":"meta_taxa","label":"Meta de taxa de conversão (%)","type":"number","placeholder":"Ex: 5.0"}
      ]}
    ]'::jsonb
  )
on conflict (id) do nothing;


-- ─── Sources (Fontes de Conhecimento) ────────────────────────────────────────

insert into sources (id, name, description, type, company_id, connected, config, file_count, size_bytes, tags, icon) values
  (
    'ae000001-0000-0000-0000-000000000001',
    'Base de Conhecimento CPPEM',
    'Documentos internos: editais, cronogramas, apostilas e materiais de marketing do CPPEM Concursos.',
    'knowledge', 'cppem', true,
    '{"path": "gs://mota-os-knowledge/cppem/"}'::jsonb,
    47, 128400000, ARRAY['Editais','Marketing','Material didático'], '📚'
  ),
  (
    'ae000002-0000-0000-0000-000000000002',
    'Pastas Google Drive — Marketing',
    'Pasta compartilhada com criativos, planilhas de campanhas e relatórios de tráfego.',
    'drive', 'grupo', true,
    '{"folder_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"}'::jsonb,
    112, 856000000, ARRAY['Drive','Criativos','Relatórios'], '📁'
  ),
  (
    'ae000003-0000-0000-0000-000000000003',
    'Google Analytics 4 — CPPEM',
    'Dados de tráfego, sessões, conversões e comportamento do site do CPPEM Concursos.',
    'api', 'cppem', true,
    '{"property_id": "GA4-XXXXX", "measurement_id": "G-XXXXX"}'::jsonb,
    0, 0, ARRAY['GA4','Analytics','Conversão'], '📊'
  ),
  (
    'ae000004-0000-0000-0000-000000000004',
    'Meta Ads — Grupo Mota',
    'Dados de campanhas, conjuntos de anúncios, criativos e métricas do Business Manager.',
    'api', 'grupo', true,
    '{"account_id": "act_XXXXX", "business_id": "XXXXX"}'::jsonb,
    0, 0, ARRAY['Meta Ads','Tráfego pago','Leads'], '📱'
  ),
  (
    'ae000005-0000-0000-0000-000000000005',
    'Reportei — Dashboards',
    'Relatórios automatizados de tráfego, SEO e redes sociais via Reportei.',
    'reports', 'grupo', false,
    '{"api_key": ""}'::jsonb,
    0, 0, ARRAY['Reportei','Relatórios','SEO'], '📈'
  ),
  (
    'ae000006-0000-0000-0000-000000000006',
    'Base de Conhecimento Unicive',
    'Materiais da Unicive: catálogo de cursos EAD, públicos-alvo, diferenciais e histórico de campanhas.',
    'knowledge', 'unicive', true,
    '{"path": "gs://mota-os-knowledge/unicive/"}'::jsonb,
    28, 64200000, ARRAY['Unicive','EAD','Cursos'], '📚'
  ),
  (
    'ae000007-0000-0000-0000-000000000007',
    'Google Ads — CPPEM e Unicive',
    'Campanhas de pesquisa e display para captação de leads no Google.',
    'api', 'cppem', false,
    '{"customer_id": ""}'::jsonb,
    0, 0, ARRAY['Google Ads','Search','Display'], '🔍'
  ),
  (
    'ae000008-0000-0000-0000-000000000008',
    'Documentos Colégio CPPEM',
    'Material institucional, regulamentos, calendário letivo e comunicados do Colégio CPPEM.',
    'documents', 'colegio', true,
    '{"path": "gs://mota-os-knowledge/colegio/"}'::jsonb,
    23, 42100000, ARRAY['Colégio','Institucional','Documentos'], '🏫'
  ),
  (
    'ae000009-0000-0000-0000-000000000009',
    'RocketChat — Atendimento',
    'Histórico de atendimentos, dúvidas frequentes e conversas de suporte via RocketChat.',
    'api', 'grupo', true,
    '{"server_url": "https://chat.cppem.com.br", "channel": "atendimento"}'::jsonb,
    0, 0, ARRAY['RocketChat','Atendimento','FAQ'], '💬'
  ),
  (
    'ae000010-0000-0000-0000-000000000010',
    'Estratégias e Playbooks',
    'Documentos estratégicos: playbooks de lançamento, scripts de vendas e SOPs de marketing.',
    'knowledge', 'grupo', true,
    '{"path": "gs://mota-os-knowledge/playbooks/"}'::jsonb,
    18, 32500000, ARRAY['Playbook','Estratégia','SOP'], '📋'
  )
on conflict (id) do nothing;
