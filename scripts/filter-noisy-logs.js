// Ensures third-party baseline data staleness warnings don't spam CI output.
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA =
  process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ?? 'true';
process.env.BROWSERSLIST_IGNORE_OLD_DATA =
  process.env.BROWSERSLIST_IGNORE_OLD_DATA ?? 'true';

const shouldFilter = (value) =>
  typeof value === 'string' && value.includes('baseline-browser-mapping');

const originalWarn = console.warn;
console.warn = (...args) => {
  if (shouldFilter(args[0])) return;
  originalWarn(...args);
};
