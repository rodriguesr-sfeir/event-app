import { Router } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';

const router = Router();

/**
 * Login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et password requis'
      });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou password incorrect'
      });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({
        success: false,
        error: 'Email ou password incorrect'
      });
    }

    logger.info(`Client logged in: ${email}`);

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error: any) {
    logger.error('Login failed', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * Signup - Créer un nouveau compte client
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Validations
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password et nom requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le password doit contenir au moins 6 caractères'
      });
    }

    // Vérifier que l'email n'existe pas déjà
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

    // Créer le nouvel utilisateur avec role 'client'
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: password, // En production, utiliser bcrypt!
        full_name,
        role: 'client',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      logger.error('Signup error', createError);
      return res.status(400).json({
        success: false,
        error: 'Erreur lors de la création du compte'
      });
    }

    logger.info(`New client registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        userId: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role
      }
    });
  } catch (error: any) {
    logger.error('Signup failed', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;