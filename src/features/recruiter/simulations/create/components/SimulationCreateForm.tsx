import Button from '@/shared/ui/Button';
import type { CreateSimulationInput } from '@/features/recruiter/api';
import type { FieldErrors, FormValues } from '../utils/createFormConfig';
import { SimulationCreateTextFields } from './SimulationCreateTextFields';
import { SimulationCreateOptions } from './SimulationCreateOptions';

type Props = {
  values: FormValues;
  errors: FieldErrors;
  isSubmitting: boolean;
  seniorityOptions: CreateSimulationInput['seniority'][];
  onChange: (
    key: keyof FormValues,
    value: string | CreateSimulationInput['seniority'],
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function SimulationCreateForm({
  values,
  errors,
  isSubmitting,
  seniorityOptions,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  return (
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

      <SimulationCreateTextFields
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        onChange={(key, value) => onChange(key, value)}
      />

      <SimulationCreateOptions
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        seniorityOptions={seniorityOptions}
        onChange={onChange}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create simulation'}
        </Button>
      </div>
    </form>
  );
}
