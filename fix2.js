const fs = require('fs');
const path = 'C:\\Users\\abdul\\linkup\\quran\\frontend\\src\\pages\\dashboard\\StudentDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// The line now has 4 spaces before 'ext-2xl' (backslash replaced backtickt earlier)
// Search for the corrupted pattern with exact spaces
const corrupted = content.indexOf('ext-2xl font-bold tracking-tight \\}>');
if (corrupted === -1) {
  // try with just backslash
  const idx2 = content.indexOf('ext-2xl font-bold tracking-tight ');
  console.log('Pattern (no backslash) idx:', idx2);
  if (idx2 !== -1) {
    console.log('Context:', JSON.stringify(content.substring(idx2-30, idx2+60)));
  }
} else {
  // Find start of className= before this
  const start = content.lastIndexOf('className={', corrupted);
  const end = corrupted + 'ext-2xl font-bold tracking-tight \\}>'.length;
  const oldFrag = content.substring(start, end);
  console.log('Found fragment:', JSON.stringify(oldFrag));
  const newFrag = 'className={`text-2xl font-bold tracking-tight ${dm ? \'text-white\' : \'text-slate-900\'}`}>';
  content = content.substring(0, start) + newFrag + content.substring(end);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed and written!');
}
