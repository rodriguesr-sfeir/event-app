import sharp from 'sharp';

class ImageProcessorService {
  async isValidImage(imageBuffer: Buffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (!metadata.width || !metadata.height) return { isValid: false };
      if (metadata.width < 100 || metadata.height < 100) return { isValid: false };
      return {
        isValid: true,
        format: metadata.format || 'jpeg',
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      return { isValid: false, error: 'Invalid image' };
    }
  }

  async resizeImage(imageBuffer: Buffer, maxW: number = 1500, maxH: number = 1500) {
    try {
      const buffer = await sharp(imageBuffer)
        .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(buffer).metadata();
      return {
        buffer,
        metadata: {
          width: metadata.width || maxW,
          height: metadata.height || maxH,
          format: 'jpeg',
          size: buffer.length,
        },
      };
    } catch (error) {
      throw new Error('Image resize failed');
    }
  }

  async generateThumbnail(imageBuffer: Buffer) {
    return sharp(imageBuffer).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer();
  }
}

export default new ImageProcessorService();
