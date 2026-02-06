import { TEMPLATE_OPTIONS } from '@/lib/templateCatalog';
import type { FieldErrors, FormValues } from '../utils/createFormConfig';
import { SimulationFieldError } from './SimulationFieldError';

type Props = {
  values: FormValues;
  errors: FieldErrors;
  isSubmitting: boolean;
  onChange: (key: keyof FormValues, value: string) => void;
};

export function SimulationTemplateSelect({
  values,
  errors,
  isSubmitting,
  onChange,
}: Props) {
  return (
    <div>
      <label
        htmlFor="templateKey"
        className="text-xs font-medium uppercase tracking-wide text-gray-500"
      >
        Template
      </label>
      <select
        id="templateKey"
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        value={values.templateKey}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange('templateKey', e.target.value)
        }
        disabled={isSubmitting}
        aria-invalid={Boolean(errors.templateKey)}
        aria-describedby={errors.templateKey ? 'templateKey-error' : undefined}
      >
        {TEMPLATE_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label} ({opt.key})
          </option>
        ))}
      </select>
      <SimulationFieldError
        id="templateKey-error"
        message={errors.templateKey}
      />
    </div>
  );
}
