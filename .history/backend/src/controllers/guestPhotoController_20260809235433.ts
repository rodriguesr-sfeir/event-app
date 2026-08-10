import { Response, Request } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Contrôleur pour les uploads de photos des invités
 */

export const handlePhotoUpload = async (
  req: Request,
  res: Response
) => {
  try {
    const { eventSlug } = req.params;
    const { description, guest_name } = req.body;
    const file = (req as any).file;

    logger.info(`Upload started for file: ${file.originalname}`);
    logger.info(`Guest name: ${description} - ${guest_name}`);
    logger.info(`Full body:`, JSON.stringify(req.body));

    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: 'Aucun fichier fourni' });
    }

    // Récupérer l'événement par slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventSlug)
      .single();

    if (eventError || !event) {
      logger.error('Event not found', eventError);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignorer si le fichier n'existe pas
      }
      return res
        .status(404)
        .json({ success: false, error: 'Événement non trouvé' });
    }

    // Calculer le hash du fichier pour détecter les doublons
    let fileHash = '';
    try {
      const fileBuffer = fs.readFileSync(file.path);
      fileHash = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');
      logger.info(`File hash calculated: ${fileHash.substring(0, 10)}...`);
    } catch (hashError) {
      logger.error('Hash calculation error', hashError);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignorer
      }
      return res
        .status(500)
        .json({ success: false, error: 'Erreur lors du traitement du fichier' });
    }

    // Vérifier si un fichier avec le même hash existe déjà pour CET événement
    const { data: existingPhoto } = await supabase
      .from('photos')
      .select('id')
      .eq('event_id', event.id)
      .eq('file_hash', fileHash)
      .single();

    if (existingPhoto) {
      logger.warn(`Duplicate photo detected for event ${event.id}: ${fileHash.substring(0, 10)}...`);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignorer
      }
      return res.status(400).json({
        success: false,
        error: 'Cette photo a déjà été uploadée pour cet événement'
      });
    }

    // Uploader directement le fichier vers Supabase Storage (sans traitement)
    const fileName = `${event.id}/${uuidv4()}.${file.mimetype.split('/')[1]}`;
    let fileContent;
    try {
      fileContent = fs.readFileSync(file.path);
      logger.info(`File read successfully: ${fileContent.length} bytes`);
    } catch (readError) {
      logger.error('File read error', readError);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignorer
      }
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la lecture du fichier'
      });
    }

    const { error: uploadError } = await supabase.storage
      .from('event-photos')
      .upload(fileName, fileContent, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('Storage upload error', uploadError);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignorer
      }
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload du fichier'
      });
    }

    logger.info(`File uploaded to storage: ${fileName}`);

    // Créer l'enregistrement en base de données
    const { data: photo, error: insertError } = await supabase
      .from('photos')
      .insert({
        event_id: event.id,
        guest_session_id: (req as any).session?.id || null,
        original_image_path: fileName,
        processed_image_path: fileName,
        image_width: 0,
        image_height: 0,
        image_size_bytes: fileContent.length,
        guest_description: description || null,
        guest_name: guest_name || null,
        file_hash: fileHash,
        is_visible: true,
        is_deleted: false
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Database insert error', insertError);

      // Vérifier si c'est une erreur de doublon (contrainte UNIQUE sur event_id + file_hash)
      if (insertError.code === '23505') {
        try {
          await supabase.storage.from('event-photos').remove([fileName]);
        } catch (e) {
          logger.warn('Failed to remove uploaded file');
        }
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          // Ignorer
        }
        return res.status(400).json({
          success: false,
          error: 'Cette photo a déjà été uploadée pour cet événement'
        });
      }

      try {
        await supabase.storage.from('event-photos').remove([fileName]);
      } catch (e) {
        logger.warn('Failed to remove uploaded file');
      }
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignorer
      }
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la sauvegarde en base de données'
      });
    }

    logger.info(`Photo saved to database: ${photo.id}`);

    // Nettoyer les fichiers temporaires
    try {
      fs.unlinkSync(file.path);
    } catch (cleanupError) {
      logger.warn('Cleanup error', cleanupError);
    }

    // Construire l'URL de la photo
    const processedUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/event-photos/${fileName}`;

    logger.info(`Photo upload completed successfully: ${photo.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: photo.id,
        processedUrl: processedUrl
      }
    });
  } catch (error: any) {
    logger.error('Photo upload failed', error);
    res
      .status(500)
      .json({ success: false, error: 'Erreur lors de l\'upload' });
  }
};

/**
 * Récupérer les photos d'un événement
 * GET /api/guest/:eventSlug/photos
 */
export const getEventPhotos = async (
  req: Request,
  res: Response
) => {
  try {
    const { eventSlug } = req.params;

    // Récupérer l'événement
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventSlug)
      .single();

    if (eventError || !event) {
      return res
        .status(404)
        .json({ success: false, error: 'Événement non trouvé' });
    }

    // Récupérer les photos publiées de cet événement
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, guest_name, guest_description, processed_image_path, image_width, image_height, created_at, is_visible, is_deleted')
      .eq('event_id', event.id)
      .eq('is_visible', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (photosError) {
      throw photosError;
    }

    logger.info(`Retrieved ${photos?.length || 0} photos for event: ${eventSlug}`);

    res.json({
      success: true,
      data: photos || []
    });
  } catch (error: any) {
    logger.error('Get event photos failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
};