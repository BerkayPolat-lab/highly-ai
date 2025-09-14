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
  permissions: ["storage", "identity", "activeTab", "scripting", "tabs", "sidePanel" , "offscreen"],
  commands: {
    'toggle-ai-likelihood-panel': {
      suggested_key: { default: 'Ctrl+Shift+L', mac: 'Command+Shift+L' },
      description: 'Open AI Likelihood side panel'
    }
  },
  host_permissions: [
    "https://apis.google.com/*",
    "https://www.googleapis.com/*",
    "https://www.gstatic.com/*",
    "https://securetoken.googleapis.com/*",
    "http://localhost:5173/*",
    "http://127.0.0.1:8080/*",
    "http://127.0.0.1:5173/*",
    "http://localhost:3001/*",
    "https://localhost:3001/*"
  ],
  icons: { '16': 'public/icon16.png', '48': 'public/icon48.png', '128': 'public/icon128.png' },
  web_accessible_resources: [
    {
      resources: ["auth.html"],
      matches: ['<all_urls>']
    }
  ], 
  content_security_policy: {
    'extension_pages': "script-src 'self'; object-src 'self'; " +
    "connect-src 'self' https://accounts.google.com https://apis.google.com " +
    "https://www.googleapis.com https://www.gstatic.com https://securetoken.googleapis.com " +
    "http://localhost:5173 ws://localhost:5173 http://127.0.0.1:5173 " +
    "http://localhost:3001 https://localhost:3001 http://127.0.0.1:8080; " +
    "frame-src http://localhost:3001 https://localhost:3001;"
  }
});