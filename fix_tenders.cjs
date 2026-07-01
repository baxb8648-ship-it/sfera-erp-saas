const fs = require('fs');

let code = fs.readFileSync('c:/projects/АКЗ/src/crm/pages/Tenders.tsx', 'utf8');

// 1. Remove activeTab state
code = code.replace(/  const \[activeTab, setActiveTab\] = useState<'board' \| 'templates'>\('board'\);\n/g, '');

// 2. Remove the tabs rendering (lines around 680 to 700)
code = code.replace(/      <div className="flex space-x-1 bg-white dark:bg-zinc-900[\s\S]*?<\/div>\n\n/g, '');

// 3. Remove `{activeTab === 'board' && (` opening
code = code.replace(/      \{activeTab === 'board' && \(\n        <div className="space-y-6">\n/g, '      <div className="space-y-6">\n');

// 4. Everything after the kanban board (which ends around line 835) down to the first modal `TENDER DETAILED CARD MODAL` needs to be replaced.
// Look for `{/* Quick info panel */}` and the closing tag before it, then `activeTab === 'templates'` block.
// Basically, from the `      )}\n\n                          onClick={() => handleDeletePlatform` down to `{/* 1. TENDER DETAILED CARD MODAL */}`
code = code.replace(/      \}\)\n\n                          onClick=\(\) => handleDeletePlatform[\s\S]*?\{\/\* 1\. TENDER DETAILED CARD MODAL \*\/\}/g, '      )}\n\n      {/* 1. TENDER DETAILED CARD MODAL */}');

fs.writeFileSync('c:/projects/АКЗ/src/crm/pages/Tenders.tsx', code);
console.log("Fixed Tenders.tsx");
