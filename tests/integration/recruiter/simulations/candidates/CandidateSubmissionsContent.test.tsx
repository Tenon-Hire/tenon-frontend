import '../../../setup/paramsMock';
import { setMockParams } from '../../../setup/paramsMock';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CandidateSubmissionsContent from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPageClient';
import {
  getRequestUrl,
  jsonResponse,
  textResponse,
} from '../../../../setup/responseHelpers';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let anchorClickSpy: jest.SpyInstance | null = null;

describe('CandidateSubmissionsContent', () => {
  beforeAll(() => {
    anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    anchorClickSpy?.mockRestore();
  });

  it('renders available submissions for an incomplete candidate', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'jane@example.com',
            candidateName: 'Jane Doe',
            status: 'in_progress',
            startedAt: '2025-12-23T18:57:00.000000Z',
            completedAt: null,
            hasReport: false,
          },
        ]);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({
          items: [
            {
              submissionId: 6,
              candidateSessionId: 2,
              taskId: 6,
              dayIndex: 1,
              type: 'design',
              submittedAt: '2025-12-23T18:57:10.981202Z',
            },
          ],
        });
      }

      if (url === '/api/submissions/6') {
        return jsonResponse({
          submissionId: 6,
          candidateSessionId: 2,
          task: {
            taskId: 6,
            dayIndex: 1,
            type: 'design',
            title: 'Architecture & Planning',
            prompt: 'Describe your approach',
          },
          contentText: 'Here is my architecture plan...',
          code: null,
          testResults: null,
          submittedAt: '2025-12-23T18:57:10.981202Z',
        });
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    expect(screen.getByText('Loading submissions…')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(
          (content) =>
            content.includes('Day 1:') &&
            content.includes('Architecture & Planning'),
        ),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Text answer')).toBeInTheDocument();
    expect(
      screen.getByText('Here is my architecture plan...'),
    ).toBeInTheDocument();
  });

  it('renders multiple submissions and includes code content when present', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'jane@example.com',
            candidateName: 'Jane Doe',
            status: 'completed',
            startedAt: '2025-12-23T18:00:00.000000Z',
            completedAt: '2025-12-23T19:00:00.000000Z',
            hasReport: false,
          },
        ]);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({
          items: [
            {
              submissionId: 6,
              candidateSessionId: 2,
              taskId: 6,
              dayIndex: 1,
              type: 'design',
              submittedAt: '2025-12-23T18:57:10.981202Z',
            },
            {
              submissionId: 7,
              candidateSessionId: 2,
              taskId: 7,
              dayIndex: 2,
              type: 'code',
              submittedAt: '2025-12-23T18:57:19.035314Z',
            },
          ],
        });
      }

      if (url === '/api/submissions/6') {
        return jsonResponse({
          submissionId: 6,
          candidateSessionId: 2,
          task: {
            taskId: 6,
            dayIndex: 1,
            type: 'design',
            title: 'Architecture & Planning',
            prompt: null,
          },
          contentText: 'Design response',
          code: null,
          testResults: null,
          submittedAt: '2025-12-23T18:57:10.981202Z',
        });
      }

      if (url === '/api/submissions/7') {
        return jsonResponse({
          submissionId: 7,
          candidateSessionId: 2,
          task: {
            taskId: 7,
            dayIndex: 2,
            type: 'code',
            title: 'Feature Implementation',
            prompt: null,
          },
          contentText: null,
          code: {
            blob: "console.log('hello from candidate');",
            repoPath: null,
          },
          testResults: null,
          submittedAt: '2025-12-23T18:57:19.035314Z',
        });
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(
        screen.getByText(
          (content) =>
            content.includes('Day 1:') &&
            content.includes('Architecture & Planning'),
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        (content) =>
          content.includes('Day 2:') &&
          content.includes('Feature Implementation'),
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(
      screen.getByText("console.log('hello from candidate');"),
    ).toBeInTheDocument();

    const writeText = jest
      .fn()
      .mockRejectedValue(new Error('clipboard blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const createObjectURL = jest.fn().mockReturnValue('blob://mock');
    const revokeObjectURL = jest.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      writable: true,
      configurable: true,
    });

    const downloadBtn = screen.getByRole('button', { name: 'Download' });
    const copyBtn = screen.getByRole('button', { name: 'Copy code' });

    await waitFor(async () => {
      copyBtn.click();
      downloadBtn.click();
    });

    expect(writeText).toHaveBeenCalledWith(
      "console.log('hello from candidate');",
    );
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreateObjectURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: originalRevokeObjectURL,
      writable: true,
      configurable: true,
    });
  });

  it('renders empty state when candidate has no submissions', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'jane@example.com',
            candidateName: 'Jane Doe',
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            hasReport: false,
          },
        ]);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({ items: [] });
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(
        screen.getByText('No submissions yet for this candidate.'),
      ).toBeInTheDocument();
    });
  });

  it('renders error state when submissions list request fails', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          { candidateSessionId: 2, inviteEmail: 'jane@example.com' },
        ]);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({ detail: 'Detailed failure' }, 500);
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(screen.getByText('Detailed failure')).toBeInTheDocument();
    });
  });

  it('shows fallback text when no content is captured in artifact', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'jane@example.com',
            candidateName: 'Jane Doe',
            status: 'completed',
            startedAt: '2025-12-23T18:00:00.000000Z',
            completedAt: '2025-12-23T19:00:00.000000Z',
            hasReport: false,
          },
        ]);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({
          items: [
            {
              submissionId: 9,
              candidateSessionId: 2,
              taskId: 9,
              dayIndex: 3,
              type: 'design',
              submittedAt: '2025-12-23T18:57:10.981202Z',
            },
          ],
        });
      }

      if (url === '/api/submissions/9') {
        return jsonResponse({
          submissionId: 9,
          candidateSessionId: 2,
          task: {
            taskId: 9,
            dayIndex: 3,
            type: 'design',
            title: 'No Content Task',
            prompt: 'Describe nothing',
          },
          contentText: null,
          code: { blob: '   ', repoPath: null },
          testResults: null,
          submittedAt: '2025-12-23T18:57:10.981202Z',
        });
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    await waitFor(() => {
      expect(
        screen.getByText(
          (content) =>
            content.includes('Day 3:') && content.includes('No Content Task'),
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('No content captured for this submission.'),
    ).toBeInTheDocument();
  });

  it('handles missing candidate info, renders prompt/test results, and fallback artifact message', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return textResponse('no candidate', 500);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({
          items: [
            {
              submissionId: 10,
              candidateSessionId: 2,
              taskId: 10,
              dayIndex: 1,
              type: 'design',
              submittedAt: '2025-12-23T18:57:10.981202Z',
            },
            {
              submissionId: 11,
              candidateSessionId: 2,
              taskId: 11,
              dayIndex: 2,
              type: 'debug',
              submittedAt: '2025-12-23T19:57:10.981202Z',
            },
          ],
        });
      }

      if (url === '/api/submissions/10') {
        return jsonResponse({
          submissionId: 10,
          candidateSessionId: 2,
          task: {
            taskId: 10,
            dayIndex: 1,
            type: 'design',
            title: 'Prompted Task',
            prompt: 'Prompt text',
          },
          contentText: 'Answer',
          code: null,
          testResults: { passed: true },
          submittedAt: '2025-12-23T18:57:10.981202Z',
        });
      }

      if (url === '/api/submissions/11') {
        return textResponse('missing artifact', 404);
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    expect(
      await screen.findByText(/Candidate 2 — Submissions/),
    ).toBeInTheDocument();
    expect(screen.getByText(/CandidateSession: 2/)).toBeInTheDocument();
    expect(
      await screen.findByText((content) => content.includes('Prompted Task')),
    ).toBeInTheDocument();
    expect(screen.getByText('Prompt text')).toBeInTheDocument();
    expect(screen.getByText(/\"passed\": true/)).toBeInTheDocument();
    expect(screen.getByText(/content not available/i)).toBeInTheDocument();
  });

  it('surfaces thrown errors from fetch calls', async () => {
    setMockParams({ id: '9', candidateSessionId: '3' });

    const fetchMock = jest.fn(async () => {
      throw new Error('network down');
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
  });

  it('falls back to default error when fetch throws non-error value', async () => {
    setMockParams({ id: '11', candidateSessionId: '4' });
    const fetchMock = jest.fn(async () => {
      throw 'bad';
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    expect(await screen.findByText('Request failed')).toBeInTheDocument();
  });

  it('renders repo path when provided on code artifact', async () => {
    setMockParams({ id: '1', candidateSessionId: '2' });

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === '/api/simulations/1/candidates') {
        return jsonResponse([
          {
            candidateSessionId: 2,
            inviteEmail: 'jane@example.com',
            candidateName: 'Jane Doe',
            status: 'completed',
            startedAt: '2025-12-23T18:00:00.000000Z',
            completedAt: '2025-12-23T19:00:00.000000Z',
            hasReport: true,
          },
        ]);
      }

      if (url.startsWith('/api/submissions?candidateSessionId=2')) {
        return jsonResponse({
          items: [
            {
              submissionId: 12,
              candidateSessionId: 2,
              taskId: 12,
              dayIndex: 4,
              type: 'code',
              submittedAt: '2025-12-23T18:57:10.981202Z',
            },
          ],
        });
      }

      if (url === '/api/submissions/12') {
        return jsonResponse({
          submissionId: 12,
          candidateSessionId: 2,
          task: {
            taskId: 12,
            dayIndex: 4,
            type: 'code',
            title: 'Path Task',
            prompt: null,
          },
          contentText: null,
          code: {
            blob: "console.log('path');",
            repoPath: 'src/index.ts',
          },
          testResults: null,
          submittedAt: '2025-12-23T18:57:10.981202Z',
        });
      }

      return textResponse('Not found', 404);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CandidateSubmissionsContent />);

    expect(await screen.findByText(/Path Task/)).toBeInTheDocument();
    expect(screen.getByText(/src\/index\.ts/)).toBeInTheDocument();
  });
});
