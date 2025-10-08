/**
 * Obsidian Synchronizer
 * Orchestrates the sync from Zeplin to Obsidian markdown files
 */

import { App, TFile } from 'obsidian';
import { ZeplinClient } from '../zeplin/client';
import { logger } from '../utils/logger';
import type { ZeplinProject, ZeplinComponent, ZeplinScreen } from '../types/zeplin';

interface ObsidianSettings {
  defaultFolder: string;
  imageStorage: 'inline' | 'assets';
  templateFormat: 'detailed' | 'minimal';
  excludePatterns: string;
  createProjectFolder: boolean;
  organizeBySections: boolean;
}

export class ObsidianSynchronizer {
  private app: App;
  private zeplinClient: ZeplinClient;
  private settings: ObsidianSettings;
  private excludePatterns: string[] = [];

  constructor(app: App, zeplinClient: ZeplinClient, settings: ObsidianSettings) {
    this.app = app;
    this.zeplinClient = zeplinClient;
    this.settings = settings;
    this.excludePatterns = settings.excludePatterns
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Sync a complete project
   */
  async syncProject(projectId: string): Promise<void> {
    try {
      logger.info(`Starting sync for project: ${projectId}`);

      // Fetch project details
      const project = await this.zeplinClient.getProject(projectId);
      logger.info(`Syncing project: ${project.name}`);

      // Create project folder structure
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
   * Create the base project folder structure
   */
  private async createProjectStructure(project: ZeplinProject): Promise<void> {
    const basePath = this.settings.createProjectFolder
      ? `${this.settings.defaultFolder}/${this.sanitizePath(project.name)}`
      : this.settings.defaultFolder;

    await this.ensureFolder(basePath);
    await this.ensureFolder(`${basePath}/Components`);
    await this.ensureFolder(`${basePath}/Screens`);
    await this.ensureFolder(`${basePath}/Design Tokens`);

    // Create index file
    const indexPath = `${basePath}/README.md`;
    const indexContent = `# ${project.name}

**Platform:** ${project.platform}
**Screens:** ${project.number_of_screens}
**Components:** ${project.number_of_components}
**Colors:** ${project.number_of_colors}
**Text Styles:** ${project.number_of_text_styles}
**Status:** ${project.status}

## Contents

- [[${basePath}/Screens|Screens]]
- [[${basePath}/Components|Components]]
- [[${basePath}/Design Tokens|Design Tokens]]

---
*Synced from Zeplin*
*Last updated: ${new Date().toISOString()}*
`;

    await this.writeFile(indexPath, indexContent);
  }

  /**
   * Sync all components
   */
  private async syncComponents(project: ZeplinProject): Promise<void> {
    logger.info('Syncing components...');

    // Fetch sections first to map IDs to names
    const sections = await this.zeplinClient.getSections(project.id);
    const sectionMap = new Map(sections.map(s => [s.id, s.name || 'Unknown']));

    const components = await this.zeplinClient.getComponents(project.id);
    const basePath = this.settings.createProjectFolder
      ? `${this.settings.defaultFolder}/${this.sanitizePath(project.name)}/Components`
      : `${this.settings.defaultFolder}/Components`;

    // Filter components
    const filteredComponents = components.filter(c => !this.shouldExclude(c.name));
    const skippedCount = components.length - filteredComponents.length;

    // Create index
    let indexContent = `# Components\n\n`;
    indexContent += `Total: ${filteredComponents.length}`;
    if (skippedCount > 0) {
      indexContent += ` (${skippedCount} excluded by filters)`;
    }
    indexContent += `\n\n`;

    for (const component of filteredComponents) {
      const fullComponent = await this.zeplinClient.getComponent(project.id, component.id);

      // Populate section name if available
      if (fullComponent.section?.id) {
        fullComponent.section.name = sectionMap.get(fullComponent.section.id);
      }

      // Determine file path based on organizeBySections setting
      const fileName = `${this.sanitizePath(fullComponent.name)}.md`;
      let filePath: string;
      if (this.settings.organizeBySections && fullComponent.section?.name) {
        const sectionFolder = this.sanitizePath(fullComponent.section.name);
        filePath = `${basePath}/${sectionFolder}/${fileName}`;
      } else {
        filePath = `${basePath}/${fileName}`;
      }

      const content = await this.buildComponentMarkdown(project, fullComponent);
      await this.writeFile(filePath, content);

      indexContent += `- [[${filePath.replace('.md', '')}|${fullComponent.name}]]\n`;
    }

    await this.writeFile(`${basePath}.md`, indexContent);

    logger.info(`Synced ${filteredComponents.length} components${skippedCount > 0 ? ` (excluded ${skippedCount})` : ''}`);
  }

  /**
   * Sync all screens
   */
  private async syncScreens(project: ZeplinProject): Promise<void> {
    logger.info('Syncing screens...');

    // Fetch sections first to map IDs to names
    const sections = await this.zeplinClient.getSections(project.id);
    const sectionMap = new Map(sections.map(s => [s.id, s.name || 'Unknown']));

    const screens = await this.zeplinClient.getScreens(project.id);
    const basePath = this.settings.createProjectFolder
      ? `${this.settings.defaultFolder}/${this.sanitizePath(project.name)}/Screens`
      : `${this.settings.defaultFolder}/Screens`;

    // Filter screens
    const filteredScreens = screens.filter(s => !this.shouldExclude(s.name));
    const skippedCount = screens.length - filteredScreens.length;

    // Create index
    let indexContent = `# Screens\n\n`;
    indexContent += `Total: ${filteredScreens.length}`;
    if (skippedCount > 0) {
      indexContent += ` (${skippedCount} excluded by filters)`;
    }
    indexContent += `\n\n`;

    for (const screen of filteredScreens) {
      const fullScreen = await this.zeplinClient.getScreen(project.id, screen.id);

      // Populate section name if available
      if (fullScreen.section?.id) {
        fullScreen.section.name = sectionMap.get(fullScreen.section.id);
      }

      // Determine file path based on organizeBySections setting
      const fileName = `${this.sanitizePath(fullScreen.name)}.md`;
      let filePath: string;
      if (this.settings.organizeBySections && fullScreen.section?.name) {
        const sectionFolder = this.sanitizePath(fullScreen.section.name);
        filePath = `${basePath}/${sectionFolder}/${fileName}`;
      } else {
        filePath = `${basePath}/${fileName}`;
      }

      const content = await this.buildScreenMarkdown(project, fullScreen);
      await this.writeFile(filePath, content);

      indexContent += `- [[${filePath.replace('.md', '')}|${fullScreen.name}]]\n`;
    }

    await this.writeFile(`${basePath}.md`, indexContent);

    logger.info(`Synced ${filteredScreens.length} screens${skippedCount > 0 ? ` (excluded ${skippedCount})` : ''}`);
  }

  /**
   * Sync design tokens
   */
  private async syncDesignTokens(project: ZeplinProject): Promise<void> {
    logger.info('Syncing design tokens...');

    const basePath = this.settings.createProjectFolder
      ? `${this.settings.defaultFolder}/${this.sanitizePath(project.name)}/Design Tokens`
      : `${this.settings.defaultFolder}/Design Tokens`;

    let content = `# Design Tokens\n\n`;

    // Sync colors
    if (project.number_of_colors > 0) {
      const colors = await this.zeplinClient.getColors(project.id);
      content += `## Colors (${colors.length})\n\n`;

      for (const color of colors) {
        const colorName = color.name || 'Unnamed';
        const hexColor = this.rgbaToHex(color.r, color.g, color.b, color.a);
        content += `- **${colorName}**: \`${hexColor}\`\n`;
      }

      content += `\n`;
    }

    // Sync text styles
    if (project.number_of_text_styles > 0) {
      const textStyles = await this.zeplinClient.getTextStyles(project.id);
      content += `## Text Styles (${textStyles.length})\n\n`;

      for (const style of textStyles) {
        content += `- **${style.name}**: ${style.font_family} ${style.font_size}px / ${style.font_weight}\n`;
      }
    }

    await this.writeFile(`${basePath}.md`, content);

    logger.info('Design tokens synced');
  }

  /**
   * Build markdown content for a component
   */
  private async buildComponentMarkdown(
    project: ZeplinProject,
    component: ZeplinComponent
  ): Promise<string> {
    let content = '';

    // Metadata
    content += `**Type:** Component\n`;
    if (component.section) {
      content += `**Section:** ${component.section.name}\n`;
    }
    content += `**Zeplin URL:** [View in Zeplin](https://app.zeplin.io/project/${project.id}/components?coid=${component.id})\n\n`;

    // Description
    if (component.description) {
      content += `## Description\n\n${component.description}\n\n`;
    }

    // Image
    const imageUrl = this.extractImageUrl(component);
    if (imageUrl) {
      content += `## Preview\n\n`;
      content += `![${component.name}](${imageUrl})\n\n`;
    }

    content += `---\n*Synced from Zeplin on ${new Date().toISOString()}*\n`;

    return content;
  }

  /**
   * Build markdown content for a screen
   */
  private async buildScreenMarkdown(
    project: ZeplinProject,
    screen: ZeplinScreen
  ): Promise<string> {
    let content = '';

    // Metadata
    content += `**Type:** Screen\n`;
    if (screen.section) {
      content += `**Section:** ${screen.section.name}\n`;
    }
    if (screen.tags && screen.tags.length > 0) {
      content += `**Tags:** ${screen.tags.map(t => `#${t}`).join(' ')}\n`;
    }
    content += `**Zeplin URL:** [View in Zeplin](https://app.zeplin.io/project/${project.id}/screen/${screen.id})\n\n`;

    // Description
    if (screen.description) {
      content += `## Description\n\n${screen.description}\n\n`;
    }

    // Image
    const imageUrl = this.extractImageUrl(screen);
    if (imageUrl) {
      content += `## Preview\n\n`;
      content += `![${screen.name}](${imageUrl})\n\n`;
    }

    content += `---\n*Synced from Zeplin on ${new Date().toISOString()}*\n`;

    return content;
  }

  /**
   * Extract image URL from component/screen
   */
  private extractImageUrl(item: ZeplinComponent | ZeplinScreen): string | null {
    if (item.image?.thumbnails?.large) {
      return item.image.thumbnails.large;
    }
    if (item.image?.original_url) {
      return item.image.original_url;
    }
    if (item.image?.thumbnails?.medium) {
      return item.image.thumbnails.medium;
    }
    if (item.image?.url) {
      return item.image.url;
    }
    return null;
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
   * Sanitize path/filename
   */
  private sanitizePath(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
  }

  /**
   * Ensure folder exists
   */
  private async ensureFolder(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.app.vault.createFolder(path);
    }
  }

  /**
   * Write or update a file
   */
  private async writeFile(path: string, content: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);

    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
      logger.info(`Updated file: ${path}`);
    } else {
      // Ensure parent folder exists
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      if (parentPath) {
        const parentFolder = this.app.vault.getAbstractFileByPath(parentPath);
        if (!parentFolder) {
          await this.app.vault.createFolder(parentPath);
        }
      }

      await this.app.vault.create(path, content);
      logger.info(`Created file: ${path}`);
    }
  }

  /**
   * Check if a name should be excluded based on glob patterns
   */
  private shouldExclude(name: string): boolean {
    if (this.excludePatterns.length === 0) {
      return false;
    }

    return this.excludePatterns.some(pattern => {
      const regex = this.globToRegex(pattern);
      return regex.test(name);
    });
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`, 'i');
  }
}
