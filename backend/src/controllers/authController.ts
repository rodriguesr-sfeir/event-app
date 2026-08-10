import { Request, Response } from 'express';
import { supabase } from '../database/connection';
import { logger } from '../utils/index';

class AuthController {
  static async loginClient(req: Request, res: Response) {
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
          name: user.name || 'Client',
          role: user.role,
          token: user.id
        }
      });
    } catch (error: any) {
      logger.error('Login failed', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
}

export default AuthController;