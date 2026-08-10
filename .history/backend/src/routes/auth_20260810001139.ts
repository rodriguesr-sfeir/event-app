import { Router, Request, Response } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Route : Inscription
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis'
      });
    }

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const userId = uuidv4();
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        password: password,
        first_name: first_name,
        last_name: last_name
      })
      .select()
      .single();

    if (insertError) {
      logger.error('User creation error', insertError);
      return res.status(400).json({
        success: false,
        error: 'Erreur lors de la création du compte'
      });
    }

    logger.info(`User registered: ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        userId: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        token: 'dummy-token'
      }
    });
  } catch (error: any) {
    logger.error('Register failed', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * Route : Connexion
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    logger.info(`User logged in: ${user.id}`);

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        token: 'dummy-token'
      }
    });
  } catch (error: any) {
    logger.error('Login failed', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;