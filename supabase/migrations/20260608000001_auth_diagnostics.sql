-- ─── Migração de diagnóstico e hardening de auth ──────────────────────────────
-- Execute no Supabase SQL Editor para identificar inconsistências.
-- Esta migração é idempotente e não altera dados.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. DIAGNÓSTICO — Usuários em auth.users sem profile correspondente
--    (deve retornar zero linhas; se retornar, o trigger handle_new_user falhou)
-- ═══════════════════════════════════════════════════════════════════════════════

-- SELECT au.id, au.email, au.created_at
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON p.id = au.id
-- WHERE p.id IS NULL
-- ORDER BY au.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. DIAGNÓSTICO — Profiles sem vínculo em company_members
--    (usuários sem empresa vinculada — vão receber fallback "cppem")
-- ═══════════════════════════════════════════════════════════════════════════════

-- SELECT p.id, p.email, p.name, p.role, p.default_company_id
-- FROM profiles p
-- LEFT JOIN company_members cm ON cm.user_id = p.id AND cm.status = 'active'
-- WHERE cm.id IS NULL
-- ORDER BY p.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. DIAGNÓSTICO — Usuários admin no profiles mas sem vínculo em empresa alguma
-- ═══════════════════════════════════════════════════════════════════════════════

-- SELECT p.id, p.email, p.name, p.role
-- FROM profiles p
-- LEFT JOIN company_members cm ON cm.user_id = p.id AND cm.status = 'active'
-- WHERE p.role = 'admin' AND cm.id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. DIAGNÓSTICO — Roles e vínculos de todos os usuários (visão completa)
-- ═══════════════════════════════════════════════════════════════════════════════

-- SELECT
--   p.email,
--   p.name,
--   p.role            AS global_role,
--   p.default_company_id,
--   p.must_change_password,
--   p.first_access_at,
--   array_agg(cm.company_id ORDER BY cm.company_id) FILTER (WHERE cm.id IS NOT NULL) AS companies,
--   array_agg(cm.role        ORDER BY cm.company_id) FILTER (WHERE cm.id IS NOT NULL) AS company_roles
-- FROM profiles p
-- LEFT JOIN company_members cm ON cm.user_id = p.id AND cm.status = 'active'
-- GROUP BY p.id, p.email, p.name, p.role, p.default_company_id, p.must_change_password, p.first_access_at
-- ORDER BY p.email;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FIX — Garantir que o trigger handle_new_user existe e está correto
--    (re-cria idempotentemente para garantir versão correta após deploys)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
      'Usuário'
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email      = EXCLUDED.email,
      name       = CASE
                     WHEN profiles.name = '' OR profiles.name = SPLIT_PART(profiles.email, '@', 1)
                     THEN COALESCE(NEW.raw_user_meta_data->>'name', EXCLUDED.name)
                     ELSE profiles.name
                   END,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FIX — Preencher profiles faltantes para usuários que já existem em auth.users
--    (safety net para inconsistências históricas)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.profiles (id, email, name)
SELECT
  au.id,
  COALESCE(au.email, ''),
  COALESCE(
    au.raw_user_meta_data->>'name',
    SPLIT_PART(COALESCE(au.email, ''), '@', 1),
    'Usuário'
  )
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ÍNDICES — Garantir lookup rápido de is_global_admin() nas policies RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS profiles_id_role_idx
  ON public.profiles (id, role);

CREATE INDEX IF NOT EXISTS company_members_user_status_idx
  ON public.company_members (user_id, status);
