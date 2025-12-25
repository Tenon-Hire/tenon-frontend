import { useEffect, useRef, useState } from 'react';
import {
  clearCodeDraftForTask,
  clearTextDraft,
  loadCodeDraftForTask,
  loadTextDraft,
  saveCodeDraftForTask,
  saveTextDraft,
} from './drafts';
import { isCodeTask, isTextTask, isSubmitResponse } from './utils';

type SubmitPayload = { contentText?: string; codeBlob?: string };

export function useTaskDrafts(
  task: { id: number; type: string },
  candidateSessionId: number,
) {
  const codeTask = isCodeTask(task.type);
  const textTask = isTextTask(task.type);
  const [text, setText] = useState<string>(() =>
    textTask ? loadTextDraft(task.id) : '',
  );
  const [code, setCode] = useState<string>(() => {
    if (!codeTask) return '';
    const draft = loadCodeDraftForTask(candidateSessionId, task.id);
    return draft ?? '// start here\n';
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      if (textTask) saveTextDraft(task.id, text);
      if (codeTask) saveCodeDraftForTask(candidateSessionId, task.id, code);
    }, 350);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [candidateSessionId, code, codeTask, task.id, text, textTask]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setSavedAt(null);
    if (textTask) setText(loadTextDraft(task.id));
    if (codeTask) {
      const draft = loadCodeDraftForTask(candidateSessionId, task.id);
      setCode(draft ?? '// start here\n');
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
    if (codeTask) clearCodeDraftForTask(candidateSessionId, task.id);
  };

  return {
    text,
    setText,
    code,
    setCode,
    savedAt,
    saveDraftNow,
    clearDrafts,
    codeTask,
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
