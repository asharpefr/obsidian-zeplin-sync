/**
 * Obsidian Zeplin Sync Plugin
 * Main entry point
 */

import { Plugin, Notice, PluginSettingTab, App, Setting } from 'obsidian';
import { ZeplinClient } from './zeplin/client';
import { ObsidianSynchronizer } from './sync/obsidian-synchronizer';
import { logger } from './utils/logger';

interface ZeplinSyncSettings {
  zeplinToken: string;
  defaultFolder: string;
  imageStorage: 'inline' | 'assets';
  templateFormat: 'detailed' | 'minimal';
  excludePatterns: string;
  createProjectFolder: boolean;
  organizeBySections: boolean;
}

const DEFAULT_SETTINGS: ZeplinSyncSettings = {
  zeplinToken: '',
  defaultFolder: 'Zeplin',
  imageStorage: 'assets',
  templateFormat: 'detailed',
  excludePatterns: '',
  createProjectFolder: false,
  organizeBySections: true,
};

export default class ZeplinSyncPlugin extends Plugin {
  settings: ZeplinSyncSettings = DEFAULT_SETTINGS;
  private zeplinClient: ZeplinClient | null = null;

  async onload() {
    logger.info('Zeplin Sync Plugin loaded');

    await this.loadSettings();

    // Add ribbon icon
    this.addRibbonIcon('sync', 'Sync from Zeplin', async () => {
      await this.handleSync();
    });

    // Add command
    this.addCommand({
      id: 'sync-from-zeplin',
      name: 'Sync from Zeplin',
      callback: async () => {
        await this.handleSync();
      },
    });

    // Add command to test connection
    this.addCommand({
      id: 'test-zeplin-connection',
      name: 'Test Zeplin API Connection',
      callback: async () => {
        await this.testConnection();
      },
    });

    // Add settings tab
    this.addSettingTab(new ZeplinSyncSettingTab(this.app, this));
  }

  onunload() {
    logger.info('Zeplin Sync Plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private initializeClient(): ZeplinClient | null {
    if (!this.settings.zeplinToken) {
      logger.warn('No Zeplin token configured');
      return null;
    }
    return new ZeplinClient(this.settings.zeplinToken);
  }

  private async handleSync() {
    try {
      // Initialize client
      this.zeplinClient = this.initializeClient();
      if (!this.zeplinClient) {
        new Notice('Please configure your Zeplin API token in settings');
        return;
      }

      new Notice('Fetching Zeplin projects...');

      // Fetch projects
      const projects = await this.zeplinClient.getProjects();

      if (projects.length === 0) {
        new Notice('No Zeplin projects found');
        return;
      }

      // Show project picker
      const projectId = await this.showProjectPicker(projects);
      if (!projectId) {
        logger.info('User cancelled project selection');
        return;
      }

      const selectedProject = projects.find(p => p.id === projectId);
      if (!selectedProject) {
        new Notice('Project not found');
        return;
      }

      new Notice(`Syncing project: ${selectedProject.name}...`);
      logger.info(`Selected project: ${selectedProject.name}`);

      // Sync the project
      const synchronizer = new ObsidianSynchronizer(
        this.app,
        this.zeplinClient,
        this.settings
      );
      await synchronizer.syncProject(projectId);

      new Notice(`Successfully synced ${selectedProject.name}!`);
    } catch (error) {
      logger.error('Sync failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`Sync failed: ${message}`);
    }
  }

  private async testConnection() {
    const client = this.initializeClient();
    if (!client) {
      new Notice('Please configure your Zeplin API token first');
      return;
    }

    new Notice('Testing connection...');
    const success = await client.testConnection();
    if (success) {
      new Notice('Connection successful!');
    } else {
      new Notice('Connection failed. Check console for details.');
    }
  }

  private async showProjectPicker(projects: any[]): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new ProjectPickerModal(this.app, projects, (projectId) => {
        resolve(projectId);
      });
      modal.open();
    });
  }
}

// Simple project picker modal
import { Modal, ButtonComponent } from 'obsidian';

class ProjectPickerModal extends Modal {
  private projects: any[];
  private callback: (projectId: string | null) => void;
  private selectedProjectId: string | null = null;

  constructor(app: App, projects: any[], callback: (projectId: string | null) => void) {
    super(app);
    this.projects = projects;
    this.callback = callback;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Select Zeplin Project' });

    const selectEl = contentEl.createEl('select');
    selectEl.style.width = '100%';
    selectEl.style.marginBottom = '20px';
    selectEl.style.padding = '8px';

    const defaultOption = selectEl.createEl('option');
    defaultOption.value = '';
    defaultOption.text = '-- Select a project --';

    this.projects.forEach(project => {
      const option = selectEl.createEl('option');
      option.value = project.id;
      option.text = `${project.name} (${project.platform}) - ${project.number_of_screens} screens, ${project.number_of_components} components`;
    });

    selectEl.addEventListener('change', () => {
      this.selectedProjectId = selectEl.value;
    });

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';

    new ButtonComponent(buttonContainer)
      .setButtonText('Cancel')
      .onClick(() => {
        this.callback(null);
        this.close();
      });

    new ButtonComponent(buttonContainer)
      .setButtonText('Sync')
      .setCta()
      .onClick(() => {
        if (!this.selectedProjectId) {
          new Notice('Please select a project');
          return;
        }
        this.callback(this.selectedProjectId);
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Settings tab
class ZeplinSyncSettingTab extends PluginSettingTab {
  plugin: ZeplinSyncPlugin;

  constructor(app: App, plugin: ZeplinSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Zeplin Sync Settings' });

    new Setting(containerEl)
      .setName('Zeplin API Token')
      .setDesc('Your Zeplin personal access token')
      .addText(text => text
        .setPlaceholder('Enter your token')
        .setValue(this.plugin.settings.zeplinToken)
        .onChange(async (value) => {
          this.plugin.settings.zeplinToken = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default Folder')
      .setDesc('Folder where Zeplin content will be synced')
      .addText(text => text
        .setPlaceholder('Zeplin')
        .setValue(this.plugin.settings.defaultFolder)
        .onChange(async (value) => {
          this.plugin.settings.defaultFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Image Storage')
      .setDesc('How to store images')
      .addDropdown(dropdown => dropdown
        .addOption('assets', 'Assets (use URLs)')
        .addOption('inline', 'Inline (embed as base64)')
        .setValue(this.plugin.settings.imageStorage)
        .onChange(async (value: 'inline' | 'assets') => {
          this.plugin.settings.imageStorage = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Template Format')
      .setDesc('Detail level for imported content')
      .addDropdown(dropdown => dropdown
        .addOption('detailed', 'Detailed')
        .addOption('minimal', 'Minimal')
        .setValue(this.plugin.settings.templateFormat)
        .onChange(async (value: 'detailed' | 'minimal') => {
          this.plugin.settings.templateFormat = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Create Project Folder')
      .setDesc('Create a folder with the project name inside the default folder')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.createProjectFolder)
        .onChange(async (value) => {
          this.plugin.settings.createProjectFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Organize by Sections')
      .setDesc('Create folders based on Zeplin sections')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.organizeBySections)
        .onChange(async (value) => {
          this.plugin.settings.organizeBySections = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Exclude Patterns')
      .setDesc('Glob patterns to skip screens and components (one per line, e.g., *-old, test-*, *-deprecated)')
      .addTextArea(text => text
        .setPlaceholder('*-old\ntest-*\n*-deprecated')
        .setValue(this.plugin.settings.excludePatterns)
        .onChange(async (value) => {
          this.plugin.settings.excludePatterns = value;
          await this.plugin.saveSettings();
        }));
  }
}
