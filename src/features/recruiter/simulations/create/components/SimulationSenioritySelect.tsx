import type { CreateSimulationInput } from '@/features/recruiter/api';
import type { FieldErrors, FormValues } from '../utils/createFormConfig';
import { SimulationFieldError } from './SimulationFieldError';

type Props = {
  values: FormValues;
  errors: FieldErrors;
  isSubmitting: boolean;
  options: CreateSimulationInput['seniority'][];
  onChange: (
    key: keyof FormValues,
    value: string | CreateSimulationInput['seniority'],
  ) => void;
};

export function SimulationSenioritySelect({
  values,
  errors,
  isSubmitting,
  options,
  onChange,
}: Props) {
  return (
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
        value={values.seniority}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange(
            'seniority',
            e.target.value as CreateSimulationInput['seniority'],
          )
        }
        disabled={isSubmitting}
        aria-invalid={Boolean(errors.seniority)}
        aria-describedby={errors.seniority ? 'seniority-error' : undefined}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <SimulationFieldError id="seniority-error" message={errors.seniority} />
    </div>
  );
}
