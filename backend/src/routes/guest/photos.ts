import { Router, Request, Response } from 'express';
import { handlePhotoUpload, getEventPhotos } from '../../controllers/guestPhotoController';
import { parseGuestSession } from '../../middleware/parseGuestSession';
import multer from 'multer';
import { logger } from '../../utils/index';
import path from 'path';
import os from 'os';

const router = Router();

// Configuration de multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accepter seulement les images
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Acceptez seulement JPG, PNG, WebP, GIF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

/**
 * Route : Uploader une photo
 * POST /api/guest/:eventSlug/photos
 */
router.post(
  '/:eventSlug/photos',
  parseGuestSession,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      await handlePhotoUpload(req, res);
    } catch (error) {
      logger.error('Photo upload route error', error);
      res.status(500).json({ success: false, error: 'Erreur lors de l\'upload' });
    }
  }
);

/**
 * Route : Récupérer les photos d'un événement
 * GET /api/guest/:eventSlug/photos
 */
router.get('/:eventSlug/photos', async (req: Request, res: Response) => {
  try {
    await getEventPhotos(req, res);
  } catch (error) {
    logger.error('Get photos route error', error);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement des photos' });
  }
});

export default router;