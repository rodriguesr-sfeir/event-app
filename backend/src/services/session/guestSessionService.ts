import { supabase } from '../../database/connection';

class GuestSessionService {
  /**
   * Créer ou récupérer une session invité
   */
  async getOrCreateSession(eventId: string, sessionToken: string) {
    try {
      // 1. Chercher la session existante
      const { data: session, error: sessionError } = await supabase
        .from('guest_sessions')
        .select('*')
        .eq('event_id', eventId)
        .eq('session_token', sessionToken)
        .single();

      if (session) {
        // Session existe
        return { id: session.id, eventId: eventId, isNew: false };
      }

      // 2. Session n'existe pas, la créer
      const { data: newSession, error: createError } = await supabase
        .from('guest_sessions')
        .insert({
          event_id: eventId,
          session_token: sessionToken,
          ip_address: null,
          user_agent: null,
          photos_uploaded_count: 0,
          photos_printed_count: 0,
          total_spent_cents: 0
        })
        .select()
        .single();

      if (createError || !newSession) {
        throw new Error('Impossible de créer la session');
      }

      console.log(`✅ Nouvelle session BD créée: ${newSession.id}`);

      return { id: newSession.id, eventId: eventId, isNew: true };

    } catch (error) {
      console.error('Erreur session invité:', error);
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de photos uploadées
   */
  async incrementPhotoCount(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('guest_sessions')
        .update({ photos_uploaded_count: 1 })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.warn('Erreur incrément photos:', error);
    }
  }
}

export default new GuestSessionService();