import { supabase } from '../../database/connection';
import { logger } from '../../utils/index';

class PhotoService {
  async createPhoto(input: any) {
    try {
      const { data, error } = await supabase
        .from('photos')
        .insert({
          event_id: input.eventId,
          guest_session_id: input.guestSessionId,
          original_image_path: input.originalImagePath,
          processed_image_path: input.processedImagePath,
          image_width: input.imageWidth,
          image_height: input.imageHeight,
          image_size_bytes: input.imageSize,
          image_format: input.imageFormat,
          guest_description: input.guestDescription || null,
          template_applied: input.templateApplied || false,
        })
        .select()
        .single();

      if (error) throw error;
      logger.info(`Photo created: ${data.id}`);
      return data;
    } catch (error) {
      logger.error('Photo creation failed', error);
      throw error;
    }
  }

  async getPhotoById(photoId: string) {
    const { data, error } = await supabase.from('photos').select('*').eq('id', photoId).single();
    if (error) return null;
    return data;
  }

  async getEventFeed(eventId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data;
  }

  async updatePhoto(photoId: string, updates: any) {
    const { data, error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default new PhotoService();