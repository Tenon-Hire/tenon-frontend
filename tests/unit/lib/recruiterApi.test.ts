import { recruiterBffClient } from '@/lib/api/httpClient';
import {
  inviteCandidate,
  listSimulations,
  createSimulation,
} from '@/lib/api/recruiter';

jest.mock('@/lib/api/httpClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  recruiterBffClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

type MockGet = (path: string, options?: unknown) => Promise<unknown>;
type MockPost = (
  path: string,
  body?: unknown,
  options?: unknown,
) => Promise<unknown>;

const mockedApiGet = jest.requireMock('@/lib/api/httpClient').apiClient
  .get as jest.MockedFunction<MockGet>;
const mockedApiPost = jest.requireMock('@/lib/api/httpClient').apiClient
  .post as jest.MockedFunction<MockPost>;
const mockedBffGet =
  recruiterBffClient.get as unknown as jest.MockedFunction<MockGet>;
const mockedBffPost =
  recruiterBffClient.post as unknown as jest.MockedFunction<MockPost>;

describe('recruiterApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const originalApiBase = process.env.NEXT_PUBLIC_TENON_API_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_TENON_API_BASE_URL = originalApiBase;
  });

  describe('listSimulations', () => {
    it('calls GET /simulations', async () => {
      mockedBffGet.mockResolvedValueOnce([]);

      await listSimulations();

      expect(mockedBffGet).toHaveBeenCalledWith('/simulations', undefined);
      expect(mockedApiGet).not.toHaveBeenCalled();
    });

    it('returns empty array when response is not an array', async () => {
      mockedBffGet.mockResolvedValueOnce({});

      const result = await listSimulations();

      expect(result).toEqual([]);
    });

    it('normalizes camelCase fields', async () => {
      mockedBffGet.mockResolvedValueOnce([
        {
          id: 'sim_1',
          title: 'Sim One',
          role: 'Backend Engineer',
          createdAt: '2025-12-10T10:00:00Z',
          candidateCount: 3,
        },
      ]);

      const result = await listSimulations();

      expect(result).toEqual([
        {
          id: 'sim_1',
          title: 'Sim One',
          role: 'Backend Engineer',
          createdAt: '2025-12-10T10:00:00Z',
          candidateCount: 3,
        },
      ]);
    });

    it('normalizes snake_case fields', async () => {
      mockedBffGet.mockResolvedValueOnce([
        {
          id: 'sim_2',
          title: 'Sim Two',
          role: 'Backend Engineer',
          created_at: '2025-12-11T10:00:00Z',
          candidate_count: 1,
        },
      ]);

      const result = await listSimulations();

      expect(result[0]?.id).toBe('sim_2');
      expect(result[0]?.title).toBe('Sim Two');
      expect(result[0]?.role).toBe('Backend Engineer');
      expect(result[0]?.createdAt).toBe('2025-12-11T10:00:00Z');
      expect(result[0]?.candidateCount).toBe(1);
    });

    it('falls back safely when item is not an object', async () => {
      mockedBffGet.mockResolvedValueOnce([null]);

      const result = await listSimulations();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Untitled simulation');
      expect(result[0]?.role).toBe('Unknown role');
      expect(typeof result[0]?.createdAt).toBe('string');
    });

    it('keeps recruiter calls on BFF even with absolute NEXT_PUBLIC_TENON_API_BASE_URL', async () => {
      process.env.NEXT_PUBLIC_TENON_API_BASE_URL =
        'https://backend.example.com/api';
      mockedBffGet.mockResolvedValueOnce([]);

      await listSimulations();

      expect(mockedBffGet).toHaveBeenCalledWith('/simulations', undefined);
      expect(mockedApiGet).not.toHaveBeenCalled();
    });
  });

  describe('inviteCandidate', () => {
    it('calls POST /simulations/{id}/invite with candidateName + inviteEmail', async () => {
      mockedBffPost.mockResolvedValueOnce({
        candidateSessionId: 'cs_1',
        token: 'tok_1',
        inviteUrl: 'http://localhost:3000/candidate/session/tok_1',
      });

      await inviteCandidate('sim_1', 'Jane Doe', 'jane@example.com');

      expect(mockedBffPost).toHaveBeenCalledWith('/simulations/sim_1/invite', {
        candidateName: 'Jane Doe',
        inviteEmail: 'jane@example.com',
      });
      expect(mockedApiPost).not.toHaveBeenCalled();
    });

    it('normalizes invite response (camelCase)', async () => {
      mockedBffPost.mockResolvedValueOnce({
        candidateSessionId: 'cs_1',
        token: 'tok_1',
        inviteUrl: 'http://localhost:3000/candidate/session/tok_1',
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
      });
    });

    it('normalizes invite response (snake_case)', async () => {
      mockedBffPost.mockResolvedValueOnce({
        candidate_session_id: 'cs_2',
        token: 'tok_2',
        invite_url: 'http://localhost:3000/candidate/session/tok_2',
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
      });
    });

    it('returns blanks when response is not an object', async () => {
      mockedBffPost.mockResolvedValueOnce('not-an-object');

      const result = await inviteCandidate(
        'sim_3',
        'Jane Doe',
        'jane@example.com',
      );

      expect(result).toEqual({
        candidateSessionId: '',
        token: '',
        inviteUrl: '',
      });
    });

    it('returns blanks when any input is empty after trimming', async () => {
      const result = await inviteCandidate('   ', '   ', '   ');
      expect(result).toEqual({
        candidateSessionId: '',
        token: '',
        inviteUrl: '',
      });
      expect(mockedBffPost).not.toHaveBeenCalled();
    });
  });

  describe('createSimulation', () => {
    it('returns blank id when required fields are missing', async () => {
      const result = await createSimulation({
        title: '',
        role: ' ',
        techStack: '',
        seniority: 'Mid',
      });

      expect(result).toEqual({
        id: '',
        ok: false,
        status: 400,
        message: 'Missing required fields',
      });
      expect(mockedBffPost).not.toHaveBeenCalled();
    });

    it('posts trimmed payload and returns normalized id', async () => {
      mockedBffPost.mockResolvedValueOnce({ id: 'sim_99' });

      const result = await createSimulation({
        title: '  Backend Sim ',
        role: ' Backend ',
        techStack: ' Node ',
        seniority: 'Senior',
        focus: '  Focus ',
      });

      expect(mockedBffPost).toHaveBeenCalledWith(
        '/simulations',
        {
          title: 'Backend Sim',
          role: 'Backend',
          techStack: 'Node',
          seniority: 'Senior',
          focus: 'Focus',
        },
        {
          cache: undefined,
          signal: undefined,
        },
      );

      expect(result).toEqual({
        id: 'sim_99',
        ok: true,
        status: 201,
        message: undefined,
      });
      expect(mockedApiPost).not.toHaveBeenCalled();
    });

    it('normalizes snake_case id responses', async () => {
      mockedBffPost.mockResolvedValueOnce({ simulation_id: 42 });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
      });

      expect(result).toEqual({
        id: '42',
        ok: true,
        status: 201,
        message: undefined,
      });
    });

    it('omits focus field when blank after trimming', async () => {
      mockedBffPost.mockResolvedValueOnce({ id: 'sim_200' });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
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
      mockedBffPost.mockResolvedValueOnce({ id: 'sim_env' });

      const result = await createSimulation({
        title: 'Env Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
      });

      expect(mockedBffPost).toHaveBeenCalledWith(
        '/simulations',
        expect.any(Object),
        expect.objectContaining({ cache: undefined, signal: undefined }),
      );
      expect(result.id).toBe('sim_env');
    });

    it('returns structured error when backend responds with failure', async () => {
      mockedBffPost.mockRejectedValueOnce({
        message: 'Missing title',
        status: 400,
      });

      const result = await createSimulation({
        title: 'Sim Name',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
      });

      expect(result).toMatchObject({
        ok: false,
        status: 400,
        message: 'Missing title',
        id: '',
      });
    });
  });

  it('normalizes candidateCount across numeric variants', async () => {
    mockedBffGet.mockResolvedValueOnce([
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
    ]);

    const result = await listSimulations();

    expect(result[0]?.candidateCount).toBe(7);
    expect(result[1]?.candidateCount).toBe(8);
  });
});
