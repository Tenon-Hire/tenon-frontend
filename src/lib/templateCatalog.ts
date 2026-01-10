export const DEFAULT_TEMPLATE_KEY = 'python-fastapi' as const;

export const TEMPLATE_OPTIONS = [
  { key: 'python-fastapi', label: 'Python (FastAPI)' },
  { key: 'node-express-ts', label: 'Node.js (Express, TS)' },
  { key: 'node-nest-ts', label: 'Node.js (NestJS, TS)' },
  { key: 'java-springboot', label: 'Java (Spring Boot)' },
  { key: 'go-gin', label: 'Go (Gin)' },
  { key: 'dotnet-webapi', label: '.NET (Web API)' },
  { key: 'monorepo-nextjs-nest', label: 'Monorepo (Next.js + NestJS)' },
  { key: 'monorepo-nextjs-fastapi', label: 'Monorepo (Next.js + FastAPI)' },
  { key: 'monorepo-react-express', label: 'Monorepo (React + Express)' },
  {
    key: 'monorepo-react-springboot',
    label: 'Monorepo (React + Spring Boot)',
  },
  {
    key: 'mobile-fullstack-expo-fastapi',
    label: 'Mobile Fullstack (Expo + FastAPI)',
  },
  { key: 'mobile-backend-fastapi', label: 'Mobile Backend (FastAPI)' },
  { key: 'ml-backend-fastapi', label: 'ML Backend (FastAPI)' },
  { key: 'ml-infra-mlops', label: 'ML Infra / MLOps' },
] as const;

export type TemplateKey = (typeof TEMPLATE_OPTIONS)[number]['key'];
