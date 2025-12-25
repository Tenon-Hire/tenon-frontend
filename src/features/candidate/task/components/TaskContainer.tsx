import { ReactNode } from 'react';

type TaskContainerProps = {
  children: ReactNode;
};

export function TaskContainer({ children }: TaskContainerProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-md border bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}
