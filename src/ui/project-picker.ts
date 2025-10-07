/**
 * Project picker UI
 */

import type { ZeplinProject } from '../types/zeplin';

/**
 * Show a project picker dialog
 */
export async function showProjectPicker(projects: ZeplinProject[]): Promise<string | null> {
  if (projects.length === 0) {
    await logseq.UI.showMsg('No Zeplin projects found', 'warning');
    return null;
  }

  // For now, use a simple HTML dialog
  // In the future, we can make this more sophisticated
  const html = `
    <div style="padding: 20px; max-width: 600px;">
      <h2 style="margin-top: 0;">Select Zeplin Project</h2>
      <div style="margin-bottom: 20px;">
        <select id="project-select" style="width: 100%; padding: 8px; font-size: 14px;">
          <option value="">-- Select a project --</option>
          ${projects.map(p => `
            <option value="${p.id}">
              ${p.name} (${p.platform}) - ${p.number_of_screens} screens, ${p.number_of_components} components
            </option>
          `).join('')}
        </select>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-btn" style="padding: 8px 16px; cursor: pointer;">Cancel</button>
        <button id="sync-btn" style="padding: 8px 16px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">Sync</button>
      </div>
    </div>
  `;

  return new Promise((resolve) => {
    logseq.provideUI({
      key: 'zeplin-project-picker',
      template: html,
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--ls-primary-background-color)',
        border: '1px solid var(--ls-border-color)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 999,
      },
    });

    // Wait for DOM to be ready
    setTimeout(() => {
      const selectEl = parent.document.getElementById('project-select') as HTMLSelectElement;
      const syncBtn = parent.document.getElementById('sync-btn');
      const cancelBtn = parent.document.getElementById('cancel-btn');

      const cleanup = () => {
        logseq.provideUI({ key: 'zeplin-project-picker', template: '' });
      };

      syncBtn?.addEventListener('click', () => {
        const projectId = selectEl?.value;
        if (!projectId) {
          logseq.UI.showMsg('Please select a project', 'warning');
          return;
        }
        cleanup();
        resolve(projectId);
      });

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
    }, 100);
  });
}

/**
 * Show project info as a formatted list
 */
export function formatProjectInfo(project: ZeplinProject): string {
  return `
**${project.name}**
- Platform: ${project.platform}
- Screens: ${project.number_of_screens}
- Components: ${project.number_of_components}
- Colors: ${project.number_of_colors}
- Text Styles: ${project.number_of_text_styles}
- Status: ${project.status}
`.trim();
}
