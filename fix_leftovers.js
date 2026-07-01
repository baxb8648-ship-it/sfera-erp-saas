import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const REPLACEMENTS = {
  'bg-[#121214]': 'bg-surface',
  'bg-[#18181B]': 'bg-surface',
  'text-gray-300': 'text-text',
  'text-gray-500': 'text-text-muted',
  'text-gray-600': 'text-text-muted',
  'border-[#F95700]': 'border-primary',
  'text-white/5': 'text-border',
  'text-white/40': 'text-text-muted',
  'text-white/50': 'text-text-muted'
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
        content = content.replaceAll(search, replace);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated leftovers: ${fullPath}`);
      }
    }
  }
}

walkDir(SRC_DIR);
console.log('Leftovers fix complete.');
