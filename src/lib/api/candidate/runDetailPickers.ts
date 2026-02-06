type Source = Record<string, unknown>;

export const buildSources = (rec: Source): Source[] =>
  [
    rec,
    rec.summary as Source | undefined,
    rec.testSummary as Source | undefined,
    rec.test_summary as Source | undefined,
  ].filter(Boolean) as Source[];

export const pickFirst = (sources: Source[], keys: string[]): unknown => {
  for (const src of sources) for (const k of keys) if (k in src) return src[k];
  return undefined;
};
