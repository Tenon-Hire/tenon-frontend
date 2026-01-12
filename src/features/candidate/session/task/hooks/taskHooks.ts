import { useEffect, useRef, useState } from 'react';
import {
  clearTextDraft,
  loadTextDraft,
  saveTextDraft,
} from '../utils/draftStorage';
import {
  isGithubNativeDay,
  isTextTask,
  isSubmitResponse,
} from '../utils/taskGuards';

type SubmitPayload = { contentText?: string };

export function useTaskDrafts(task: {
  id: number;
  type: string;
  dayIndex: number;
}) {
  const githubNative = isGithubNativeDay(task.dayIndex);
  const textTask = !githubNative && isTextTask(task.type);
  const [text, setText] = useState<string>(() =>
    textTask ? loadTextDraft(task.id) : '',
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      if (textTask) saveTextDraft(task.id, text);
    }, 350);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [task.id, text, textTask]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setSavedAt(null);
    if (textTask) {
      setText(loadTextDraft(task.id));
    } else {
      setText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const saveDraftNow = () => {
    if (!textTask) return;
    saveTextDraft(task.id, text);
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 1500);
  };

  const clearDrafts = () => {
    if (textTask) clearTextDraft(task.id);
  };

  return {
    text,
    setText,
    savedAt,
    saveDraftNow,
    clearDrafts,
    textTask,
  };
}

type SubmitStatus = 'idle' | 'submitting' | 'submitted';

export function useSubmitHandler(
  onSubmit: (payload: SubmitPayload) => Promise<unknown> | unknown,
) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [lastProgress, setLastProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const submittedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submittedTimerRef.current)
        window.clearTimeout(submittedTimerRef.current);
    };
  }, []);

  const handleSubmit = async (payload: SubmitPayload) => {
    if (submitStatus !== 'idle') return { status: 'busy' };

    setSubmitStatus('submitting');
    try {
      const resp = await onSubmit(payload);
      if (isSubmitResponse(resp)) {
        setLastProgress(resp.progress);
        setSubmitStatus('submitted');
        submittedTimerRef.current = window.setTimeout(() => {
          setSubmitStatus('idle');
          setLastProgress(null);
        }, 900);
      } else {
        setSubmitStatus('idle');
      }
      return resp;
    } catch {
      setSubmitStatus('idle');
      return 'submit-failed';
    }
  };

  return { submitStatus, lastProgress, handleSubmit };
}
