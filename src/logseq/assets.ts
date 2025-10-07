/**
 * Logseq Assets Manager
 * Handles downloading and storing images in the Logseq graph
 */

import axios from 'axios';
import { logger } from '../utils/logger';

export class LogseqAssetsManager {
  private assetsPath: string | null = null;

  constructor() {
    this.initializeAssetsPath();
  }

  /**
   * Initialize the assets path for the current graph
   */
  private async initializeAssetsPath(): Promise<void> {
    try {
      const currentGraph = await logseq.App.getCurrentGraph();
      if (currentGraph?.path) {
        this.assetsPath = `${currentGraph.path}/assets`;
        logger.info(`Assets path: ${this.assetsPath}`);
      }
    } catch (error) {
      logger.error('Failed to get assets path:', error);
    }
  }

  /**
   * Download an image from URL and save to Logseq assets
   */
  async downloadImage(url: string, filename: string): Promise<string | null> {
    try {
      logger.info(`Downloading image: ${filename}`);

      // Download image as blob
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      // Convert to base64
      const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64');
      const mimeType = response.headers['content-type'] || 'image/png';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Save to Logseq assets (if we have assets path)
      if (this.assetsPath) {
        // For now, return the data URL - Logseq will handle storage
        // In future versions, we could write directly to filesystem
        return dataUrl;
      }

      return dataUrl;
    } catch (error) {
      logger.error(`Failed to download image ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate a safe filename from a name
   */
  sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get image extension from URL
   */
  getImageExtension(url: string): string {
    const match = url.match(/\.(png|jpg|jpeg|gif|svg|webp)(\?|$)/i);
    return match?.[1] || 'png';
  }

  /**
   * Build a filename for a Zeplin image
   */
  buildImageFilename(
    projectName: string,
    itemType: 'component' | 'screen',
    itemName: string,
    imageUrl: string
  ): string {
    const sanitizedProject = this.sanitizeFilename(projectName);
    const sanitizedItem = this.sanitizeFilename(itemName);
    const ext = this.getImageExtension(imageUrl);
    const timestamp = Date.now();

    return `zeplin-${sanitizedProject}-${itemType}-${sanitizedItem}-${timestamp}.${ext}`;
  }

  /**
   * Create an image markdown reference
   */
  createImageMarkdown(imagePath: string, altText: string): string {
    // If it's a data URL, embed it directly
    if (imagePath.startsWith('data:')) {
      return `![${altText}](${imagePath})`;
    }

    // Otherwise, reference the asset
    return `![${altText}](../assets/${imagePath})`;
  }
}
