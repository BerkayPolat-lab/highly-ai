import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AI Text Likelihood',
  version: '0.1.0',
  action: { default_popup: 'src/ui/popup/index.html' },
  side_panel: { default_path: 'src/ui/sidepanel/index.html' },
  background: { service_worker: 'src/background/sw.ts', type: 'module' },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
  commands: {
    'toggle-ai-likelihood-panel': {
      suggested_key: { default: 'Ctrl+Shift+1', mac: 'Command+Shift+1' },
      description: 'Open AI Likelihood side panel'
    }
  },
  host_permissions: ['https://your-api.example.com/*'],
  icons: { '16': 'public/icon16.png', '48': 'public/icon48.png', '128': 'public/icon128.png' },
  // web_accessible_resources: [
  //   { resources: ['src/content/content.js'], matches: ['<all_urls>'] }
  // ]
});