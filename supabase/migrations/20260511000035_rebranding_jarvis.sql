-- ─── Rebranding: Mota OS → Jarvis ────────────────────────────────────────────
-- Atualiza apenas os aliases padrão dos destinos Rocket.Chat seeded.
-- A condição WHERE garante que destinos customizados pelo admin não são alterados.

UPDATE rocketchat_destinations
SET    alias      = 'Jarvis',
       updated_at = now()
WHERE  id    = 'd1000001-0000-0000-0000-000000000001'
  AND  alias = 'Mota AI';

UPDATE rocketchat_destinations
SET    alias      = 'Jarvis',
       updated_at = now()
WHERE  id    = 'd1000001-0000-0000-0000-000000000002'
  AND  alias = 'Mota Reports';

UPDATE rocketchat_destinations
SET    alias      = 'Jarvis',
       updated_at = now()
WHERE  id    = 'd1000001-0000-0000-0000-000000000003'
  AND  alias = 'Mota Vigias';

UPDATE rocketchat_destinations
SET    alias      = 'Jarvis',
       updated_at = now()
WHERE  id    = 'd1000001-0000-0000-0000-000000000004'
  AND  alias = 'Mota Flows';
