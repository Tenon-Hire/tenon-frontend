import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const coveragePath = path.join(root, 'coverage', 'coverage-summary.json');
const coverage = fs.existsSync(coveragePath)
  ? JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
  : {};

const rows = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      rows.push(full);
    }
  }
}

walk(path.join(root, 'src'));

function areaFor(rel) {
  if (rel.includes('/app/(candidate)')) return 'candidate routes';
  if (rel.includes('/app/(recruiter)')) return 'recruiter routes';
  if (rel.includes('/app/(auth)')) return 'auth routes';
  if (rel.includes('/app/(marketing)')) return 'marketing';
  if (rel.includes('/app/api/')) return 'api route';
  if (rel.includes('/app/')) return 'app route/layout';
  if (rel.includes('/features/candidate/')) return 'candidate feature';
  if (rel.includes('/features/recruiter/')) return 'recruiter feature';
  if (rel.includes('/features/shared/')) return 'shared feature';
  if (rel.includes('/features/auth/')) return 'auth feature';
  if (rel.includes('/features/marketing/')) return 'marketing feature';
  if (rel.includes('/components/')) return 'ui components';
  if (rel.includes('/lib/server/')) return 'server utilities';
  if (rel.includes('/lib/api/')) return 'api client';
  if (rel.includes('/lib/')) return 'lib';
  if (rel.includes('/types/')) return 'types';
  return 'misc';
}

function coverageEntry(rel) {
  const abs = path.join(root, rel);
  return coverage[abs] ?? coverage[rel];
}

function status(entry) {
  if (!entry) return 'not instrumented';
  const { statements, branches, functions, lines } = entry;
  const all100 = [statements, branches, functions, lines]
    .map((s) => s?.pct === 100)
    .every(Boolean);
  if (all100) return 'covered (100%)';
  return `needs tests (S ${statements?.pct ?? 0} / B ${branches?.pct ?? 0} / F ${functions?.pct ?? 0} / L ${lines?.pct ?? 0})`;
}

function findTests(rel) {
  const withoutSrc = rel.replace(/^src\//, '');
  const aliasPattern = `@/${withoutSrc.replace(/\\/g, '/')}`.replace(/\\/g, '/');
  const base = path.basename(rel, path.extname(rel));
  const patterns = [aliasPattern.replace(/\.[^.]+$/, ''), base];
  const results = new Set();

  for (const pattern of patterns) {
    if (!pattern || pattern === 'index') continue;
    try {
      const out = execSync(
        `rg --files-with-matches --glob "*.test.*" "${pattern.replace(/"/g, '\\"')}" tests`,
        { encoding: 'utf8' },
      );
      out
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => results.add(line));
    } catch {
      /* no match */
    }
    if (results.size >= 3) break;
  }

  return Array.from(results).slice(0, 3);
}

const ledgerLines = [];
ledgerLines.push('# Coverage Ledger');
ledgerLines.push('');
ledgerLines.push(
  'Auto-generated from coverage/coverage-summary.json. Each row lists path, area, status, detected tests (up to 3), and notes. Update by running `node scripts/generate-coverage-ledger.mjs` after a coverage run.',
);
ledgerLines.push('');
ledgerLines.push('| Path | Area | Status | Tests | Notes |');
ledgerLines.push('| --- | --- | --- | --- | --- |');

rows
  .sort()
  .forEach((absPath) => {
    const rel = path.relative(root, absPath);
    const entry = coverageEntry(absPath);
    const detectedTests = findTests(rel);
    const note = path.extname(rel) === '.css' ? 'style asset' : '';
    ledgerLines.push(
      `| ${rel} | ${areaFor(rel)} | ${status(entry)} | ${
        detectedTests.length ? detectedTests.join('<br>') : '—'
      } | ${note || ''} |`,
    );
  });

fs.writeFileSync(path.join(root, 'docs', 'COVERAGE_LEDGER.md'), ledgerLines.join('\n'));

console.log('Wrote docs/COVERAGE_LEDGER.md with', rows.length, 'entries');
