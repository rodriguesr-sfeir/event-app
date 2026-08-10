import { supabase } from '../../database/connection';
import { logger } from '../../utils/index';

class StorageService {
  async uploadPhoto(
    imageBuffer: Buffer,
    eventId: string,
    photoId: string,
    fileType: 'original' | 'processed' | 'thumbnail',
    mimeType: string = 'image/jpeg'
  ) {
    try {
      const filePath = `events/${eventId}/${fileType}/${photoId}.jpg`;

      logger.info(`Uploading: ${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filePath, imageBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('event-photos').getPublicUrl(filePath);

      return {
        path: filePath,
        url: data.publicUrl,
        size: imageBuffer.length,
        contentType: mimeType,
      };
    } catch (error) {
      logger.error('Storage upload failed', error);
      throw error;
    }
  }

  async downloadFile(filePath: string) {
    const { data, error } = await supabase.storage.from('event-photos').download(filePath);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }
}

export default new StorageService();