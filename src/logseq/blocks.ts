/**
 * Logseq Blocks Manager
 * Handles creation and management of blocks in Logseq
 */

import '@logseq/libs';
import { logger } from '../utils/logger';
import type { BlockCreateInput, ZeplinBlockProperties } from '../types/logseq';

export class LogseqBlocksManager {
  /**
   * Create a block with properties and optional children
   */
  async createBlock(
    parentBlockUuid: string,
    content: string,
    properties?: ZeplinBlockProperties,
    children?: BlockCreateInput[]
  ): Promise<string | null> {
    try {
      const block = await logseq.Editor.insertBlock(
        parentBlockUuid,
        content,
        {
          sibling: false,
          properties: properties as Record<string, unknown>,
        }
      );

      if (!block) {
        logger.error('Failed to create block');
        return null;
      }

      // Create children recursively
      if (children && children.length > 0) {
        for (const child of children) {
          await this.createBlock(
            block.uuid,
            child.content,
            child.properties as ZeplinBlockProperties,
            child.children
          );
        }
      }

      return block.uuid;
    } catch (error) {
      logger.error('Error creating block:', error);
      return null;
    }
  }

  /**
   * Update an existing block's content
   */
  async updateBlock(blockUuid: string, content: string): Promise<boolean> {
    try {
      await logseq.Editor.updateBlock(blockUuid, content);
      return true;
    } catch (error) {
      logger.error('Error updating block:', error);
      return false;
    }
  }

  /**
   * Find a block by its zeplin-id property
   */
  async findBlockByZeplinId(zeplinId: string): Promise<string | null> {
    try {
      const results = await logseq.DB.q(
        `[:find (pull ?b [*])
          :where
          [?b :block/properties ?props]
          [(get ?props :zeplin-id) ?zid]
          [(= ?zid "${zeplinId}")]]`
      );

      if (results && results.length > 0) {
        const block = results[0]?.[0] as { uuid: string } | undefined;
        return block?.uuid ?? null;
      }

      return null;
    } catch (error) {
      logger.error('Error finding block by zeplin-id:', error);
      return null;
    }
  }

  /**
   * Create or update a block based on zeplin-id
   */
  async upsertBlock(
    parentBlockUuid: string,
    content: string,
    zeplinId: string,
    properties?: ZeplinBlockProperties,
    children?: BlockCreateInput[]
  ): Promise<string | null> {
    // Check if block already exists
    const existingBlockUuid = await this.findBlockByZeplinId(zeplinId);

    if (existingBlockUuid) {
      logger.info(`Updating existing block for zeplin-id: ${zeplinId}`);
      await this.updateBlock(existingBlockUuid, content);

      // Update properties
      if (properties) {
        const block = await logseq.Editor.getBlock(existingBlockUuid);
        if (block) {
          await logseq.Editor.upsertBlockProperty(
            existingBlockUuid,
            'zeplin-updated',
            Date.now()
          );
        }
      }

      return existingBlockUuid;
    }

    // Create new block
    logger.info(`Creating new block for zeplin-id: ${zeplinId}`);
    const fullProperties: ZeplinBlockProperties = {
      ...properties,
      'zeplin-id': zeplinId,
      'zeplin-synced': Date.now(),
    };

    return await this.createBlock(parentBlockUuid, content, fullProperties, children);
  }

  /**
   * Get the first block of a page
   */
  async getPageFirstBlock(pageName: string): Promise<string | null> {
    try {
      const page = await logseq.Editor.getPage(pageName);
      if (!page) return null;

      const blocks = await logseq.Editor.getPageBlocksTree(pageName);
      if (!blocks || blocks.length === 0) {
        // Create first block if page has no blocks
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
   * Create a hierarchical structure of blocks
   */
  async createBlockTree(
    parentBlockUuid: string,
    tree: BlockCreateInput[]
  ): Promise<void> {
    for (const node of tree) {
      await this.createBlock(
        parentBlockUuid,
        node.content,
        node.properties as ZeplinBlockProperties,
        node.children
      );
    }
  }
}
