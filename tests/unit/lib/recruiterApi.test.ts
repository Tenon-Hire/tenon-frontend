import { apiClient } from '@/lib/api/httpClient';
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
}));

type MockGet = (path: string) => Promise<unknown>;
type MockPost = (path: string, body?: unknown) => Promise<unknown>;

const mockedGet = apiClient.get as unknown as jest.MockedFunction<MockGet>;
const mockedPost = apiClient.post as unknown as jest.MockedFunction<MockPost>;

describe('recruiterApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('listSimulations', () => {
    it('calls GET /simulations', async () => {
      mockedGet.mockResolvedValueOnce([]);

      await listSimulations();

      expect(mockedGet).toHaveBeenCalledWith('/simulations');
    });

    it('returns empty array when response is not an array', async () => {
      mockedGet.mockResolvedValueOnce({});

      const result = await listSimulations();

      expect(result).toEqual([]);
    });

    it('normalizes camelCase fields', async () => {
      mockedGet.mockResolvedValueOnce([
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
      mockedGet.mockResolvedValueOnce([
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
      mockedGet.mockResolvedValueOnce([null]);

      const result = await listSimulations();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Untitled simulation');
      expect(result[0]?.role).toBe('Unknown role');
      expect(typeof result[0]?.createdAt).toBe('string');
    });
  });

  describe('inviteCandidate', () => {
    it('calls POST /simulations/{id}/invite with candidateName + inviteEmail', async () => {
      mockedPost.mockResolvedValueOnce({
        candidateSessionId: 'cs_1',
        token: 'tok_1',
        inviteUrl: 'http://localhost:3000/candidate/session/tok_1',
      });

      await inviteCandidate('sim_1', 'Jane Doe', 'jane@example.com');

      expect(mockedPost).toHaveBeenCalledWith('/simulations/sim_1/invite', {
        candidateName: 'Jane Doe',
        inviteEmail: 'jane@example.com',
      });
    });

    it('normalizes invite response (camelCase)', async () => {
      mockedPost.mockResolvedValueOnce({
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
      mockedPost.mockResolvedValueOnce({
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
      mockedPost.mockResolvedValueOnce('not-an-object');

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
      expect(mockedPost).not.toHaveBeenCalled();
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

      expect(result).toEqual({ id: '' });
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('posts trimmed payload and returns normalized id', async () => {
      mockedPost.mockResolvedValueOnce({ id: 'sim_99' });

      const result = await createSimulation({
        title: '  Backend Sim ',
        role: ' Backend ',
        techStack: ' Node ',
        seniority: 'Senior',
        focus: '  Focus ',
      });

      expect(mockedPost).toHaveBeenCalledWith('/simulations', {
        title: 'Backend Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Senior',
        focus: 'Focus',
      });

      expect(result).toEqual({ id: 'sim_99' });
    });

    it('normalizes snake_case id responses', async () => {
      mockedPost.mockResolvedValueOnce({ simulation_id: 42 });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
      });

      expect(result).toEqual({ id: '42' });
    });

    it('omits focus field when blank after trimming', async () => {
      mockedPost.mockResolvedValueOnce({ id: 'sim_200' });

      const result = await createSimulation({
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        focus: '   ',
      });

      expect(mockedPost).toHaveBeenCalledWith('/simulations', {
        title: 'Sim',
        role: 'Backend',
        techStack: 'Node',
        seniority: 'Junior',
        focus: undefined,
      });

      expect(result).toEqual({ id: 'sim_200' });
    });
  });

  it('normalizes candidateCount across numeric variants', async () => {
    mockedGet.mockResolvedValueOnce([
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
