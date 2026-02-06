import type { FieldErrors, FormValues } from '../utils/createFormConfig';

type Props = {
  values: FormValues;
  errors: FieldErrors;
  isSubmitting: boolean;
  onChange: (key: keyof FormValues, value: string) => void;
};

export function SimulationFocusField({
  values,
  errors,
  isSubmitting,
  onChange,
}: Props) {
  return (
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
        value={values.focus}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange('focus', e.target.value)
        }
        rows={4}
        placeholder="Optional context or what to emphasize"
        disabled={isSubmitting}
        aria-describedby={errors.focus ? 'focus-error' : undefined}
      />
      {errors.focus ? (
        <p id="focus-error" className="mt-1 text-sm text-red-700" role="alert">
          {errors.focus}
        </p>
      ) : null}
    </div>
  );
}
