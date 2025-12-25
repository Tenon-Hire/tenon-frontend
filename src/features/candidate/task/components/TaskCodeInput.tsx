import CodeEditor from '@/components/ui/CodeEditor';

type TaskCodeInputProps = {
  code: string;
  onChange: (value: string) => void;
};

export function TaskCodeInput({ code, onChange }: TaskCodeInputProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">
        File: <span className="font-medium text-gray-700">index.ts</span>
      </div>
      <CodeEditor value={code} onChange={onChange} language="typescript" />
      <div className="text-xs text-gray-500">
        Draft auto-saves locally while you type (refresh-safe until you submit).
      </div>
    </div>
  );
}
