// Regenerate the readable salary examples after updating a calculator's rates or tax table.
// node scripts/salary-examples.cjs [--check]
// Runs only the local calculation definitions and chart renderer; needs no browser or packages.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
for (const relative of ['tools/salary/index.html', 'en/tools/salary/index.html']) {
  const file = path.join(root, relative);
  const html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf('const TBL=');
  const end = html.indexOf("let mode='y'", start);
  const chartStart = html.indexOf('const list=[2000,');
  const chartEnd = html.indexOf("}).join('');", chartStart) + "}).join('');".length;
  if (start < 0 || end < start || chartStart < 0 || chartEnd < chartStart) {
    throw new Error('Calculator structure changed: ' + relative);
  }
  const code = html.slice(start, end) + '\nconst output={innerHTML:""}; const $=()=>output;\n'
    + html.slice(chartStart, chartEnd) + '\noutput.innerHTML;';
  const rows = vm.runInNewContext(code, {}, { timeout: 1000 });
  if ((rows.match(/<tr\b/g) || []).length !== 16) throw new Error('Expected 16 example rows');
  const match = html.match(/<tbody id="chart">[\s\S]*?<\/tbody>/);
  if (!match) throw new Error('Missing chart tbody');
  const replacement = '<tbody id="chart">' + rows + '</tbody>';
  if (process.argv.includes('--check')) {
    if (match[0] !== replacement) throw new Error('Stale salary examples: ' + relative);
  } else {
    fs.writeFileSync(file, html.replace(match[0], replacement));
  }
  console.log(relative + ': 16 examples ' + (process.argv.includes('--check') ? 'verified' : 'updated'));
}
