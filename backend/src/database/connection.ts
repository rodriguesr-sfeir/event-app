import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement AVANT tout
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Vérifier que les variables existent
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Env check:');
console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅ OK' : '❌ MISSING');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ OK' : '❌ MISSING');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('❌ Missing Supabase environment variables! Check your .env.local file.');
}

// Créer le client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default supabase;