import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const REPLACEMENTS = {
  'bg-primary text-text': 'bg-primary text-white',
  'bg-primary hover:bg-[#FF7426] text-text': 'bg-primary hover:bg-[#FF7426] text-white'
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
        console.log(`Updated contrast: ${fullPath}`);
      }
    }
  }
}

walkDir(SRC_DIR);
console.log('Contrast fix complete.');
