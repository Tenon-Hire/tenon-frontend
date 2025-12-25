import { Task } from '../types';

type TaskHeaderProps = {
  task: Task;
};

export function TaskHeader({ task }: TaskHeaderProps) {
  return (
    <div>
      <div className="text-sm text-gray-500">
        Day {task.dayIndex} • {String(task.type)}
      </div>
      <div className="mt-1 text-2xl font-bold">{task.title}</div>
    </div>
  );
}
