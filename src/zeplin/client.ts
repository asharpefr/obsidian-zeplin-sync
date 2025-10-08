/**
 * Zeplin API Client
 * Handles all interactions with the Zeplin REST API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ZeplinProject,
  ZeplinComponent,
  ZeplinScreen,
  ZeplinColor,
  ZeplinTextStyle,
  ZeplinSection,
  ZeplinApiError,
} from '../types/zeplin';
import { logger } from '../utils/logger';

const ZEPLIN_API_BASE = 'https://api.zeplin.dev/v1';

export class ZeplinClient {
  private client: AxiosInstance;

  constructor(token: string) {
    this.client = axios.create({
      baseURL: ZEPLIN_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ZeplinApiError>) => {
        return this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError<ZeplinApiError>): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      logger.error(`Zeplin API Error [${status}]:`, message);

      switch (status) {
        case 401:
          throw new Error('Invalid Zeplin API token. Please check your settings.');
        case 403:
          throw new Error('Access forbidden. Check your project permissions.');
        case 404:
          throw new Error('Resource not found.');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        default:
          throw new Error(`Zeplin API error: ${message}`);
      }
    } else if (error.request) {
      logger.error('No response from Zeplin API:', error.message);
      throw new Error('Unable to reach Zeplin API. Check your internet connection.');
    } else {
      logger.error('Request error:', error.message);
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Get all projects accessible with the current token
   */
  async getProjects(): Promise<ZeplinProject[]> {
    try {
      logger.info('Fetching Zeplin projects...');
      const response = await this.client.get<ZeplinProject[]>('/projects');
      logger.info(`Found ${response.data.length} projects`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<ZeplinProject> {
    try {
      logger.info(`Fetching project: ${projectId}`);
      const response = await this.client.get<ZeplinProject>(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get all components for a project
   */
  async getComponents(projectId: string): Promise<ZeplinComponent[]> {
    try {
      logger.info(`Fetching components for project: ${projectId}`);
      const response = await this.client.get<ZeplinComponent[]>(
        `/projects/${projectId}/components`,
        {
          params: {
            include_linked_project: true
          }
        }
      );
      logger.info(`Found ${response.data.length} components`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch components for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific component by ID
   */
  async getComponent(projectId: string, componentId: string): Promise<ZeplinComponent> {
    try {
      logger.info(`Fetching component: ${componentId}`);
      const response = await this.client.get<ZeplinComponent>(
        `/projects/${projectId}/components/${componentId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch component ${componentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all screens for a project
   */
  async getScreens(projectId: string): Promise<ZeplinScreen[]> {
    try {
      logger.info(`Fetching screens for project: ${projectId}`);
      const response = await this.client.get<ZeplinScreen[]>(
        `/projects/${projectId}/screens`,
        {
          params: {
            include_linked_project: true
          }
        }
      );
      logger.info(`Found ${response.data.length} screens`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch screens for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific screen by ID
   */
  async getScreen(projectId: string, screenId: string): Promise<ZeplinScreen> {
    try {
      logger.info(`Fetching screen: ${screenId}`);
      const response = await this.client.get<ZeplinScreen>(
        `/projects/${projectId}/screens/${screenId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch screen ${screenId}:`, error);
      throw error;
    }
  }

  /**
   * Get all colors for a project
   */
  async getColors(projectId: string): Promise<ZeplinColor[]> {
    try {
      logger.info(`Fetching colors for project: ${projectId}`);
      const response = await this.client.get<ZeplinColor[]>(
        `/projects/${projectId}/colors`
      );
      logger.info(`Found ${response.data.length} colors`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch colors for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get all text styles for a project
   */
  async getTextStyles(projectId: string): Promise<ZeplinTextStyle[]> {
    try {
      logger.info(`Fetching text styles for project: ${projectId}`);
      const response = await this.client.get<ZeplinTextStyle[]>(
        `/projects/${projectId}/text_styles`
      );
      logger.info(`Found ${response.data.length} text styles`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch text styles for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get all sections for a project
   */
  async getSections(projectId: string): Promise<ZeplinSection[]> {
    try {
      logger.info(`Fetching sections for project: ${projectId}`);
      const response = await this.client.get<ZeplinSection[]>(
        `/projects/${projectId}/screen_sections`
      );
      logger.info(`Found ${response.data.length} sections`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch sections for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Test the connection and token validity
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Zeplin API connection...');
      await this.getProjects();
      logger.info('Connection successful');
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }
}
