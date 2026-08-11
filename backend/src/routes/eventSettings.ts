import { Router, Request, Response } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';

const router = Router();

/**
 * Route : Mettre à jour les paramètres d'un événement
 * PATCH /api/client/events/:eventId/settings
 */
router.patch('/:eventId/settings', async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      title,
      event_type,
      event_date,
      location,
      description,
      custom_message,
      is_public,
      require_approval,
      allow_uploads
    } = req.body;

    // Préparer l'objet de mise à jour
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (custom_message !== undefined) updateData.custom_message = custom_message;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (require_approval !== undefined) updateData.require_approval = require_approval;
    if (allow_uploads !== undefined) updateData.allow_uploads = allow_uploads;

    // Mettre à jour
    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select();

    if (error) throw error;

    logger.info(`Event settings updated: ${eventId}`);

    res.json({
      success: true,
      data: data?.[0] || {},
      message: 'Paramètres mise à jour avec succès'
    });
  } catch (error: any) {
    logger.error('Update event settings failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
