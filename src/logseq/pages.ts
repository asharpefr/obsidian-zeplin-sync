/**
 * Logseq Pages Manager
 * Handles creation and management of pages and namespaces
 */

import '@logseq/libs';
import { logger } from '../utils/logger';

export class LogseqPagesManager {
  /**
   * Create or get a page by name
   */
  async ensurePage(pageName: string, properties?: Record<string, unknown>): Promise<string> {
    try {
      // Check if page exists
      let page = await logseq.Editor.getPage(pageName);

      if (!page) {
        logger.info(`Creating page: ${pageName}`);
        page = await logseq.Editor.createPage(
          pageName,
          properties,
          { createFirstBlock: true, redirect: false }
        );

        if (!page) {
          throw new Error(`Failed to create page: ${pageName}`);
        }
      } else {
        logger.info(`Page already exists: ${pageName}`);

        // Update properties if provided
        if (properties) {
          for (const [key, value] of Object.entries(properties)) {
            await logseq.Editor.upsertBlockProperty(page.uuid, key, value);
          }
        }
      }

      return page.uuid;
    } catch (error) {
      logger.error(`Error ensuring page ${pageName}:`, error);
      throw error;
    }
  }

  /**
   * Create a namespaced page hierarchy
   * Example: "Zeplin/ProjectName" creates both "Zeplin" and "Zeplin/ProjectName"
   */
  async ensureNamespacedPage(
    namespace: string,
    pageName: string,
    properties?: Record<string, unknown>
  ): Promise<string> {
    const fullPageName = `${namespace}/${pageName}`;

    // Ensure namespace exists
    await this.ensurePage(namespace);

    // Create the full namespaced page
    return await this.ensurePage(fullPageName, properties);
  }

  /**
   * Create a multi-level namespace
   * Example: ensureNamespace(["Zeplin", "ProjectName", "Components"])
   */
  async ensureNamespace(parts: string[]): Promise<string> {
    let currentPath = '';
    let lastUuid = '';

    for (let i = 0; i < parts.length; i++) {
      currentPath = i === 0 ? parts[i]! : `${currentPath}/${parts[i]}`;
      lastUuid = await this.ensurePage(currentPath);
    }

    return lastUuid;
  }

  /**
   * Get the first block UUID of a page (for inserting content)
   */
  async getPageFirstBlockUuid(pageName: string): Promise<string | null> {
    try {
      const page = await logseq.Editor.getPage(pageName);
      if (!page) return null;

      const blocks = await logseq.Editor.getPageBlocksTree(pageName);

      if (!blocks || blocks.length === 0) {
        // Create first block if page exists but has no blocks
        const block = await logseq.Editor.appendBlockInPage(pageName, '');
        return block?.uuid ?? null;
      }

      return blocks[0]?.uuid ?? null;
    } catch (error) {
      logger.error('Error getting page first block:', error);
      return null;
    }
  }

  /**
   * Delete a page by name
   */
  async deletePage(pageName: string): Promise<boolean> {
    try {
      const page = await logseq.Editor.getPage(pageName);
      if (!page) {
        logger.warn(`Page not found: ${pageName}`);
        return false;
      }

      await logseq.Editor.deletePage(pageName);
      logger.info(`Deleted page: ${pageName}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting page ${pageName}:`, error);
      return false;
    }
  }

  /**
   * Check if a page exists
   */
  async pageExists(pageName: string): Promise<boolean> {
    try {
      const page = await logseq.Editor.getPage(pageName);
      return page !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build a page name for a Zeplin item
   */
  buildZeplinPageName(
    namespace: string,
    projectName: string,
    itemType: 'Components' | 'Screens' | 'Colors' | 'TextStyles',
    itemName?: string
  ): string {
    const sanitized = (name: string) => name.replace(/\//g, '-');

    if (itemName) {
      return `${namespace}/${sanitized(projectName)}/${itemType}/${sanitized(itemName)}`;
    }
    return `${namespace}/${sanitized(projectName)}/${itemType}`;
  }
}
