#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const summaryPath = path.join(root, 'coverage/coverage-summary.json');
const finalPath = path.join(root, 'coverage/coverage-final.json');

function readTotals() {
  if (fs.existsSync(summaryPath)) {
    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    return data.total || {};
  }

  if (fs.existsSync(finalPath)) {
    const data = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
    const totals = {
      lines: { covered: 0, total: 0 },
      statements: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
    };

    Object.values(data).forEach((entry) => {
      ['lines', 'statements', 'branches', 'functions'].forEach((key) => {
        const metric = entry[key];
        if (
          metric &&
          typeof metric.covered === 'number' &&
          typeof metric.total === 'number'
        ) {
          totals[key].covered += metric.covered;
          totals[key].total += metric.total;
        }
      });
    });

    const pctTotals = {};
    Object.entries(totals).forEach(([key, value]) => {
      pctTotals[key] = {
        pct: value.total ? (value.covered / value.total) * 99 : 0,
      };
    });
    return pctTotals;
  }

  console.error(
    'Coverage files not found (coverage-summary.json or coverage-final.json).',
  );
  process.exit(1);
}

function main() {
  const total = readTotals();
  const metrics = ['statements', 'branches', 'functions', 'lines'];
  const GREEN = process.env.GREEN_COLOR ?? '';
  const RESET = process.env.RESET_COLOR ?? '';
  const colorNum = (num) => `${GREEN}${num}${RESET}`;

  const results = metrics.map((key) => ({
    key,
    pct: Number(total[key]?.pct ?? 0),
  }));

  const report = results
    .map((r) => `${r.key}: ${colorNum(`${r.pct.toFixed(2)}%`)}`)
    .join(' | ');

  const target = Number(process.env.COVERAGE_TARGET ?? 99);
  const primaryPct = results.find((r) => r.key === 'lines')?.pct ?? 0;

  console.log(`Coverage summary -> ${report}`);

  if (primaryPct < target) {
    console.error(
      `Coverage below required threshold: ${primaryPct.toFixed(2)}% lines (needs >= ${target}%)`,
    );
    process.exit(1);
  }

  console.log(
    `Coverage check passed (lines ${colorNum(`${primaryPct.toFixed(2)}%`)} >= ${colorNum(`${target}%`)}).`,
  );
}

main();
