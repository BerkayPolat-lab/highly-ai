import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AI Text Likelihood',
  version: '0.1.0',
  action: { default_popup: 'index.html' },
  side_panel: { default_path: 'src/ui/sidepanel/index.html' },
  background: { service_worker: 'src/background/sw.ts', type: 'module' },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ["storage", "identity", "activeTab", "scripting", "tabs", "sidePanel"],
  commands: {
    'toggle-ai-likelihood-panel': {
      suggested_key: { default: 'Ctrl+Shift+L', mac: 'Command+Shift+L' },
      description: 'Open AI Likelihood side panel'
    }
  },
  host_permissions: ['<all_urls>'],
  icons: { '16': 'public/icon16.png', '48': 'public/icon48.png', '128': 'public/icon128.png' },
  web_accessible_resources: [
    {
      resources: ["auth.html"],
      matches: ['<all_urls>']
    }
  ]
});