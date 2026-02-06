import { useState } from 'react';
import {
  createSimulation,
  type CreateSimulationInput,
} from '@/features/recruiter/api';
import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  buildReturnTo,
} from '@/lib/auth/routing';
import { toUserMessage } from '@/lib/errors/errors';
import {
  SENIORITY_OPTIONS,
  initialValues,
  validateSimulationInput,
  type FieldErrors,
  type FormValues,
} from '../utils/createFormConfig';

export function useSimulationCreateForm(onSuccess: (id: string) => void) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const payload: CreateSimulationInput = {
      title: values.title.trim(),
      role: values.role.trim(),
      techStack: values.techStack.trim(),
      seniority: values.seniority,
      templateKey: values.templateKey,
      focus: values.focus.trim() ? values.focus.trim() : undefined,
    };

    const nextErrors = validateSimulationInput(payload);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await createSimulation(payload);

      if (!res.ok || !res.id) {
        const status = res.status ?? null;
        const returnTo = buildReturnTo();
        if (status === 401) {
          window.location.assign(buildLoginUrl('recruiter', returnTo));
          return;
        }
        if (status === 403) {
          window.location.assign(buildNotAuthorizedUrl('recruiter', returnTo));
          return;
        }
        const fallback = res.message
          ? res.message
          : !res.ok
            ? 'Unable to create simulation right now.'
            : 'Simulation created but no id was returned.';
        setErrors({ form: fallback });
        return;
      }

      onSuccess(res.id);
    } catch (caught: unknown) {
      setErrors({
        form: toUserMessage(
          caught,
          'Failed to create simulation. Please try again.',
          { includeDetail: true },
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    errors,
    isSubmitting,
    setField,
    handleSubmit,
    seniorityOptions: SENIORITY_OPTIONS,
  };
}
