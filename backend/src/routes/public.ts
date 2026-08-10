import { Router, Request, Response } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';

const router = Router();

/**
 * Route : Récupérer les infos publiques d'un événement
 * GET /api/public/events/:slug
 */
router.get('/events/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Le slug est requis'
      });
    }

    logger.info(`Fetching public event: ${slug}`);

    // Récupérer l'événement par slug
    const { data: event, error } = await supabase
      .from('events')
      .select('id, title, slug, event_type, event_date, location, description, custom_message')
      .eq('slug', slug)
      .single();

    if (error || !event) {
      logger.error('Event not found', error);
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé'
      });
    }

    logger.info(`Public event retrieved: ${event.id}`);

    // Renommer id en eventId pour le frontend
    const eventData = {
      ...event,
      eventId: event.id
    };
    delete (eventData as any).id;

    res.json({
      success: true,
      data: eventData
    });
  } catch (error: any) {
    logger.error('Get public event failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;