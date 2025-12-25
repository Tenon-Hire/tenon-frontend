import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  CandidateSessionProvider,
  useCandidateSession,
} from '@/features/candidate/session/CandidateSessionProvider';

const STORAGE_KEY = 'simuhire:candidate_session_v1';

function Harness() {
  const {
    state,
    setToken,
    setStarted,
    setTaskLoading,
    setTaskError,
    clearTaskError,
    setTaskLoaded,
    reset,
  } = useCandidateSession();

  return (
    <div>
      <div data-testid="token">{state.token ?? 'none'}</div>
      <div data-testid="started">{String(state.started)}</div>
      <div data-testid="task-error">{state.taskState.error ?? 'none'}</div>
      <button onClick={() => setToken('tok_abc')}>set-token</button>
      <button onClick={() => setStarted(true)}>start</button>
      <button
        onClick={() => {
          setTaskLoading();
          setTaskLoaded({
            isComplete: false,
            completedTaskIds: [1],
            currentTask: null,
          });
        }}
      >
        load-task
      </button>
      <button
        onClick={() => {
          setTaskError('boom');
        }}
      >
        err
      </button>
      <button onClick={() => clearTaskError()}>clear-err</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <CandidateSessionProvider>
      <Harness />
    </CandidateSessionProvider>,
  );
}

describe('CandidateSessionProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('restores persisted token/bootstrap/started state from sessionStorage', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'persisted-token',
        bootstrap: {
          candidateSessionId: 10,
          status: 'in_progress',
          simulation: { title: 'Sim', role: 'Backend' },
        },
        started: true,
      }),
    );

    renderHarness();

    expect(screen.getByTestId('token')).toHaveTextContent('persisted-token');
    expect(screen.getByTestId('started')).toHaveTextContent('true');
  });

  it('persists updates to sessionStorage when state changes', () => {
    renderHarness();

    fireEvent.click(screen.getByText('set-token'));
    fireEvent.click(screen.getByText('start'));
    fireEvent.click(screen.getByText('load-task'));

    const persisted = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(persisted.token).toBe('tok_abc');
    expect(persisted.started).toBe(true);
  });

  it('handles storage errors gracefully without throwing', () => {
    const getItemSpy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    expect(() => renderHarness()).not.toThrow();
    getItemSpy.mockRestore();
  });

  it('can set and clear task errors via context helpers', () => {
    renderHarness();

    fireEvent.click(screen.getByText('err'));
    expect(screen.getByTestId('task-error')).toHaveTextContent('boom');

    fireEvent.click(screen.getByText('clear-err'));
    expect(screen.getByTestId('task-error')).toHaveTextContent('none');
  });

  it('resets state back to initial values', () => {
    renderHarness();

    fireEvent.click(screen.getByText('set-token'));
    fireEvent.click(screen.getByText('reset'));

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(screen.getByTestId('started')).toHaveTextContent('false');
  });
});
