-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES - APPLICATION PHOTOS & IMPRESSION D'ÉVÉNEMENTS
-- ============================================================================
-- Cible : PostgreSQL 12+
-- Créé pour Supabase (avec support des fonctionnalités Realtime)
-- ============================================================================

-- 1. EXTENSIONS REQUISES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- 2. TABLE: ÉVÉNEMENTS (EVENTS)
-- ============================================================================
-- Stocke la configuration de chaque événement client
-- ============================================================================
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identifiant unique et lisible pour l'URL publique
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Informations de base
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    
    -- Dates
    event_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Configuration visuelle
    background_color VARCHAR(7) DEFAULT '#FFFFFF',
    accent_color VARCHAR(7) DEFAULT '#000000',
    logo_url TEXT,
    
    -- Configuration d'impression
    print_enabled BOOLEAN DEFAULT TRUE,
    print_mode VARCHAR(50) DEFAULT 'free', -- 'free' ou 'pay_per_print'
    max_prints_per_guest INTEGER DEFAULT 5,
    max_total_prints INTEGER DEFAULT 200,
    allow_printing_others_photos BOOLEAN DEFAULT TRUE,
    price_per_print_cents INTEGER DEFAULT 0, -- Prix en centimes (ex: 199 = 1,99€)
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Template graphique
    template_image_url TEXT,
    template_width INTEGER DEFAULT 1000,
    template_height INTEGER DEFAULT 1500,
    template_format VARCHAR(20) DEFAULT 'portrait', -- 'portrait' ou 'landscape'
    apply_template_by_default BOOLEAN DEFAULT FALSE,
    
    -- Tokens de sécurité
    api_key UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    
    -- Statut
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT valid_background_color CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_accent_color CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_print_mode CHECK (print_mode IN ('free', 'pay_per_print')),
    CONSTRAINT valid_template_format CHECK (template_format IN ('portrait', 'landscape')),
    CONSTRAINT valid_price_per_print CHECK (price_per_print_cents >= 0),
    CONSTRAINT valid_max_prints CHECK (max_prints_per_guest > 0 AND max_total_prints > 0)
);

CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_client_email ON public.events(client_email);
CREATE INDEX idx_events_is_active ON public.events(is_active);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);

COMMENT ON TABLE public.events IS 'Configuration maître de chaque événement client';
COMMENT ON COLUMN public.events.slug IS 'Identifiant d''URL unique et lisible (ex: mariage-sophie-marc)';
COMMENT ON COLUMN public.events.api_key IS 'Clé API pour authentifier les requêtes du script local';
COMMENT ON COLUMN public.events.print_mode IS 'Mode impression: gratuit ou paiement par photo';
COMMENT ON COLUMN public.events.max_total_prints IS 'Nombre maximal d''impressions autorisées pour l''événement';


-- 3. TABLE: UTILISATEURS (USERS)
-- ============================================================================
-- Stocke les clients (organisateurs) et leurs délégués admin
-- ============================================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informations de base
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Bcrypt hash
    
    -- Rôle dans le système
    role VARCHAR(50) DEFAULT 'client', -- 'admin_system', 'client', 'admin_delegated'
    
    -- Lien vers événement (pour admins délégués)
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Sécurité
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- MFA optionnel
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    
    CONSTRAINT valid_role CHECK (role IN ('admin_system', 'client', 'admin_delegated')),
    CONSTRAINT client_must_have_event CHECK (
        (role != 'admin_delegated' AND event_id IS NULL) OR
        (role = 'admin_delegated' AND event_id IS NOT NULL)
    )
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_event_id ON public.users(event_id);
CREATE INDEX idx_users_is_active ON public.users(is_active);

COMMENT ON TABLE public.users IS 'Comptes utilisateurs: clients organisateurs et admins délégués';
COMMENT ON COLUMN public.users.role IS 'admin_system = admin application, client = client propriétaire, admin_delegated = délégué de client';


-- 4. TABLE: SESSIONS INVITÉS (GUEST_SESSIONS)
-- ============================================================================
-- Stocke les sessions anonymes des invités (identifiées par cookie/localStorage)
-- ============================================================================
CREATE TABLE public.guest_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Référence à l'événement
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    
    -- Identifiant de session anonyme (hash du cookie/token)
    session_token VARCHAR(255) NOT NULL,
    
    -- IP et User-Agent pour détection fraude basique
    ip_address INET,
    user_agent TEXT,
    
    -- Compteurs
    photos_uploaded_count INTEGER DEFAULT 0,
    photos_printed_count INTEGER DEFAULT 0,
    total_spent_cents INTEGER DEFAULT 0, -- En centimes
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
    
    CONSTRAINT unique_session_per_event UNIQUE(event_id, session_token)
);

CREATE INDEX idx_guest_sessions_event_id ON public.guest_sessions(event_id);
CREATE INDEX idx_guest_sessions_session_token ON public.guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_created_at ON public.guest_sessions(created_at DESC);

COMMENT ON TABLE public.guest_sessions IS 'Sessions anonymes des invités identifiées par token';
COMMENT ON COLUMN public.guest_sessions.session_token IS 'Hash du cookie/localStorage pour identifier un invité';


-- 5. TABLE: PHOTOS (PHOTOS)
-- ============================================================================
-- Stocke métadonnées et références des photos téléchargées
-- ============================================================================
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Références
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_session_id UUID NOT NULL REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
    
    -- Fichiers (Supabase Storage)
    original_image_path TEXT NOT NULL, -- Chemin dans Supabase: /events/{event_id}/originals/{id}.jpg
    processed_image_path TEXT, -- Chemin après application du template: /events/{event_id}/processed/{id}.jpg
    
    -- Métadonnées image
    image_width INTEGER NOT NULL,
    image_height INTEGER NOT NULL,
    image_size_bytes BIGINT NOT NULL,
    image_format VARCHAR(10) DEFAULT 'jpg', -- 'jpg', 'png'
    
    -- Informations utilisateur
    guest_description TEXT, -- Description optionnelle saisie par l'invité
    
    -- Configuration appliquée
    template_applied BOOLEAN DEFAULT FALSE,
    template_used_url TEXT, -- URL du template utilisé au moment du traitement
    
    -- Modération
    is_visible BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    moderation_reason VARCHAR(255),
    moderated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Imbrication
    print_job_id UUID, -- Clé étrangère optionnelle vers print_queue
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Triggers pour verrous optimistes
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_photos_event_id ON public.photos(event_id);
CREATE INDEX idx_photos_guest_session_id ON public.photos(guest_session_id);
CREATE INDEX idx_photos_is_visible ON public.photos(is_visible);
CREATE INDEX idx_photos_is_deleted ON public.photos(is_deleted);
CREATE INDEX idx_photos_created_at ON public.photos(created_at DESC);
CREATE INDEX idx_photos_event_is_visible ON public.photos(event_id, is_visible);

COMMENT ON TABLE public.photos IS 'Photos téléchargées par les invités avec métadonnées et fichiers';
COMMENT ON COLUMN public.photos.original_image_path IS 'Chemin complet dans Supabase Storage avant traitement';
COMMENT ON COLUMN public.photos.processed_image_path IS 'Chemin après fusion avec le template (prêt à imprimer)';
COMMENT ON COLUMN public.photos.template_applied IS 'Indique si le template PNG a été appliqué sur cette photo';


-- 6. TABLE: FILE D'ATTENTE D'IMPRESSION (PRINT_QUEUE)
-- ============================================================================
-- Stocke les demandes d'impression avec leur statut de traitement
-- ============================================================================
CREATE TABLE public.print_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Références
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    guest_session_id UUID NOT NULL REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
    
    -- Paiement (si applicable)
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    payment_method VARCHAR(50), -- 'stripe', 'free'
    stripe_payment_intent_id VARCHAR(255),
    amount_paid_cents INTEGER DEFAULT 0,
    
    -- État de l'impression
    print_status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'polling', 'sent_to_printer', 'printed', 'failed', 'cancelled'
    print_attempts INTEGER DEFAULT 0,
    max_print_attempts INTEGER DEFAULT 3,
    last_error_message TEXT,
    
    -- Métadonnées d'impression
    processed_image_size_bytes BIGINT,
    printed_at TIMESTAMP WITH TIME ZONE,
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_payment_status CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    CONSTRAINT valid_print_status CHECK (
        print_status IN ('queued', 'polling', 'sent_to_printer', 'printed', 'failed', 'cancelled')
    ),
    CONSTRAINT valid_payment_method CHECK (
        payment_method IN ('stripe', 'free', NULL)
    ),
    CONSTRAINT print_attempts_check CHECK (print_attempts <= max_print_attempts)
);

CREATE INDEX idx_print_queue_event_id ON public.print_queue(event_id);
CREATE INDEX idx_print_queue_photo_id ON public.print_queue(photo_id);
CREATE INDEX idx_print_queue_guest_session_id ON public.print_queue(guest_session_id);
CREATE INDEX idx_print_queue_print_status ON public.print_queue(print_status);
CREATE INDEX idx_print_queue_payment_status ON public.print_queue(payment_status);
CREATE INDEX idx_print_queue_created_at ON public.print_queue(created_at DESC);
CREATE INDEX idx_print_queue_status_composite ON public.print_queue(event_id, print_status);

COMMENT ON TABLE public.print_queue IS 'File d''attente d''impressions avec suivi paiement et statut';
COMMENT ON COLUMN public.print_queue.print_status IS 'État de traitement: queued → polling → sent_to_printer → printed';
COMMENT ON COLUMN public.print_queue.payment_status IS 'État du paiement Stripe (le cas échéant)';


-- 7. TABLE: AUDIT & LOGS (AUDIT_LOGS)
-- ============================================================================
-- Trace toutes les actions importantes pour sécurité et conformité
-- ============================================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Référence
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Action
    action VARCHAR(100) NOT NULL, -- 'photo_uploaded', 'photo_moderated', 'print_requested', etc.
    resource_type VARCHAR(50), -- 'photo', 'print_job', 'event', 'user'
    resource_id UUID,
    
    -- Détails
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Données avant/après pour audit trail complet
    changes_before JSONB,
    changes_after JSONB,
    
    -- Date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_event_id ON public.audit_logs(event_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Journal d''audit complet pour conformité et sécurité';


-- 8. TRIGGER: Mise à jour de updated_at automatique
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON public.photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_queue_updated_at BEFORE UPDATE ON public.print_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 9. TRIGGER: Mise à jour last_activity pour guest_sessions
-- ============================================================================
CREATE OR REPLACE FUNCTION update_guest_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.guest_sessions
    SET last_activity = CURRENT_TIMESTAMP
    WHERE id = NEW.guest_session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_session_on_photo AFTER INSERT ON public.photos
    FOR EACH ROW EXECUTE FUNCTION update_guest_session_activity();

CREATE TRIGGER update_guest_session_on_print AFTER INSERT ON public.print_queue
    FOR EACH ROW EXECUTE FUNCTION update_guest_session_activity();


-- 10. FONCTION: Compter les impressions totales d'un événement
-- ============================================================================
CREATE OR REPLACE FUNCTION count_total_prints_for_event(p_event_id UUID)
RETURNS TABLE(total_printed INTEGER, total_queued INTEGER, total_failed INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN print_status = 'printed' THEN 1 ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN print_status IN ('queued', 'polling', 'sent_to_printer') THEN 1 ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN print_status = 'failed' THEN 1 ELSE 0 END), 0)::INTEGER
    FROM public.print_queue
    WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION count_total_prints_for_event IS 'Compte les impressions par statut pour un événement';


-- 11. FONCTION: Vérifier quota d'impression pour un invité
-- ============================================================================
CREATE OR REPLACE FUNCTION check_guest_print_quota(
    p_event_id UUID,
    p_guest_session_id UUID
)
RETURNS TABLE(
    can_print BOOLEAN,
    prints_used INTEGER,
    prints_remaining INTEGER,
    reason VARCHAR(255)
) AS $$
DECLARE
    v_max_prints_per_guest INTEGER;
    v_prints_done INTEGER;
    v_total_event_prints INTEGER;
    v_max_total_prints INTEGER;
BEGIN
    -- Récupérer les limites d'événement
    SELECT max_prints_per_guest, max_total_prints INTO v_max_prints_per_guest, v_max_total_prints
    FROM public.events
    WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 'Event not found'::VARCHAR;
        RETURN;
    END IF;
    
    -- Compter les impressions déjà faites par cet invité
    SELECT COUNT(*)::INTEGER INTO v_prints_done
    FROM public.print_queue
    WHERE guest_session_id = p_guest_session_id
      AND print_status IN ('sent_to_printer', 'printed');
    
    -- Compter les impressions totales de l'événement
    SELECT COUNT(*)::INTEGER INTO v_total_event_prints
    FROM public.print_queue
    WHERE event_id = p_event_id
      AND print_status IN ('sent_to_printer', 'printed');
    
    -- Vérifier les quotas
    IF v_prints_done >= v_max_prints_per_guest THEN
        RETURN QUERY SELECT 
            false, 
            v_prints_done, 
            0, 
            'Guest quota reached'::VARCHAR;
    ELSIF v_total_event_prints >= v_max_total_prints THEN
        RETURN QUERY SELECT 
            false, 
            v_prints_done, 
            v_max_prints_per_guest - v_prints_done, 
            'Event quota reached'::VARCHAR;
    ELSE
        RETURN QUERY SELECT 
            true, 
            v_prints_done, 
            v_max_prints_per_guest - v_prints_done, 
            'OK'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_guest_print_quota IS 'Vérifie si un invité peut imprimer (quotas)';


-- 12. FONCTION: Enregistrer une action d'audit
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_log_action(
    p_event_id UUID,
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_description TEXT,
    p_ip_address INET,
    p_user_agent TEXT,
    p_changes_before JSONB DEFAULT NULL,
    p_changes_after JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        event_id, user_id, action, resource_type, resource_id,
        description, ip_address, user_agent, changes_before, changes_after
    ) VALUES (
        p_event_id, p_user_id, p_action, p_resource_type, p_resource_id,
        p_description, p_ip_address, p_user_agent, p_changes_before, p_changes_after
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_log_action IS 'Enregistre une action d''audit avec détails complets';


-- 13. VUE: Tableau de bord en temps réel (pour Realtime Supabase)
-- ============================================================================
CREATE OR REPLACE VIEW public.event_realtime_stats AS
SELECT
    e.id AS event_id,
    e.slug,
    e.title,
    COUNT(DISTINCT CASE WHEN p.is_deleted = FALSE AND p.is_visible = TRUE THEN p.id END)::INTEGER AS visible_photos,
    COUNT(DISTINCT CASE WHEN pq.print_status = 'printed' THEN pq.id END)::INTEGER AS total_printed,
    COUNT(DISTINCT CASE WHEN pq.print_status IN ('queued', 'polling', 'sent_to_printer') THEN pq.id END)::INTEGER AS pending_prints,
    COUNT(DISTINCT gs.id)::INTEGER AS unique_guests,
    COALESCE(SUM(CASE WHEN pq.print_status = 'printed' THEN pq.amount_paid_cents ELSE 0 END), 0)::BIGINT AS total_revenue_cents
FROM public.events e
LEFT JOIN public.photos p ON e.id = p.event_id
LEFT JOIN public.print_queue pq ON e.id = pq.event_id
LEFT JOIN public.guest_sessions gs ON e.id = gs.event_id
WHERE e.is_active = TRUE AND e.is_archived = FALSE
GROUP BY e.id, e.slug, e.title;

COMMENT ON VIEW public.event_realtime_stats IS 'Vue temps réel des statistiques d''événement';


-- 14. PERMISSIONS SUPABASE (Row Level Security)
-- ============================================================================
-- Note: Les RLS doivent être activées dans le dashboard Supabase
-- Cette section documente les stratégies requises

/*
-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique: Les clients ne voient que leurs événements
CREATE POLICY "clients_see_own_events" ON public.events
    FOR SELECT USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin_system'
        OR
        client_email = (SELECT email FROM public.users WHERE id = auth.uid())
    );

-- Politique: Les admins délégués ne voient que les photos/stats de leur événement assigné
CREATE POLICY "delegated_admins_see_assigned_event" ON public.photos
    FOR SELECT USING (
        event_id = (SELECT event_id FROM public.users WHERE id = auth.uid() AND role = 'admin_delegated')
        OR
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin_system'
    );
*/

-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================
COMMENT ON SCHEMA public IS 'Schéma application: Photos & Impressions pour événements';
