/**
 * Logseq plugin type definitions and extensions
 */

export interface LogseqBlockProperties {
  [key: string]: string | number | boolean | undefined;
}

export interface ZeplinBlockProperties extends LogseqBlockProperties {
  'zeplin-id'?: string;
  'zeplin-type'?: 'project' | 'component' | 'screen' | 'section' | 'color' | 'text-style';
  'zeplin-updated'?: number;
  'zeplin-synced'?: number;
  'zeplin-url'?: string;
  'zeplin-platform'?: string;
}

export interface BlockCreateInput {
  content: string;
  properties?: LogseqBlockProperties;
  children?: BlockCreateInput[];
}

export interface PageCreateInput {
  name: string;
  properties?: LogseqBlockProperties;
  namespace?: string;
}

export interface SyncState {
  projectId: string;
  lastSync: number;
  itemsMapping: Record<string, string>; // zeplinId -> logseqBlockUuid
}

export interface PluginConfig {
  zeplinToken: string;
  autoSync: boolean;
  syncInterval?: number; // minutes
  defaultNamespace: string;
  imageStorage: 'inline' | 'assets';
  templateFormat: 'detailed' | 'minimal';
}
