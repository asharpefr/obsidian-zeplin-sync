/**
 * Zeplin API type definitions
 */

export interface ZeplinProject {
  id: string;
  name: string;
  description?: string;
  platform: 'web' | 'ios' | 'android' | 'macos';
  thumbnail?: string;
  status: 'active' | 'archived';
  created: number;
  updated: number;
  number_of_members: number;
  number_of_screens: number;
  number_of_components: number;
  number_of_text_styles: number;
  number_of_colors: number;
}

export interface ZeplinComponent {
  id: string;
  name: string;
  description?: string;
  image?: ZeplinAsset;
  images?: ZeplinAsset[]; // Multiple versions
  latest_version?: {
    image?: ZeplinAsset;
  };
  created: number;
  updated: number;
  section?: ZeplinSection;
  source_id?: string;
}

export interface ZeplinScreen {
  id: string;
  name: string;
  description?: string;
  image?: ZeplinAsset;
  images?: ZeplinAsset[]; // Multiple versions
  latest_version?: {
    image?: ZeplinAsset;
  };
  created: number;
  updated: number;
  section?: ZeplinSection;
  tags?: string[];
}

export interface ZeplinAsset {
  url?: string;
  original_url?: string;
  width: number;
  height: number;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

export interface ZeplinSection {
  id: string;
  name: string;
  description?: string;
}

export interface ZeplinColor {
  id: string;
  name?: string;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ZeplinTextStyle {
  id: string;
  name: string;
  font_family: string;
  font_size: number;
  font_weight: number;
  line_height?: number;
  letter_spacing?: number;
  color?: ZeplinColor;
}

export interface ZeplinApiError {
  message: string;
  detail?: string;
  status?: number;
}

export interface ZeplinPaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  offset?: number;
  limit?: number;
}
