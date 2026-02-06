import type { CreateSimulationInput } from '@/features/recruiter/api';
import { DEFAULT_TEMPLATE_KEY } from '@/lib/templateCatalog';

export type FieldErrors = Partial<
  Record<keyof CreateSimulationInput, string>
> & {
  form?: string;
};

export type FormValues = {
  title: string;
  role: string;
  techStack: string;
  seniority: CreateSimulationInput['seniority'];
  templateKey: CreateSimulationInput['templateKey'];
  focus: string;
};

export const SENIORITY_OPTIONS: CreateSimulationInput['seniority'][] = [
  'Junior',
  'Mid',
  'Senior',
];

export const initialValues: FormValues = {
  title: '',
  role: 'Backend Engineer',
  techStack: 'Node.js + Postgres',
  seniority: 'Mid',
  templateKey: DEFAULT_TEMPLATE_KEY,
  focus: '',
};

export function validateSimulationInput(
  input: CreateSimulationInput,
): FieldErrors {
  const next: FieldErrors = {};
  if (!input.title) next.title = 'Title is required.';
  if (!input.role) next.role = 'Role is required.';
  if (!input.techStack) next.techStack = 'Tech stack is required.';
  if (!input.seniority) next.seniority = 'Seniority is required.';
  if (!input.templateKey) next.templateKey = 'Template is required.';
  return next;
}
