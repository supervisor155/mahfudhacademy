const fs = require('fs');
const path = 'C:\\Users\\abdul\\linkup\\quran\\frontend\\src\\pages\\dashboard\\StudentDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: section className (backtick template literal removed, conditional collapsed to \)
const old1 = 'className={overflow-hidden rounded-4xl shadow-[0_24px_60px_rgba(31,74,71,0.20)] \\}>';
const new1 = "className={`overflow-hidden rounded-4xl shadow-[0_24px_60px_rgba(31,74,71,0.20)] ${dm ? 'bg-gradient-to-br from-[#1a2e2b] via-[#132420] to-[#0f1c1a]' : 'bg-gradient-to-br from-[#1f4a47] via-[#2d5a56] to-[#1a3b38]'}`}>";
if (content.includes(old1)) {
  content = content.replace(old1, new1);
  console.log('Fix 1 applied: section className');
} else {
  console.log('Fix 1 NOT FOUND - searching for partial...');
  const idx = content.indexOf('className={overflow-hidden');
  if (idx !== -1) {
    console.log('  Found at idx', idx, ':', JSON.stringify(content.substring(idx, idx+120)));
  }
}

// Fix 2: template literal for enrolled count
const old2 = ': \\ class\\ enrolled}';
const new2 = ': `${classes.length} class${classes.length !== 1 ? \'es\' : \'\'} enrolled`}';
if (content.includes(old2)) {
  content = content.replace(old2, new2);
  console.log('Fix 2 applied: enrolled count');
} else {
  // try with single backslash
  const old2b = ': \\ class\\ enrolled}';
  console.log('Fix 2 NOT FOUND, searching variants...');
  const idx = content.indexOf('class\\ enrolled');
  const idx2 = content.indexOf('class\\\\ enrolled');
  const idx3 = content.indexOf('enrolled');
  console.log('  enrolled idx:', idx3, '  context:', JSON.stringify(content.substring(Math.max(0,idx3-20), idx3+20)));
}

// Fix 3: stats div className (multi-line corruption with newline between { and ounded)
const old3a = 'className={\nounded-3xl bg-gradient-to-br \\ p-5 shadow-[0_8px_20px_rgba(17,24,39,0.06)] \\ \\}';
const old3b = 'className={\r\nounded-3xl bg-gradient-to-br \\ p-5 shadow-[0_8px_20px_rgba(17,24,39,0.06)] \\ \\}';
const new3 = "className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-5 shadow-[0_8px_20px_rgba(17,24,39,0.06)] ${dm ? 'border border-[#283038]' : ''} ${s.action ? 'cursor-pointer transition hover:shadow-[0_12px_28px_rgba(17,24,39,0.10)] active:scale-[0.98]' : ''}`}";
if (content.includes(old3a)) {
  content = content.replace(old3a, new3);
  console.log('Fix 3a applied: stats div className (LF)');
} else if (content.includes(old3b)) {
  content = content.replace(old3b, new3);
  console.log('Fix 3b applied: stats div className (CRLF)');
} else {
  console.log('Fix 3 NOT FOUND, searching for ounded...');
  const idx = content.indexOf('ounded-3xl');
  if (idx !== -1) {
    console.log('  Found at idx', idx, ':', JSON.stringify(content.substring(idx-30, idx+120)));
  }
}

// Fix 4: icon div className
const old4 = 'className={mb-3 flex h-9 w-9 items-center justify-center rounded-xl \\}>';
const new4 = 'className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.tone}`}>';
if (content.includes(old4)) {
  content = content.replace(old4, new4);
  console.log('Fix 4 applied: icon div className');
} else {
  console.log('Fix 4 NOT FOUND');
  const idx = content.indexOf('mb-3 flex h-9');
  if (idx !== -1) console.log('  Context:', JSON.stringify(content.substring(idx-15, idx+80)));
}

// Fix 5: p text-2xl className (spaces before "ext")
// The corruption has spaces/tab before "ext" instead of "t"
const old5 = 'className={        ext-2xl font-bold tracking-tight \\}>';
const new5 = 'className={`text-2xl font-bold tracking-tight ${dm ? \'text-white\' : \'text-slate-900\'}`}>';
if (content.includes(old5)) {
  content = content.replace(old5, new5);
  console.log('Fix 5 applied: text-2xl className');
} else {
  console.log('Fix 5 NOT FOUND, searching variants...');
  const idx = content.indexOf('ext-2xl font-bold');
  if (idx !== -1) console.log('  Context:', JSON.stringify(content.substring(idx-25, idx+60)));
}

// Fix 6: p mt-0.5 className
const old6 = 'className={mt-0.5 text-xs font-medium \\}>';
const new6 = 'className={`mt-0.5 text-xs font-medium ${muted}`}>';
if (content.includes(old6)) {
  content = content.replace(old6, new6);
  console.log('Fix 6 applied: mt-0.5 className');
} else {
  console.log('Fix 6 NOT FOUND');
  const idx = content.indexOf('mt-0.5 text-xs font-medium');
  if (idx !== -1) console.log('  Context:', JSON.stringify(content.substring(idx-15, idx+60)));
}

fs.writeFileSync(path, content, 'utf8');
console.log('\nFile written successfully!');
