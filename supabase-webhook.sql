-- =============================================
-- SUPABASE WEBHOOK → GITHUB ACTIONS
-- =============================================
-- Ejecutar en: Database → SQL Editor (Supabase Dashboard)
--
-- ANTES: Generar un GitHub PAT con permiso "repo" (public_repo alcanza)
-- y reemplazar TU_GITHUB_PAT_AQUI abajo
-- =============================================

-- 1. Habilitar pg_net
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. Función que dispara repository_dispatch en GitHub
CREATE OR REPLACE FUNCTION notify_github_build()
RETURNS TRIGGER AS $$
DECLARE
  github_pat TEXT := 'TU_GITHUB_PAT_AQUI';
BEGIN
  PERFORM net.http_post(
    url := 'https://api.github.com/repos/MozzVader/DMM2/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || github_pat,
      'Accept', 'application/vnd.github.v3+json',
      'User-Agent', 'Supabase-Webhook',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'event_type', 'content-update'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: se dispara al INSERT, UPDATE o DELETE en posts
DROP TRIGGER IF EXISTS on_post_content_change ON posts;

CREATE TRIGGER on_post_content_change
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_github_build();
