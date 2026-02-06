import { statusMeta } from '@/shared/status/statusMeta';
import {
  dayProgressStatusMeta,
  reportStatusMeta,
} from '@/features/recruiter/simulations/detail/utils/statusAdapters';
import type { CandidateSession } from '@/features/recruiter/types';

describe('statusAdapters', () => {
  it('maps report readiness to report_ready status', () => {
    const meta = reportStatusMeta({
      candidateSessionId: 1,
      hasReport: true,
      inviteEmail: null,
      candidateName: null,
      status: 'completed',
      startedAt: null,
      completedAt: null,
    } as CandidateSession);
    expect(meta).toEqual(statusMeta('report_ready'));
  });

  it('returns placeholder when report missing', () => {
    const meta = reportStatusMeta({
      candidateSessionId: 2,
      hasReport: false,
      inviteEmail: null,
      candidateName: null,
      status: 'not_started',
      startedAt: null,
      completedAt: null,
    } as CandidateSession);
    expect(meta.label).toBe('—');
    expect(meta.tone).toBe('muted');
  });

  it('formats day progress with derived tone', () => {
    const meta = dayProgressStatusMeta({
      candidateSessionId: 3,
      dayProgress: { current: 2, total: 5 },
      inviteEmail: null,
      candidateName: null,
      status: 'in_progress',
      startedAt: null,
      completedAt: null,
      hasReport: false,
    } as CandidateSession);
    expect(meta.label).toBe('2 / 5');
    expect(meta.tone).toBe(statusMeta('in_progress').tone);
  });

  it('handles missing day progress gracefully', () => {
    const meta = dayProgressStatusMeta({
      candidateSessionId: 4,
      inviteEmail: null,
      candidateName: null,
      status: 'not_started',
      startedAt: null,
      completedAt: null,
      hasReport: false,
    } as CandidateSession);
    expect(meta.label).toBe('—');
    expect(meta.tone).toBe('muted');
  });
});
