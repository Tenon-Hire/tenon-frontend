type Props = { id: string; message?: string | null };

export function SimulationFieldError({ id, message }: Props) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}
