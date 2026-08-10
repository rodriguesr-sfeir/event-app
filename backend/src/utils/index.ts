/**
 * Utilitaires - Version simplifiée
 */

// Classe d'erreur
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

// Logger simple
export const logger = {
  info: (msg: string, data?: any) => console.log(`ℹ️  ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.log(`🔍 ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`⚠️  ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`❌ ${msg}`, data || ''),
};

// Validateurs
export const validateUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
};

// Constantes
export const LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  MAX_DESCRIPTION_LENGTH: 500,
};