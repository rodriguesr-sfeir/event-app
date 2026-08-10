/**
 * Types pour l'application
 */

// Événement
export interface Event {
  id: string;
  slug: string;
  title: string;
  background_color: string;
  template_image_url?: string;
  template_format: 'portrait' | 'landscape';
  apply_template_by_default: boolean;
}

// Photo
export interface Photo {
  id: string;
  event_id: string;
  guest_session_id: string;
  original_image_path: string;
  processed_image_path: string;
  image_width: number;
  image_height: number;
  image_size_bytes: number;
  guest_description?: string;
  template_applied: boolean;
  is_visible: boolean;
  is_deleted: boolean;
  created_at: string;
}

// Session invité
export interface GuestSession {
  id: string;
  event_id: string;
  session_token: string;
  photos_uploaded_count: number;
  created_at: string;
}

// Réponse d'upload photo
export interface PhotoUploadResponse {
  success: boolean;
  data?: {
    photoId: string;
    originalUrl: string;
    processedUrl: string;
    width: number;
    height: number;
    size: number;
    templateApplied: boolean;
  };
  error?: string;
}