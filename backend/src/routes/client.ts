import { Router } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Route : Récupérer les statistiques du client
 * GET /api/client/stats/{userId}
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user } = await supabase
      .from('users')
      .select('event_id')
      .eq('id', userId)
      .single();

    if (!user || !user.event_id) {
      return res.json({
        success: true,
        data: {
          totalPhotos: 0,
          approvedPhotos: 0,
          pendingPhotos: 0,
          revenue: 0
        }
      });
    }

    const { count: totalPhotos } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', user.event_id);

    const { count: approvedPhotos } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', user.event_id)
      .eq('is_visible', true)
      .eq('is_deleted', false);

    const { count: pendingPhotos } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', user.event_id)
      .is('moderated_at', null);

    res.json({
      success: true,
      data: {
        totalPhotos: totalPhotos || 0,
        approvedPhotos: approvedPhotos || 0,
        pendingPhotos: pendingPhotos || 0,
        revenue: 0
      }
    });
  } catch (error: any) {
    logger.error('Get stats failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route : Récupérer les photos du client
 * GET /api/client/photos/:userId
 */
router.get('/photos/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user } = await supabase
      .from('users')
      .select('event_id')
      .eq('id', userId)
      .single();

    if (!user || !user.event_id) {
      return res.json({ success: true, data: [] });
    }

    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', user.event_id)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: photos || []
    });
  } catch (error: any) {
    logger.error('Get photos failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route : Approuver une photo
 * PATCH /api/client/photos/:photoId/approve
 */
router.patch('/photos/:photoId/approve', async (req, res) => {
  try {
    const { photoId } = req.params;

    const { data, error } = await supabase
      .from('photos')
      .update({
        is_visible: true,
        moderated_at: new Date().toISOString()
      })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    logger.error('Approve photo failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route : Rejeter une photo
 * PATCH /api/client/photos/:photoId/reject
 */
router.patch('/photos/:photoId/reject', async (req, res) => {
  try {
    const { photoId } = req.params;

    const { data, error } = await supabase
      .from('photos')
      .update({
        is_visible: false,
        is_deleted: true,
        moderated_at: new Date().toISOString()
      })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    logger.error('Reject photo failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route : Créer un événement
 * POST /api/client/events
 */
router.post('/events', async (req, res) => {
  try {
    const { title, event_type, event_date, location, description, slug, client_id } = req.body;

    // Validation
    if (!title || !event_type || !event_date || !location || !slug || !client_id) {
      return res.status(400).json({
        success: false,
        error: 'Titre, type, date, lieu, slug et client_id sont requis'
      });
    }

    // Créer l'événement
    const { data: newEvent, error: createError } = await supabase
      .from('events')
      .insert({
        slug,
        title,
        event_type,
        event_date,
        location,
        description: description || null,
        client_id,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      logger.error('Create event error', createError);
      return res.status(400).json({
        success: false,
        error: 'Erreur lors de la création de l\'événement'
      });
    }

    logger.info(`Event created: ${newEvent.id}`);

    res.status(201).json({
      success: true,
      data: {
        eventId: newEvent.id,
        slug: newEvent.slug,
        title: newEvent.title,
        eventType: newEvent.event_type,
        eventDate: newEvent.event_date,
        location: newEvent.location,
        description: newEvent.description
      }
    });
  } catch (error: any) {
    logger.error('Create event failed', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * Route : Générer un QR Code pour un événement (PNG en base64)
 * GET /api/client/events/:eventId/qrcode
 */
router.get('/events/:eventId/qrcode', async (req, res) => {
  try {
    const { eventId } = req.params;

    logger.info(`Generating QR code for event: ${eventId}`);

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      logger.error('Event not found', eventError);
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé'
      });
    }

    const qrCodeUrl = `http://localhost:3000/event/${event.slug}`;

    let qrCodeDataUrl = '';
    try {
      const QRCode = require('qrcode');
      qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (qrError) {
      logger.error('QR code generation error', qrError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la génération du QR code'
      });
    }

    logger.info(`QR code generated successfully for event: ${eventId}`);

    res.json({
      success: true,
      data: {
        eventId: event.id,
        slug: event.slug,
        title: event.title,
        qrCode: qrCodeDataUrl,
        accessUrl: qrCodeUrl
      }
    });
  } catch (error: any) {
    logger.error('Generate QR code failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route : Récupérer les événements du client
 * GET /api/client/events/:userId
 */
router.get('/events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: events || []
    });
  } catch (error: any) {
    logger.error('Get events failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;