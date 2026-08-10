import { Router } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';

const router = Router();

/**
 * Route : Récupérer tous les événements du client avec stats
 * GET /api/events/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Récupérer tous les événements
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    // Pour chaque événement, récupérer les stats
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event) => {
        // Nombre de photos
        const { count: photoCount } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('is_visible', true)
          .eq('is_deleted', false);

        // Nombre de participants uniques (par guest_name)
        const { data: photos } = await supabase
          .from('photos')
          .select('guest_name')
          .eq('event_id', event.id)
          .eq('is_visible', true)
          .eq('is_deleted', false);

        const uniqueParticipants = new Set(
          photos?.map(p => p.guest_name).filter(name => name !== null) || []
        ).size;

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          event_type: event.event_type,
          event_date: event.event_date,
          location: event.location,
          description: event.description,
          is_active: event.is_active,
          created_at: event.created_at,
          photoCount: photoCount || 0,
          participantCount: uniqueParticipants
        };
      })
    );

    // Stats globales - Somme des participants uniques par événement
    const totalParticipants = eventsWithStats.reduce(
      (sum, event) => sum + event.participantCount,
      0
    );
    const totalPhotos = eventsWithStats.reduce((sum, e) => sum + e.photoCount, 0);

    res.json({
      success: true,
      data: {
        events: eventsWithStats,
        stats: {
          eventCount: eventsWithStats.length,
          photoCount: totalPhotos,
          participantCount: totalParticipants
        }
      }
    });
  } catch (error: any) {
    logger.error('Get events with stats failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route : Supprimer un événement
 * DELETE /api/events/:eventId
 */
router.delete('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;

    logger.info(`Event deleted: ${eventId}`);

    res.json({
      success: true,
      message: 'Événement supprimé'
    });
  } catch (error: any) {
    logger.error('Delete event failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;