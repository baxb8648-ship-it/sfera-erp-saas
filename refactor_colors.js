import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const REPLACEMENTS = {
  'bg-[#0F0F11]/90': 'bg-bg/90',
  'bg-[#0F0F11]/95': 'bg-bg/95',
  'bg-[#0F0F11]': 'bg-bg',
  'text-white': 'text-text',
  'text-gray-400': 'text-text-muted',
  'text-zinc-400': 'text-text-muted',
  'text-zinc-300': 'text-text-muted',
  'bg-white/5': 'bg-surface',
  'bg-zinc-900/50': 'bg-surface',
  'bg-zinc-900': 'bg-surface',
  'border-white/5': 'border-border',
  'border-white/10': 'border-border',
  'border-zinc-800': 'border-border',
  'text-[#F95700]': 'text-primary',
  'bg-[#F95700]': 'bg-primary'
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const [search, replace] of Object.entries(REPLACEMENTS)) {
        // use regex to avoid partial matches
        const regex = new RegExp(`(?<=[\\s"'\\\`])` + search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `(?=[\\s"'\\\`])`, 'g');
        content = content.replace(regex, replace);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

walkDir(SRC_DIR);
console.log('Color refactoring complete.');
