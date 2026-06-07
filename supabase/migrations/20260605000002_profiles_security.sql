-- Adiciona controle de primeiro acesso e troca obrigatória de senha ao perfil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_access_at timestamptz;
