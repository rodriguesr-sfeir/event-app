import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/index';

// Charger les variables d'environnement
dotenv.config();

// Importer les routes
import authRouter from './routes/auth';
import publicRouter from './routes/public';
import clientRouter from './routes/client';
import eventsRouter from './routes/events';
import guestRouter from './routes/guest/photos';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Vérifier les variables d'environnement
logger.info('🔍 Env check:');
logger.info(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ OK' : '❌ Missing'}`);
logger.info(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ OK' : '❌ Missing'}`);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/client', clientRouter);
app.use('/api/events', eventsRouter);
app.use('/api/guest', guestRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  logger.info(`✅ Serveur démarré sur http://localhost:${PORT}`);
});

export default app;