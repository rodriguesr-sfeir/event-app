import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../database/connection';

/**
 * Middleware : Identifier et créer une session invité
 */
export async function parseGuestSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Récupérer le token de session
    const token = 
      req.headers['x-session-token'] || 
      req.cookies?.session_token ||
      null;

    // 2. Si pas de token, en créer un nouveau
    let sessionToken = token as string;
    let isNewSession = false;

    if (!sessionToken) {
      sessionToken = uuidv4();
      isNewSession = true;
      console.log(`✨ Nouvelle session créée : ${sessionToken.slice(0, 8)}...`);
    }

    // 3. Récupérer le slug de l'événement depuis l'URL
    const eventSlug = req.params.eventSlug;

    if (!eventSlug) {
      return res.status(400).json({
        success: false,
        error: 'Slug d\'événement manquant'
      });
    }

    // 4. Chercher l'événement dans la base de données
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventSlug)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé'
      });
    }

    // 5. Ajouter la session au requête
    (req as any).guestSession = {
      token: sessionToken,
      eventSlug: eventSlug,
      eventId: event.id,
      isNewSession: isNewSession
    };

    // 6. Si c'est une nouvelle session, envoyer le token au client
    if (isNewSession) {
      res.setHeader('X-Session-Token', sessionToken);
      console.log(`📤 Token enregistré : ${sessionToken}`);
    }

    // 7. Continuer
    next();

  } catch (error) {
    console.error('Erreur parsing session :', error);
    res.status(500).json({
      success: false,
      error: 'Erreur session'
    });
  }
}