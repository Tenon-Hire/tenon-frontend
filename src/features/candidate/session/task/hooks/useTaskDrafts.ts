import { useEffect, useRef, useState } from 'react';
import {
  clearTextDraft,
  loadTextDraft,
  saveTextDraft,
} from '../utils/draftStorage';
import { isGithubNativeDay, isTextTask } from '../utils/taskGuards';

type TaskSummary = { id: number; type: string; dayIndex: number };

export function useTaskDrafts(task: TaskSummary) {
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
