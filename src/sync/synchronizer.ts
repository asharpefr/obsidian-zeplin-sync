/**
 * Component Synchronizer
 * Orchestrates the sync from Zeplin to Logseq
 */

import { ZeplinClient } from '../zeplin/client';
import { LogseqPagesManager } from '../logseq/pages';
import { LogseqBlocksManager } from '../logseq/blocks';
import { LogseqAssetsManager } from '../logseq/assets';
import { logger } from '../utils/logger';
import type { ZeplinProject, ZeplinComponent, ZeplinScreen } from '../types/zeplin';
import type { PluginConfig, BlockCreateInput } from '../types/logseq';

export class ComponentSynchronizer {
  private zeplinClient: ZeplinClient;
  private pagesManager: LogseqPagesManager;
  private blocksManager: LogseqBlocksManager;
  private assetsManager: LogseqAssetsManager;
  private config: PluginConfig;
  private projectName: string = '';

  constructor(zeplinClient: ZeplinClient, config: PluginConfig) {
    this.zeplinClient = zeplinClient;
    this.pagesManager = new LogseqPagesManager();
    this.blocksManager = new LogseqBlocksManager();
    this.assetsManager = new LogseqAssetsManager();
    this.config = config;
  }

  /**
   * Sync a complete project
   */
  async syncProject(projectId: string): Promise<void> {
    try {
      logger.info(`Starting sync for project: ${projectId}`);

      // Fetch project details
      const project = await this.zeplinClient.getProject(projectId);
      this.projectName = project.name;
      logger.info(`Syncing project: ${project.name}`);

      // Create project namespace
      await this.createProjectStructure(project);

      // Sync components
      if (project.number_of_components > 0) {
        await this.syncComponents(project);
      }

      // Sync screens
      if (project.number_of_screens > 0) {
        await this.syncScreens(project);
      }

      // Sync design tokens
      await this.syncDesignTokens(project);

      logger.info(`Sync completed for project: ${project.name}`);
    } catch (error) {
      logger.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Create the base project structure in Logseq
   */
  private async createProjectStructure(project: ZeplinProject): Promise<void> {
    const namespace = this.config.defaultNamespace;
    const projectPageName = `${namespace}/${project.name}`;

    logger.info(`Creating project structure: ${projectPageName}`);

    // Create main project page
    await this.pagesManager.ensurePage(projectPageName, {
      'zeplin-id': project.id,
      'zeplin-type': 'project',
      'zeplin-platform': project.platform,
      'zeplin-synced': Date.now(),
    });

    // Create sub-pages for organization
    await this.pagesManager.ensurePage(`${projectPageName}/Components`);
    await this.pagesManager.ensurePage(`${projectPageName}/Screens`);
    await this.pagesManager.ensurePage(`${projectPageName}/Design Tokens`);

    logger.info('Project structure created');
  }

  /**
   * Sync all components for a project
   */
  private async syncComponents(project: ZeplinProject): Promise<void> {
    logger.info('Syncing components...');

    const components = await this.zeplinClient.getComponents(project.id);
    const componentsPageName = `${this.config.defaultNamespace}/${project.name}/Components`;
    const pageUuid = await this.pagesManager.getPageFirstBlockUuid(componentsPageName);

    if (!pageUuid) {
      throw new Error('Failed to get components page first block');
    }

    for (const component of components) {
      await this.syncComponent(project, component, pageUuid);
    }

    logger.info(`Synced ${components.length} components`);
  }

  /**
   * Sync a single component
   */
  private async syncComponent(
    project: ZeplinProject,
    component: ZeplinComponent,
    parentBlockUuid: string
  ): Promise<void> {
    // Fetch full component details to get image
    const fullComponent = await this.zeplinClient.getComponent(project.id, component.id);

    const content = this.buildComponentContent(fullComponent);
    const properties = {
      'zeplin-id': fullComponent.id,
      'zeplin-type': 'component' as const,
      'zeplin-updated': fullComponent.updated,
      'zeplin-url': `https://app.zeplin.io/project/${project.id}/components?coid=${fullComponent.id}`,
    };

    const children: BlockCreateInput[] = [];

    // Add description if available
    if (fullComponent.description) {
      children.push({
        content: fullComponent.description,
        properties: {},
      });
    }

    // Add image if available
    const imageUrl = this.extractImageUrl(fullComponent);
    if (imageUrl) {
      logger.info(`Adding image for component: ${fullComponent.name}, URL: ${imageUrl}`);
      const imageContent = await this.downloadAndFormatImage(
        imageUrl,
        fullComponent.name,
        'component'
      );
      if (imageContent) {
        children.push({
          content: imageContent,
          properties: {},
        });
      }
    } else {
      logger.warn(`No image available for component: ${fullComponent.name}`);
      console.log('📸 FULL COMPONENT DATA:', fullComponent);
    }

    await this.blocksManager.upsertBlock(
      parentBlockUuid,
      content,
      component.id,
      properties,
      children
    );
  }

  /**
   * Sync all screens for a project
   */
  private async syncScreens(project: ZeplinProject): Promise<void> {
    logger.info('Syncing screens...');

    const screens = await this.zeplinClient.getScreens(project.id);
    const screensIndexPageName = `${this.config.defaultNamespace}/${project.name}/Screens`;

    // Ensure index page exists
    await this.pagesManager.ensurePage(screensIndexPageName);
    const indexPageUuid = await this.pagesManager.getPageFirstBlockUuid(screensIndexPageName);

    if (!indexPageUuid) {
      throw new Error('Failed to get screens index page first block');
    }

    // Create individual screen pages
    for (const screen of screens) {
      await this.syncScreenAsPage(project, screen, indexPageUuid);
    }

    logger.info(`Synced ${screens.length} screens`);
  }

  /**
   * Sync a single screen as its own page
   */
  private async syncScreenAsPage(
    project: ZeplinProject,
    screen: ZeplinScreen,
    indexPageUuid: string
  ): Promise<void> {
    // Fetch full screen details to get image
    const fullScreen = await this.zeplinClient.getScreen(project.id, screen.id);

    // Create individual page for this screen
    const screenPageName = `${this.config.defaultNamespace}/${project.name}/Screens/${fullScreen.name}`;

    logger.info(`Creating page for screen: ${screenPageName}`);

    const pageUuid = await this.pagesManager.ensurePage(screenPageName, {
      'zeplin-id': fullScreen.id,
      'zeplin-type': 'screen',
      'zeplin-updated': fullScreen.updated,
      'zeplin-url': `https://app.zeplin.io/project/${project.id}/screen/${fullScreen.id}`,
    });

    // Get first block of the screen page
    const screenPageBlockUuid = await this.pagesManager.getPageFirstBlockUuid(screenPageName);
    if (!screenPageBlockUuid) {
      throw new Error(`Failed to get first block for screen page: ${screenPageName}`);
    }

    // Add link in index page
    await this.blocksManager.createBlock(
      indexPageUuid,
      `[[${screenPageName}]]`,
      {
        'zeplin-id': fullScreen.id,
        'zeplin-type': 'screen',
      }
    );

    // Add content to screen page
    const children: BlockCreateInput[] = [];

    // Add metadata
    children.push({
      content: `**Zeplin URL:** [View in Zeplin](https://app.zeplin.io/project/${project.id}/screen/${fullScreen.id})`,
      properties: {},
    });

    // Add description if available
    if (fullScreen.description) {
      children.push({
        content: `**Description:** ${fullScreen.description}`,
        properties: {},
      });
    }

    // Add tags if available
    if (fullScreen.tags && fullScreen.tags.length > 0) {
      children.push({
        content: `**Tags:** ${fullScreen.tags.map(t => `#${t}`).join(' ')}`,
        properties: {},
      });
    }

    // Add section if available
    if (fullScreen.section) {
      children.push({
        content: `**Section:** ${fullScreen.section.name}`,
        properties: {},
      });
    }

    // Add image if available
    const imageUrl = this.extractImageUrl(fullScreen);
    if (imageUrl) {
      logger.info(`Adding image for screen: ${fullScreen.name}, URL: ${imageUrl}`);
      const imageContent = await this.downloadAndFormatImage(
        imageUrl,
        fullScreen.name,
        'screen'
      );
      if (imageContent) {
        children.push({
          content: imageContent,
          properties: {},
        });
      }
    } else {
      logger.warn(`No image available for screen: ${fullScreen.name}`);
    }

    // Add all children to the screen page
    await this.blocksManager.createBlockTree(screenPageBlockUuid, children);
  }

  /**
   * Sync design tokens (colors, text styles)
   */
  private async syncDesignTokens(project: ZeplinProject): Promise<void> {
    logger.info('Syncing design tokens...');

    const tokensPageName = `${this.config.defaultNamespace}/${project.name}/Design Tokens`;
    const pageUuid = await this.pagesManager.getPageFirstBlockUuid(tokensPageName);

    if (!pageUuid) {
      throw new Error('Failed to get design tokens page first block');
    }

    // Sync colors
    if (project.number_of_colors > 0) {
      const colors = await this.zeplinClient.getColors(project.id);
      await this.blocksManager.createBlock(pageUuid, `## Colors (${colors.length})`);

      for (const color of colors) {
        const colorName = color.name || 'Unnamed';
        const hexColor = this.rgbaToHex(color.r, color.g, color.b, color.a);
        await this.blocksManager.createBlock(
          pageUuid,
          `${colorName}: \`${hexColor}\``,
          { 'zeplin-id': color.id, 'zeplin-type': 'color' }
        );
      }
    }

    // Sync text styles
    if (project.number_of_text_styles > 0) {
      const textStyles = await this.zeplinClient.getTextStyles(project.id);
      await this.blocksManager.createBlock(pageUuid, `## Text Styles (${textStyles.length})`);

      for (const style of textStyles) {
        const styleInfo = `${style.name}: ${style.font_family} ${style.font_size}px / ${style.font_weight}`;
        await this.blocksManager.createBlock(
          pageUuid,
          styleInfo,
          { 'zeplin-id': style.id, 'zeplin-type': 'text-style' }
        );
      }
    }

    logger.info('Design tokens synced');
  }

  /**
   * Build component content string
   */
  private buildComponentContent(component: ZeplinComponent): string {
    const section = component.section ? ` (${component.section.name})` : '';
    return `**${component.name}**${section}`;
  }

  /**
   * Build screen content string
   */
  private buildScreenContent(screen: ZeplinScreen): string {
    const section = screen.section ? ` (${screen.section.name})` : '';
    return `**${screen.name}**${section}`;
  }

  /**
   * Convert RGBA to hex color
   */
  private rgbaToHex(r: number, g: number, b: number, a: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    const alpha = a < 1 ? toHex(a) : '';
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alpha}`;
  }

  /**
   * Extract image URL from component/screen (tries different locations)
   */
  private extractImageUrl(item: ZeplinComponent | ZeplinScreen): string | null {
    // Try different possible locations in order of preference

    // 1. Try large thumbnail first (best quality for display)
    if (item.image?.thumbnails?.large) {
      return item.image.thumbnails.large;
    }

    // 2. Try original URL (might be very large)
    if (item.image?.original_url) {
      return item.image.original_url;
    }

    // 3. Try medium thumbnail
    if (item.image?.thumbnails?.medium) {
      return item.image.thumbnails.medium;
    }

    // 4. Try standard URL field
    if (item.image?.url) {
      return item.image.url;
    }

    // 5. Try latest version
    if (item.latest_version?.image?.thumbnails?.large) {
      return item.latest_version.image.thumbnails.large;
    }
    if (item.latest_version?.image?.original_url) {
      return item.latest_version.image.original_url;
    }
    if (item.latest_version?.image?.url) {
      return item.latest_version.image.url;
    }

    // 6. Try images array
    if (item.images && item.images.length > 0) {
      const firstImage = item.images[0];
      if (firstImage?.thumbnails?.large) return firstImage.thumbnails.large;
      if (firstImage?.original_url) return firstImage.original_url;
      if (firstImage?.url) return firstImage.url;
    }

    return null;
  }

  /**
   * Download image and format for Logseq
   */
  private async downloadAndFormatImage(
    imageUrl: string,
    itemName: string,
    itemType: 'component' | 'screen'
  ): Promise<string | null> {
    try {
      if (this.config.imageStorage === 'inline') {
        // Download and embed as data URL
        const filename = this.assetsManager.buildImageFilename(
          this.projectName,
          itemType,
          itemName,
          imageUrl
        );
        const dataUrl = await this.assetsManager.downloadImage(imageUrl, filename);

        if (dataUrl) {
          return this.assetsManager.createImageMarkdown(dataUrl, itemName);
        }
      } else {
        // Use direct URL (assets mode - Logseq will handle caching)
        return `![${itemName}](${imageUrl})`;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to process image for ${itemName}:`, error);
      // Fallback to direct URL
      return `![${itemName}](${imageUrl})`;
    }
  }
}
