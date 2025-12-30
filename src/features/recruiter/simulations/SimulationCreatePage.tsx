'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PageHeader from '@/components/ui/PageHeader';
import {
  createSimulation,
  type CreateSimulationInput,
} from '@/lib/api/recruiter';

type FieldErrors = Partial<Record<keyof CreateSimulationInput, string>> & {
  form?: string;
};

type HttpishError = {
  status?: number;
  response?: { status?: number };
  body?: { message?: string; detail?: string };
  message?: string;
};

const SENIORITY_OPTIONS: CreateSimulationInput['seniority'][] = [
  'Junior',
  'Mid',
  'Senior',
];

export default function SimulationCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState<string>('');
  const [role, setRole] = useState<string>('Backend Engineer');
  const [techStack, setTechStack] = useState<string>('Node.js + Postgres');
  const [seniority, setSeniority] =
    useState<CreateSimulationInput['seniority']>('Mid');
  const [focus, setFocus] = useState<string>('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const payload: CreateSimulationInput = useMemo(
    () => ({
      title: title.trim(),
      role: role.trim(),
      techStack: techStack.trim(),
      seniority,
      focus: focus.trim() ? focus.trim() : undefined,
    }),
    [title, role, techStack, seniority, focus],
  );

  function validate(input: CreateSimulationInput): FieldErrors {
    const next: FieldErrors = {};
    if (!input.title) next.title = 'Title is required.';
    if (!input.role) next.role = 'Role is required.';
    if (!input.techStack) next.techStack = 'Tech stack is required.';
    if (!input.seniority) next.seniority = 'Seniority is required.';
    return next;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors = validate(payload);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await createSimulation(payload);

      if (!res.id) {
        setErrors({ form: 'Simulation created but no id was returned.' });
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (caught: unknown) {
      const err = caught as HttpishError;
      const status = err.status ?? err.response?.status;

      if (status === 401) {
        router.push('/auth/login');
        return;
      }

      const message =
        err.body?.message ??
        err.body?.detail ??
        err.message ??
        'Failed to create simulation. Please try again.';

      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-6 py-8">
      <PageHeader
        title="New Simulation"
        subtitle="Create a new 5-day simulation."
        actions={
          <Button type="button" onClick={() => router.push('/dashboard')}>
            Back
          </Button>
        }
      />

      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
        {errors.form ? (
          <div
            className="rounded border border-red-200 bg-red-50 p-3"
            role="alert"
          >
            <p className="text-sm font-medium text-red-700">
              Couldn’t create simulation
            </p>
            <p className="text-sm text-red-700">{errors.form}</p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="title"
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Title
          </label>
          <Input
            id="title"
            className="mt-1 w-full"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTitle(e.target.value)
            }
            placeholder="Backend Engineer — Payments API"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.title ? (
            <p
              id="title-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {errors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="role"
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Role
          </label>
          <Input
            id="role"
            className="mt-1 w-full"
            value={role}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRole(e.target.value)
            }
            placeholder="Backend Engineer"
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'role-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.role ? (
            <p
              id="role-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {errors.role}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="techStack"
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Tech stack
          </label>
          <Input
            id="techStack"
            className="mt-1 w-full"
            value={techStack}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTechStack(e.target.value)
            }
            placeholder="Node.js + Postgres"
            aria-invalid={Boolean(errors.techStack)}
            aria-describedby={errors.techStack ? 'techStack-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.techStack ? (
            <p
              id="techStack-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {errors.techStack}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="seniority"
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Seniority
          </label>
          <select
            id="seniority"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={seniority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSeniority(e.target.value as CreateSimulationInput['seniority'])
            }
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.seniority)}
            aria-describedby={errors.seniority ? 'seniority-error' : undefined}
          >
            {SENIORITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.seniority ? (
            <p
              id="seniority-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {errors.seniority}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="focus"
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Focus / notes (optional)
          </label>
          <textarea
            id="focus"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={focus}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFocus(e.target.value)
            }
            rows={4}
            placeholder="Optional context or what to emphasize"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={() => router.push('/dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create simulation'}
          </Button>
        </div>
      </form>
    </main>
  );
}
