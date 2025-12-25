type TaskDescriptionProps = {
  description: string;
};

export function TaskDescription({ description }: TaskDescriptionProps) {
  return (
    <div className="mt-4 whitespace-pre-wrap text-sm text-gray-800">
      {description}
    </div>
  );
}
