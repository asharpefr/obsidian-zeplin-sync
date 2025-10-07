/**
 * Logseq Zeplin Sync Plugin
 * Main entry point
 */

import '@logseq/libs';
import { ZeplinClient } from './zeplin/client';
import { ComponentSynchronizer } from './sync/synchronizer';
import { showProjectPicker, formatProjectInfo } from './ui/project-picker';
import { logger } from './utils/logger';
import type { PluginConfig } from './types/logseq';

let zeplinClient: ZeplinClient | null = null;

function getSettings(): PluginConfig {
  return logseq.settings as unknown as PluginConfig;
}

function initializeClient(): ZeplinClient | null {
  const settings = getSettings();
  if (!settings.zeplinToken) {
    logger.warn('No Zeplin token configured');
    return null;
  }
  return new ZeplinClient(settings.zeplinToken);
}

async function handleSync() {
  try {
    // Initialize client
    zeplinClient = initializeClient();
    if (!zeplinClient) {
      await logseq.UI.showMsg('Please configure your Zeplin API token in settings', 'warning');
      logseq.showSettingsUI();
      return;
    }

    await logseq.UI.showMsg('Fetching Zeplin projects...', 'info');

    // Fetch projects
    const projects = await zeplinClient.getProjects();

    if (projects.length === 0) {
      await logseq.UI.showMsg('No Zeplin projects found', 'warning');
      return;
    }

    // Show project picker
    const projectId = await showProjectPicker(projects);
    if (!projectId) {
      logger.info('User cancelled project selection');
      return;
    }

    const selectedProject = projects.find(p => p.id === projectId);
    if (!selectedProject) {
      await logseq.UI.showMsg('Project not found', 'error');
      return;
    }

    await logseq.UI.showMsg(`Syncing project: ${selectedProject.name}...`, 'info');
    logger.info('Selected project:', formatProjectInfo(selectedProject));

    // Sync the project
    const synchronizer = new ComponentSynchronizer(zeplinClient, getSettings());
    await synchronizer.syncProject(projectId);

    await logseq.UI.showMsg(`Successfully synced ${selectedProject.name}!`, 'success');
  } catch (error) {
    logger.error('Sync failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logseq.UI.showMsg(`Sync failed: ${message}`, 'error');
  }
}

function main() {
  logger.info('Logseq Zeplin Sync Plugin loaded');

  // Register settings
  logseq.useSettingsSchema([
    {
      key: 'zeplinToken',
      type: 'string',
      title: 'Zeplin API Token',
      description: 'Your Zeplin personal access token',
      default: '',
    },
    {
      key: 'autoSync',
      type: 'boolean',
      title: 'Auto Sync',
      description: 'Automatically sync on startup',
      default: false,
    },
    {
      key: 'syncInterval',
      type: 'number',
      title: 'Sync Interval (minutes)',
      description: 'How often to sync automatically (0 = disabled)',
      default: 0,
    },
    {
      key: 'defaultNamespace',
      type: 'string',
      title: 'Default Namespace',
      description: 'Default namespace for Zeplin pages',
      default: 'Zeplin',
    },
    {
      key: 'imageStorage',
      type: 'enum',
      title: 'Image Storage',
      description: 'How to store images',
      enumChoices: ['inline', 'assets'],
      enumPicker: 'select',
      default: 'assets',
    },
    {
      key: 'templateFormat',
      type: 'enum',
      title: 'Template Format',
      description: 'Detail level for imported content',
      enumChoices: ['detailed', 'minimal'],
      enumPicker: 'select',
      default: 'detailed',
    },
  ]);

  // Register commands in command palette
  logseq.App.registerCommandPalette({
    key: 'zeplin-sync',
    label: 'Zeplin: Sync from Zeplin',
  }, handleSync);

  logseq.App.registerCommandPalette({
    key: 'zeplin-configure',
    label: 'Zeplin: Open Settings',
  }, async () => {
    logseq.showSettingsUI();
  });

  logseq.App.registerCommandPalette({
    key: 'zeplin-test-connection',
    label: 'Zeplin: Test API Connection',
  }, async () => {
    const client = initializeClient();
    if (!client) {
      await logseq.UI.showMsg('Please configure your Zeplin API token first', 'warning');
      logseq.showSettingsUI();
      return;
    }

    await logseq.UI.showMsg('Testing connection...', 'info');
    const success = await client.testConnection();
    if (success) {
      await logseq.UI.showMsg('Connection successful!', 'success');
    } else {
      await logseq.UI.showMsg('Connection failed. Check console for details.', 'error');
    }
  });

  // Register slash commands for in-editor use
  logseq.Editor.registerSlashCommand('Zeplin Sync', handleSync);

  logger.info('Logseq Zeplin Sync Plugin initialized');
}

// Bootstrap
logseq.ready(main).catch(console.error);
