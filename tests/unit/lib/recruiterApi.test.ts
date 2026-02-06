import {
  inviteCandidate,
  listSimulations,
  createSimulation,
  normalizeCandidateSession,
  listSimulationCandidates,
} from '@/features/recruiter/api';

const mockRecruiterRequest = jest.fn();
const mockSafeRequest = jest.fn();
const mockRecruiterBffGet = jest.fn();

jest.mock('@/lib/api/client', () => ({
  bffClient: { get: jest.fn(), post: jest.fn() },
  recruiterBffClient: {
    get: (...args: unknown[]) => mockRecruiterBffGet(...args),
  },
  safeRequest: (...args: unknown[]) => mockSafeRequest(...args),
}));

jest.mock('@/features/recruiter/api/requestRecruiterBff', () => ({
  requestRecruiterBff: (...args: unknown[]) => mockRecruiterRequest(...args),
  recruiterBffClient: {
    get: (...args: unknown[]) => mockRecruiterBffGet(...args),
  },
}));

const mockedRecruiterGet = mockRecruiterBffGet as jest.MockedFunction<
  (path: string, options?: unknown) => Promise<unknown>
>;

describe('recruiterApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const originalApiBase = process.env.NEXT_PUBLIC_TENON_API_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_TENON_API_BASE_URL = originalApiBase;
  });

  describe('listSimulations', () => {
    it('calls GET /simulations via requestRecruiterBff', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({ data: [], requestId: null });

      await listSimulations();

      expect(mockRecruiterRequest).toHaveBeenCalledWith(
        '/simulations',
        expect.objectContaining({ cache: undefined }),
      );
    });

    it('returns empty array when response is not an array', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({ data: {}, requestId: null });

      const result = await listSimulations();

      expect(result).toEqual([]);
    });

    it('normalizes simulation fields', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: [
          {
            id: 'sim_2',
            title: 'Sim Two',
            role: 'Backend Engineer',
            created_at: '2025-12-11T10:00:00Z',
            candidate_count: 1,
            template_key: 'node-express-ts',
          },
        ],
        requestId: null,
      });

      const result = await listSimulations();

      expect(result[0]?.id).toBe('sim_2');
      expect(result[0]?.candidateCount).toBe(1);
      expect(result[0]?.templateKey).toBe('node-express-ts');
    });
  });

  describe('listSimulationsSafe', () => {
    it('calls safeRequest with BFF base and skipAuth', async () => {
      mockSafeRequest.mockResolvedValueOnce({ data: [], error: null });

      const { listSimulationsSafe } = await import('@/features/recruiter/api');
      await listSimulationsSafe();

      expect(mockSafeRequest).toHaveBeenCalledWith('/simulations', undefined, {
        basePath: '/api',
        skipAuth: true,
      });
    });
  });

  describe('inviteCandidate', () => {
    it('calls POST /simulations/{id}/invite with candidateName + inviteEmail', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: {
          candidateSessionId: 'cs_1',
          token: 'tok_1',
          inviteUrl: 'http://localhost:3000/candidate/session/tok_1',
          outcome: 'created',
        },
        requestId: null,
      });

      await inviteCandidate('sim_1', 'Jane Doe', 'jane@example.com');

      expect(mockRecruiterRequest).toHaveBeenCalledWith(
        '/simulations/sim_1/invite',
        {
          method: 'POST',
          body: { candidateName: 'Jane Doe', inviteEmail: 'jane@example.com' },
        },
      );
    });

    it('normalizes invite response (camelCase)', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: {
          candidateSessionId: 'cs_1',
          token: 'tok_1',
          inviteUrl: 'http://localhost:3000/candidate/session/tok_1',
          outcome: 'created',
        },
        requestId: null,
      });

      const result = await inviteCandidate(
        'sim_1',
        'Jane Doe',
        'jane@example.com',
      );

      expect(result).toEqual({
        candidateSessionId: 'cs_1',
        token: 'tok_1',
        inviteUrl: 'http://localhost:3000/candidate/session/tok_1',
        outcome: 'created',
      });
    });

    it('normalizes invite response (snake_case)', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: {
          candidate_session_id: 'cs_2',
          token: 'tok_2',
          invite_url: 'http://localhost:3000/candidate/session/tok_2',
        },
        requestId: null,
      });

      const result = await inviteCandidate(
        'sim_2',
        'Jane Doe',
        'jane@example.com',
      );

      expect(result).toEqual({
        candidateSessionId: 'cs_2',
        token: 'tok_2',
        inviteUrl: 'http://localhost:3000/candidate/session/tok_2',
        outcome: 'created',
      });
    });

    it('builds inviteUrl from token when missing and window is undefined', async () => {
      const globalAny = globalThis as Record<string, unknown>;
      const originalWindow = globalAny.window as Window | undefined;
      delete globalAny.window;

      mockRecruiterRequest.mockResolvedValueOnce({
        data: {
          candidate_session_id: 'cs_3',
          token: 'tok_3',
          invite_url: '',
        },
        requestId: null,
      });

      const result = await inviteCandidate(
        'sim_3',
        'Jane Doe',
        'jane@example.com',
      );

      expect(result.inviteUrl).toBe('/candidate/session/tok_3');
      expect(result.outcome).toBe('created');

      if (originalWindow) {
        globalAny.window = originalWindow;
      }
    });

    it('returns blanks when response is not an object', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: 'not-an-object',
        requestId: null,
      });

      const result = await inviteCandidate(
        'sim_3',
        'Jane Doe',
        'jane@example.com',
      );

      expect(result).toEqual({
        candidateSessionId: '',
        token: '',
        inviteUrl: '',
        outcome: 'created',
      });
    });

    it('returns blanks when any input is empty after trimming', async () => {
      const result = await inviteCandidate('   ', '   ', '   ');
      expect(result).toEqual({
        candidateSessionId: '',
        token: '',
        inviteUrl: '',
        outcome: 'created',
      });
      expect(mockRecruiterRequest).not.toHaveBeenCalled();
    });

    it('guards against non-string inputs without throwing', async () => {
      const result = await inviteCandidate(
        { bad: true } as unknown as string,
        { value: 'Name' } as unknown as string,
        { value: 'Email' } as unknown as string,
      );

      expect(result).toEqual({
        candidateSessionId: '',
        token: '',
        inviteUrl: '',
        outcome: 'created',
      });
      expect(mockRecruiterRequest).not.toHaveBeenCalled();
    });
  });

  describe('listSimulationCandidates', () => {
    it('dedupes in-flight requests', async () => {
      let resolveFetch: (value: unknown) => void = () => undefined;
      const pending = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      mockedRecruiterGet.mockReturnValueOnce(
        pending.then((data) => ({ ok: true, data })) as Promise<unknown>,
      );

      const first = listSimulationCandidates('sim_1');
      const second = listSimulationCandidates('sim_1');

      expect(mockedRecruiterGet).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);

      resolveFetch([]);
      await first;
    });

    it('returns cached data within TTL window', async () => {
      mockedRecruiterGet.mockResolvedValueOnce([
        { candidate_session_id: 1, status: 'not_started' },
      ]);

      const first = await listSimulationCandidates('sim_2');
      const second = await listSimulationCandidates('sim_2');

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
      expect(mockedRecruiterGet).toHaveBeenCalledTimes(1);
    });

    it('clears cache on errors and retries', async () => {
      mockedRecruiterGet.mockRejectedValueOnce(new Error('fail'));
      await expect(listSimulationCandidates('sim_3')).rejects.toThrow('fail');

      mockedRecruiterGet.mockResolvedValueOnce([]);
      await listSimulationCandidates('sim_3');
      expect(mockedRecruiterGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('normalizeCandidateSession', () => {
    it('normalizes snake_case fields and builds inviteUrl fallback', () => {
      const globalAny = globalThis as Record<string, unknown>;
      const originalWindow = globalAny.window as Window | undefined;
      delete globalAny.window;

      const result = normalizeCandidateSession({
        candidate_session_id: 12,
        invite_email: 'test@example.com',
        candidate_name: 'Test User',
        status: 'not_started',
        invite_token: 'tok_12',
        invite_url: '',
        invite_email_status: 'sent',
        invite_email_sent_at: '2025-01-01T00:00:00Z',
        report_ready: true,
        report_id: 'r-12',
      });

      expect(result.candidateSessionId).toBe(12);
      expect(result.inviteUrl).toBe('/candidate/session/tok_12');
      expect(result.inviteEmailStatus).toBe('sent');
      expect(result.reportReady).toBe(true);
      expect(result.reportId).toBe('r-12');

      if (originalWindow) {
        globalAny.window = originalWindow;
      }
    });

    it('builds inviteUrl with window origin and normalizes verification', () => {
      const globalAny = globalThis as Record<string, unknown>;
      const originalWindow = globalAny.window as Window | undefined;
      globalAny.window = {
        location: { origin: 'https://app.test' },
      } as Window;

      const result = normalizeCandidateSession({
        candidateSessionId: '7',
        inviteEmail: 'test@example.com',
        candidateName: 'Test User',
        sessionStatus: 'in_progress',
        inviteToken: 'tok_7',
        inviteUrl: '',
        email_verified: true,
        progress: { current: '1', total: '3' },
      });

      expect(result.inviteUrl).toBe('https://app.test/candidate/session/tok_7');
      expect(result.verified).toBe(true);
      expect(result.dayProgress).toEqual({ current: 1, total: 3 });

      if (originalWindow) {
        globalAny.window = originalWindow;
      } else {
        delete globalAny.window;
      }
    });

    it('handles empty and invalid candidate session payloads', () => {
      const empty = normalizeCandidateSession(null);
      expect(empty.candidateSessionId).toBe(0);
      expect(empty.status).toBe('not_started');

      const invalid = normalizeCandidateSession({
        id: 'NaN',
        progress: { current: 'x', total: 'y' },
      });
      expect(invalid.candidateSessionId).toBe(0);
      expect(invalid.dayProgress).toBeNull();
    });
  });

  describe('createSimulation', () => {
    it('returns blank id when required fields are missing', async () => {
      const result = await createSimulation({
        title: '',
        role: ' ',
        techStack: '',
        seniority: 'Mid',
        templateKey: 'python-fastapi',
      });

      expect(result).toEqual({
        id: '',
        ok: false,
        status: 400,
        message: 'Missing required fields',
      });
      expect(mockRecruiterRequest).not.toHaveBeenCalled();
    });

    it('posts trimmed payload and returns normalized id', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: { id: 'sim_99' },
        requestId: null,
      });

      const result = await createSimulation({
        title: '  Backend Sim ',
        role: ' Backend ',
        techStack: ' Node ',
        seniority: 'Senior',
        templateKey: 'node-express-ts',
        focus: '  Focus ',
      });

      expect(mockRecruiterRequest).toHaveBeenCalledWith(
        '/simulations',
        expect.objectContaining({
          method: 'POST',
          body: {
            title: 'Backend Sim',
            role: 'Backend',
            techStack: 'Node',
            seniority: 'Senior',
            templateKey: 'node-express-ts',
            focus: 'Focus',
          },
        }),
      );

      expect(result).toEqual({
        id: 'sim_99',
        ok: true,
        status: 201,
        message: undefined,
      });
    });

    it('normalizes snake_case id responses', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: { simulation_id: 42 },
        requestId: null,
      });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        templateKey: 'python-fastapi',
      });

      expect(result).toEqual({
        id: '42',
        ok: true,
        status: 201,
        message: undefined,
      });
    });

    it('omits focus field when blank after trimming', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: { id: 'sim_200' },
        requestId: null,
      });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        templateKey: 'python-fastapi',
        focus: '   ',
      });

      expect(result).toEqual({
        id: 'sim_200',
        ok: true,
        status: 201,
        message: undefined,
      });
    });

    it('posts to BFF base even when public API base is absolute', async () => {
      process.env.NEXT_PUBLIC_TENON_API_BASE_URL =
        'https://backend.example.com/api';
      mockRecruiterRequest.mockResolvedValueOnce({
        data: { id: 'sim_env' },
        requestId: null,
      });

      const result = await createSimulation({
        title: 'Env Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        templateKey: 'python-fastapi',
      });

      expect(result.id).toBe('sim_env');
    });

    it('returns structured error when backend responds with failure', async () => {
      mockRecruiterRequest.mockRejectedValueOnce({
        message: 'Missing title',
        status: 400,
      });

      const result = await createSimulation({
        title: 'Sim Name',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        templateKey: 'python-fastapi',
      });

      expect(result).toMatchObject({
        ok: false,
        status: 400,
        message: 'Missing title',
        id: '',
      });
    });

    it('normalizes explicit error responses from backend payloads', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: { status: 409, detail: 'Conflict', simulation_id: null },
        requestId: null,
      });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        templateKey: 'python-fastapi',
      });

      expect(result).toEqual({
        id: '',
        ok: false,
        status: 409,
        message: 'Conflict',
      });
    });
  });

  describe('resendInvite', () => {
    it('returns null when identifiers are missing', async () => {
      const { resendInvite } = await import('@/features/recruiter/api');
      await expect(resendInvite('', NaN)).resolves.toBeNull();
    });

    it('posts resend invite when identifiers are valid', async () => {
      mockRecruiterRequest.mockResolvedValueOnce({
        data: { ok: true },
        requestId: null,
      });
      const { resendInvite } = await import('@/features/recruiter/api');
      await resendInvite('sim_9', 42);

      expect(mockRecruiterRequest).toHaveBeenCalledWith(
        '/simulations/sim_9/candidates/42/invite/resend',
        { method: 'POST' },
      );
    });
  });

  it('normalizes candidateCount across numeric variants', async () => {
    mockRecruiterRequest.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          simulation_title: 'A',
          role_name: 'R',
          created_at: '2025-01-01',
          numCandidates: 7,
        },
        {
          id: 2,
          simulation_title: 'B',
          role_name: 'R',
          created_at: '2025-01-02',
          num_candidates: 8,
        },
      ],
      requestId: null,
    });

    const result = await listSimulations();

    expect(result[0]?.candidateCount).toBe(7);
    expect(result[1]?.candidateCount).toBe(8);
  });
});
