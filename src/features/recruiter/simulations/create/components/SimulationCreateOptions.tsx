import type { CreateSimulationInput } from '@/features/recruiter/api';
import type { FieldErrors, FormValues } from '../utils/createFormConfig';
import { SimulationFocusField } from './SimulationFocusField';
import { SimulationSenioritySelect } from './SimulationSenioritySelect';
import { SimulationTemplateSelect } from './SimulationTemplateSelect';

type Props = {
  values: FormValues;
  errors: FieldErrors;
  isSubmitting: boolean;
  seniorityOptions: CreateSimulationInput['seniority'][];
  onChange: (
    key: keyof FormValues,
    value: string | CreateSimulationInput['seniority'],
  ) => void;
};

export function SimulationCreateOptions({
  values,
  errors,
  isSubmitting,
  seniorityOptions,
  onChange,
}: Props) {
  return (
    <>
      <SimulationSenioritySelect
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        options={seniorityOptions}
        onChange={onChange}
      />
      <SimulationTemplateSelect
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        onChange={onChange}
      />
      <SimulationFocusField
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        onChange={onChange}
      />
    </>
  );
}
