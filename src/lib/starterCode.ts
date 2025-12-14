export function getStarterCodeForTask(params: { dayIndex?: number; taskType: string }) {
  const { dayIndex, taskType } = params;

  const base = `// Welcome to SimuHire.\n// Implement the task requirements below.\n\nexport function handler() {\n  return "TODO";\n}\n`;

  if (taskType === "debug") {
    return `// Debug task\n// Fix failing tests.\n\n${base}`;
  }

  if (dayIndex === 2) return `// Day 2 — Implementation\n\n${base}`;
  if (dayIndex === 3) return `// Day 3 — Iteration / New requirement\n\n${base}`;
  if (dayIndex === 4) return `// Day 4 — Debugging\n\n${base}`;

  return base;
}
