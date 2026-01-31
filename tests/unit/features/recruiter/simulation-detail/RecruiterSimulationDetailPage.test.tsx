/**
 * Tests for RecruiterSimulationDetailPage
 */
import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import RecruiterSimulationDetailPage, {
  __testables,
} from '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage';

const {
  formatDateTime,
  inviteStatusLabel,
  verificationStatusLabel,
  formatDayProgress,
  formatCooldown,
  deriveStatus,
  toTimestamp,
  toStringOrNull,
  toStringOrCsv,
  toNumberOrNull,
  toBooleanOrNull,
  parseDayIndex,
  normalizeRubric,
  normalizeSimulationPlanDay,
  extractDayTasks,
  normalizeSimulationPlan,
  safeParseResponse,
} = __testables;

// Mocks
const listSimulationCandidatesMock = jest.fn();
const listSimulationsMock = jest.fn();
const recruiterGetMock = jest.fn();
const useParamsMock = jest.fn(() => ({ id: 'sim-1' }));
const notifyMock = jest.fn();
const updateMock = jest.fn();
const inviteFlowResetMock = jest.fn();
const inviteFlowSubmitMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => useParamsMock(),
}));

jest.mock('@/lib/api/recruiter', () => ({
  listSimulationCandidates: (...args: unknown[]) =>
    listSimulationCandidatesMock(...args),
  listSimulations: (...args: unknown[]) => listSimulationsMock(...args),
  normalizeCandidateSession: (data: unknown) => data,
}));

jest.mock('@/lib/api/httpClient', () => ({
  recruiterBffClient: {
    get: (...args: unknown[]) => recruiterGetMock(...args),
  },
}));

jest.mock('@/features/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock, update: updateMock }),
}));

jest.mock(
  '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow',
  () => ({
    useInviteCandidateFlow: () => ({
      state: { status: 'idle' },
      submit: inviteFlowSubmitMock,
      reset: inviteFlowResetMock,
    }),
  }),
);

jest.mock('@/features/recruiter/invitations/InviteCandidateModal', () => ({
  InviteCandidateModal: (props: { open: boolean }) =>
    props.open ? <div data-testid="invite-modal">Modal</div> : null,
}));

describe('RecruiterSimulationDetailPage helper functions', () => {
  describe('formatDateTime', () => {
    it('returns null for null input', () => {
      expect(formatDateTime(null)).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(formatDateTime('not-a-date')).toBeNull();
    });

    it('returns formatted date for valid input', () => {
      const result = formatDateTime('2024-01-15T10:30:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('inviteStatusLabel', () => {
    it('returns Not sent for null', () => {
      expect(inviteStatusLabel(null)).toBe('Not sent');
    });

    it('handles various statuses', () => {
      expect(inviteStatusLabel('sent')).toBe('Email sent');
      expect(inviteStatusLabel('SENT')).toBe('Email sent');
      expect(inviteStatusLabel('failed')).toBe('Delivery failed');
      expect(inviteStatusLabel('rate_limited')).toBe('Rate limited');
      expect(inviteStatusLabel('unknown_status')).toBe('unknown status');
    });
  });

  describe('verificationStatusLabel', () => {
    it('returns Verified for verified true', () => {
      expect(verificationStatusLabel({ verified: true } as never)).toBe(
        'Verified',
      );
    });

    it('handles verificationStatus strings', () => {
      expect(
        verificationStatusLabel({ verificationStatus: 'verified' } as never),
      ).toBe('Verified');
      expect(
        verificationStatusLabel({ verificationStatus: 'pending' } as never),
      ).toBe('Pending');
      expect(
        verificationStatusLabel({ verificationStatus: 'required' } as never),
      ).toBe('Required');
      expect(
        verificationStatusLabel({ verificationStatus: 'failed' } as never),
      ).toBe('Failed');
      expect(
        verificationStatusLabel({
          verificationStatus: 'other_status',
        } as never),
      ).toBe('other status');
    });

    it('returns Not verified for verified false', () => {
      expect(verificationStatusLabel({ verified: false } as never)).toBe(
        'Not verified',
      );
    });

    it('returns Not verified for no verification info', () => {
      expect(verificationStatusLabel({} as never)).toBe('Not verified');
    });
  });

  describe('formatDayProgress', () => {
    it('returns null for null', () => {
      expect(formatDayProgress(null)).toBeNull();
    });

    it('returns null for zero total', () => {
      expect(formatDayProgress({ current: 0, total: 0 })).toBeNull();
    });

    it('formats progress correctly', () => {
      expect(formatDayProgress({ current: 2, total: 5 })).toBe('2 / 5');
      expect(formatDayProgress({ current: -1, total: 5 })).toBe('0 / 5');
    });
  });

  describe('formatCooldown', () => {
    it('formats cooldown time', () => {
      expect(formatCooldown(5000)).toBe('Retry in 5s');
      expect(formatCooldown(1500)).toBe('Retry in 2s');
      expect(formatCooldown(100)).toBe('Retry in 1s');
    });
  });

  describe('deriveStatus', () => {
    it('returns completed when completedAt exists', () => {
      expect(deriveStatus({ completedAt: '2024-01-01' } as never)).toBe(
        'completed',
      );
    });

    it('returns in_progress when startedAt exists', () => {
      expect(deriveStatus({ startedAt: '2024-01-01' } as never)).toBe(
        'in_progress',
      );
    });

    it('returns not_started otherwise', () => {
      expect(deriveStatus({} as never)).toBe('not_started');
    });
  });

  describe('toTimestamp', () => {
    it('returns 0 for null', () => {
      expect(toTimestamp(null)).toBe(0);
    });

    it('returns 0 for invalid date', () => {
      expect(toTimestamp('invalid')).toBe(0);
    });

    it('returns timestamp for valid date', () => {
      expect(toTimestamp('2024-01-01T00:00:00Z')).toBe(1704067200000);
    });
  });

  describe('toStringOrNull', () => {
    it('returns null for non-string', () => {
      expect(toStringOrNull(123)).toBeNull();
      expect(toStringOrNull(null)).toBeNull();
      expect(toStringOrNull(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(toStringOrNull('')).toBeNull();
      expect(toStringOrNull('   ')).toBeNull();
    });

    it('returns trimmed string', () => {
      expect(toStringOrNull('  hello  ')).toBe('hello');
    });
  });

  describe('toStringOrCsv', () => {
    it('handles string input', () => {
      expect(toStringOrCsv('hello')).toBe('hello');
    });

    it('handles array input', () => {
      expect(toStringOrCsv(['a', 'b', 'c'])).toBe('a, b, c');
      expect(toStringOrCsv(['a', '', 'c'])).toBe('a, c');
    });

    it('returns null for empty array', () => {
      expect(toStringOrCsv([])).toBeNull();
    });

    it('returns null for non-string non-array', () => {
      expect(toStringOrCsv(123)).toBeNull();
    });
  });

  describe('toNumberOrNull', () => {
    it('returns number for valid number', () => {
      expect(toNumberOrNull(42)).toBe(42);
    });

    it('parses string numbers', () => {
      expect(toNumberOrNull('42')).toBe(42);
    });

    it('returns null for invalid input', () => {
      expect(toNumberOrNull('abc')).toBeNull();
      expect(toNumberOrNull(Infinity)).toBeNull();
      expect(toNumberOrNull(null)).toBeNull();
    });
  });

  describe('toBooleanOrNull', () => {
    it('returns boolean for boolean', () => {
      expect(toBooleanOrNull(true)).toBe(true);
      expect(toBooleanOrNull(false)).toBe(false);
    });

    it('parses string booleans', () => {
      expect(toBooleanOrNull('true')).toBe(true);
      expect(toBooleanOrNull('TRUE')).toBe(true);
      expect(toBooleanOrNull('false')).toBe(false);
      expect(toBooleanOrNull('FALSE')).toBe(false);
    });

    it('returns null for other values', () => {
      expect(toBooleanOrNull('yes')).toBeNull();
      expect(toBooleanOrNull(1)).toBeNull();
    });
  });

  describe('parseDayIndex', () => {
    it('extracts day index from number', () => {
      expect(parseDayIndex(3)).toBe(3);
    });

    it('extracts day index from string', () => {
      expect(parseDayIndex('Day 2')).toBe(2);
      expect(parseDayIndex('Task_3')).toBe(3);
    });

    it('uses fallback when no match', () => {
      expect(parseDayIndex('abc', 5)).toBe(5);
    });

    it('returns 0 when no match and no fallback', () => {
      expect(parseDayIndex('abc')).toBe(0);
    });
  });

  describe('normalizeRubric', () => {
    it('handles null input', () => {
      expect(normalizeRubric(null)).toEqual({
        rubricItems: [],
        rubricText: null,
      });
    });

    it('handles array of strings', () => {
      expect(normalizeRubric(['item1', 'item2'])).toEqual({
        rubricItems: ['item1', 'item2'],
        rubricText: null,
      });
    });

    it('handles array of objects', () => {
      expect(normalizeRubric([{ text: 'criterion 1' }])).toEqual({
        rubricItems: ['criterion 1'],
        rubricText: null,
      });
    });

    it('handles string input', () => {
      expect(normalizeRubric('rubric text')).toEqual({
        rubricItems: [],
        rubricText: 'rubric text',
      });
    });

    it('handles object with text', () => {
      expect(normalizeRubric({ text: 'rubric' })).toEqual({
        rubricItems: [],
        rubricText: 'rubric',
      });
    });
  });

  describe('normalizeSimulationPlanDay', () => {
    it('returns null for non-object', () => {
      expect(normalizeSimulationPlanDay(null)).toBeNull();
      expect(normalizeSimulationPlanDay('string')).toBeNull();
    });

    it('normalizes day data', () => {
      const day = normalizeSimulationPlanDay({
        dayIndex: 2,
        title: 'Code Review',
        type: 'code',
        prompt: 'Review the code',
        rubric: ['clean code', 'tests'],
        repoUrl: 'https://github.com/test/repo',
        repoFullName: 'test/repo',
        codespaceUrl: 'https://codespace.url',
        repoProvisioned: true,
      });

      expect(day?.dayIndex).toBe(2);
      expect(day?.title).toBe('Code Review');
      expect(day?.type).toBe('code');
      expect(day?.prompt).toBe('Review the code');
      expect(day?.rubricItems).toEqual(['clean code', 'tests']);
      expect(day?.repoUrl).toBe('https://github.com/test/repo');
      expect(day?.repoName).toBe('test/repo');
      expect(day?.codespaceUrl).toBe('https://codespace.url');
      expect(day?.provisioned).toBe(true);
    });

    it('uses fallback day index', () => {
      const day = normalizeSimulationPlanDay({}, 3);
      expect(day?.dayIndex).toBe(3);
    });
  });

  describe('extractDayTasks', () => {
    it('returns empty array for no tasks', () => {
      expect(extractDayTasks({})).toEqual([]);
    });

    it('extracts tasks from array', () => {
      const tasks = extractDayTasks({
        tasks: [
          { dayIndex: 1, title: 'Task 1' },
          { dayIndex: 2, title: 'Task 2' },
        ],
      });
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('extracts tasks from nested object', () => {
      const tasks = extractDayTasks({
        plan: {
          tasks: [{ dayIndex: 1, title: 'Nested' }],
        },
      });
      expect(tasks).toHaveLength(1);
    });

    it('extracts tasks from object with day keys', () => {
      const tasks = extractDayTasks({
        days: {
          day1: { title: 'Day 1 Task' },
          day2: { title: 'Day 2 Task' },
        },
      });
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeSimulationPlan', () => {
    it('returns null for non-object', () => {
      expect(normalizeSimulationPlan(null)).toBeNull();
    });

    it('normalizes plan data', () => {
      const plan = normalizeSimulationPlan({
        title: 'Test Simulation',
        templateKey: 'template-1',
        role: 'Frontend Developer',
        techStack: ['React', 'TypeScript'],
        focus: 'Performance',
        scenario: 'Build a dashboard',
        tasks: [{ dayIndex: 1, title: 'Task 1' }],
      });

      expect(plan?.title).toBe('Test Simulation');
      expect(plan?.templateKey).toBe('template-1');
      expect(plan?.role).toBe('Frontend Developer');
      expect(plan?.techStack).toBe('React, TypeScript');
      expect(plan?.focus).toBe('Performance');
      expect(plan?.scenario).toBe('Build a dashboard');
      expect(plan?.days).toHaveLength(1);
    });

    it('extracts scenario from nested object', () => {
      const plan = normalizeSimulationPlan({
        scenario: { summary: 'Nested scenario' },
      });
      expect(plan?.scenario).toBe('Nested scenario');
    });
  });

  describe('safeParseResponse', () => {
    it('parses JSON response', async () => {
      const res = {
        headers: { get: () => 'application/json' },
        json: async () => ({ data: 'test' }),
        clone: () => res,
      } as unknown as Response;

      const result = await safeParseResponse(res);
      expect(result).toEqual({ data: 'test' });
    });

    it('handles JSON parse failure', async () => {
      const cloneRes = {
        headers: { get: () => 'text/plain' },
        text: async () => 'fallback text',
      };
      const res = {
        headers: { get: () => 'application/json' },
        json: async () => {
          throw new Error('parse error');
        },
        clone: () => cloneRes,
      } as unknown as Response;

      const result = await safeParseResponse(res);
      expect(result).toBe('fallback text');
    });

    it('parses text response', async () => {
      const res = {
        headers: { get: () => 'text/plain' },
        text: async () => 'plain text',
        clone: () => res,
      } as unknown as Response;

      const result = await safeParseResponse(res);
      expect(result).toBe('plain text');
    });

    it('handles no clone available', async () => {
      const res = {
        headers: { get: () => 'application/json' },
        json: async () => {
          throw new Error('parse error');
        },
        clone: undefined,
      } as unknown as Response;

      const result = await safeParseResponse(res);
      expect(result).toBeNull();
    });

    it('handles text parse failure with clone', async () => {
      const cloneRes = {
        text: async () => {
          throw new Error('clone text failed');
        },
      };
      const res = {
        headers: { get: () => 'text/plain' },
        text: async () => {
          throw new Error('text error');
        },
        clone: () => cloneRes,
      } as unknown as Response;

      const result = await safeParseResponse(res);
      expect(result).toBeNull();
    });
  });
});

describe('RecruiterSimulationDetailPage component', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useParamsMock.mockReturnValue({ id: 'sim-1' });
    listSimulationsMock.mockResolvedValue([
      { id: 'sim-1', title: 'Test Simulation', templateKey: 'template-1' },
    ]);
    listSimulationCandidatesMock.mockResolvedValue([]);
    recruiterGetMock.mockResolvedValue({
      title: 'Test Simulation',
      templateKey: 'template-1',
      role: 'Developer',
      techStack: 'React',
      focus: 'Testing',
      scenario: 'Build an app',
      tasks: [
        { dayIndex: 1, title: 'Day 1', type: 'text', prompt: 'Task 1' },
        {
          dayIndex: 2,
          title: 'Day 2',
          type: 'code',
          prompt: 'Task 2',
          repoProvisioned: true,
        },
        {
          dayIndex: 3,
          title: 'Day 3',
          type: 'code',
          prompt: 'Task 3',
          repoUrl: 'http://repo',
          repoName: 'test/repo',
        },
      ],
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders loading state initially', async () => {
    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    expect(screen.getByText(/5-day simulation plan/i)).toBeInTheDocument();
  });

  it('renders simulation plan details', async () => {
    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Simulation')).toBeInTheDocument();
    });

    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/React/)).toBeInTheDocument();
    expect(screen.getByText(/Testing/)).toBeInTheDocument();
  });

  it('shows no candidates message when empty', async () => {
    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No candidates yet/i)).toBeInTheDocument();
    });
  });

  it('renders candidates table when candidates exist', async () => {
    listSimulationCandidatesMock.mockResolvedValue([
      {
        candidateSessionId: 123,
        candidateName: 'John Doe',
        inviteEmail: 'john@test.com',
        status: 'IN_PROGRESS',
        startedAt: '2024-01-01T00:00:00Z',
        inviteUrl: 'http://invite',
        dayProgress: { current: 2, total: 5 },
      },
    ]);

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('handles candidate fetch error', async () => {
    listSimulationCandidatesMock.mockRejectedValue({
      status: 500,
      details: 'Server error details',
    });

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      // When error has details string, error message is "Request failed"
      expect(screen.getByText('Request failed')).toBeInTheDocument();
    });
  });

  it('handles 401 error', async () => {
    listSimulationCandidatesMock.mockRejectedValue({ status: 401 });

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
    });
  });

  it('handles 403 error', async () => {
    listSimulationCandidatesMock.mockRejectedValue({ status: 403 });

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
    });
  });

  it('opens invite modal when button clicked', async () => {
    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No candidates yet/i)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Invite your first candidate/i }),
    );

    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
  });

  it('handles search filtering', async () => {
    listSimulationCandidatesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        candidateName: 'Alice',
        inviteEmail: 'alice@test.com',
        inviteUrl: 'http://invite',
      },
      {
        candidateSessionId: 2,
        candidateName: 'Bob',
        inviteEmail: 'bob@test.com',
        inviteUrl: 'http://invite',
      },
    ]);

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Alice' } });
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });

  it('handles plan loading error', async () => {
    recruiterGetMock.mockRejectedValue(new Error('Plan load failed'));

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      // The error message comes from toUserMessage which includes the original error
      expect(screen.getByText(/Plan load failed/i)).toBeInTheDocument();
    });
  });

  it('displays days without tasks', async () => {
    recruiterGetMock.mockResolvedValue({
      title: 'Test',
      days: [{ dayIndex: 1, title: 'Day 1' }],
    });

    await act(async () => {
      render(<RecruiterSimulationDetailPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Not generated yet/).length).toBeGreaterThan(
        0,
      );
    });
  });
});
