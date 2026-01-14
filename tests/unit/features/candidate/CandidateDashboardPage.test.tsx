import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CandidateDashboardPage, {
  extractInviteToken,
} from '@/features/candidate/dashboard/CandidateDashboardPage';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';
import { listCandidateInvites } from '@/lib/api/candidate';
import { responseHelpers } from '../../../setup';

jest.mock('@/lib/api/candidate', () => ({
  listCandidateInvites: jest.fn(),
}));

const routerMock = {
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

const listInvitesMock = listCandidateInvites as jest.Mock;
const realFetch = global.fetch;
const fetchMock = jest.fn();

function renderPage(signedInEmail: string | null = 'candidate@example.com') {
  return render(
    <CandidateSessionProvider>
      <CandidateDashboardPage signedInEmail={signedInEmail} />
    </CandidateSessionProvider>,
  );
}

describe('CandidateDashboardPage', () => {
  beforeEach(() => {
    Object.values(routerMock).forEach((fn) => fn.mockReset());
    listInvitesMock.mockReset();
    listInvitesMock.mockResolvedValue([]);
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    sessionStorage.clear();
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('shows invites list with continue CTA', async () => {
    listInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        token: 'INV123',
        title: 'Infra Simulation',
        role: 'Backend Engineer',
        company: 'Tenon',
        status: 'in_progress',
        progress: { completed: 2, total: 5 },
        expiresAt: '2025-01-01',
        lastActivityAt: '2024-12-12',
        isExpired: false,
      },
    ]);

    fetchMock.mockResolvedValueOnce(
      responseHelpers.jsonResponse({ accessToken: 'candidate-token' }),
    );
    renderPage();

    expect(await screen.findByText(/Infra Simulation/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(routerMock.push).toHaveBeenCalledWith('/candidate/session/INV123');
  });

  it('shows empty state when no invites', async () => {
    listInvitesMock.mockResolvedValue([]);

    fetchMock.mockResolvedValueOnce(
      responseHelpers.jsonResponse({ accessToken: 'candidate-token' }),
    );
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/No invites yet/i)).toBeInTheDocument(),
    );
  });

  it('disables CTA for expired invites', async () => {
    listInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        token: 'INV999',
        title: 'Old Simulation',
        role: 'Backend',
        company: null,
        status: 'expired',
        progress: null,
        expiresAt: '2024-01-01',
        lastActivityAt: '2024-01-02',
        isExpired: true,
      },
    ]);

    fetchMock.mockResolvedValueOnce(
      responseHelpers.jsonResponse({ accessToken: 'candidate-token' }),
    );
    renderPage();

    expect(await screen.findByText(/Old Simulation/i)).toBeInTheDocument();
    const cta = screen.getByRole('button', {
      name: /Start simulation|Continue/i,
    });
    expect(cta).toBeDisabled();
  });

  it('redirects to login when no token is available', async () => {
    fetchMock.mockResolvedValueOnce(
      responseHelpers.jsonResponse({ message: 'Not authenticated' }, 401),
    );
    renderPage(null);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      await screen.findByText(/Sign in to see your simulations/i),
    ).toBeInTheDocument();
    expect(listInvitesMock).not.toHaveBeenCalled();
  });

  it('parses canonical invite links and navigates', () => {
    expect(
      extractInviteToken('https://app.test/candidate/session/INV123'),
    ).toBe('INV123');
  });

  it('parses legacy invite links and normalizes to canonical route', () => {
    expect(
      extractInviteToken('https://app.test/candidate-sessions/INV123'),
    ).toBe('INV123');
  });

  it('strips query/hash when parsing raw tokens', () => {
    expect(extractInviteToken(' INV123?utm=1 ')).toBe('INV123');
    expect(extractInviteToken('INV123#frag')).toBe('INV123');
  });
});
