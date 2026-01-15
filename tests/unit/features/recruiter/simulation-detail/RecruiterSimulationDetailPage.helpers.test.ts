import { __testables } from '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage';
import type { CandidateSession } from '@/types/recruiter';

describe('RecruiterSimulationDetailPage helpers', () => {
  const baseCandidate: CandidateSession = {
    candidateSessionId: 1,
    inviteEmail: null,
    candidateName: null,
    status: 'not_started',
    startedAt: null,
    completedAt: null,
    hasReport: false,
    verified: null,
    verificationStatus: null,
    verifiedAt: null,
    dayProgress: null,
  };

  it('formats dates and timestamps safely', () => {
    expect(__testables.formatDateTime(null)).toBeNull();
    expect(__testables.formatDateTime('not-a-date')).toBeNull();
    const formatted = __testables.formatDateTime('2024-01-02T03:04:05Z');
    expect(typeof formatted).toBe('string');

    expect(__testables.toTimestamp(null)).toBe(0);
    expect(__testables.toTimestamp('bad')).toBe(0);
    expect(__testables.toTimestamp('2024-01-01T00:00:00Z')).toBeGreaterThan(0);
  });

  it('labels invite and verification statuses', () => {
    expect(__testables.inviteStatusLabel(null)).toBe('Not sent');
    expect(__testables.inviteStatusLabel('sent')).toBe('Email sent');
    expect(__testables.inviteStatusLabel('failed')).toBe('Delivery failed');
    expect(__testables.inviteStatusLabel('rate_limited')).toBe('Rate limited');
    expect(__testables.inviteStatusLabel('custom_status')).toBe(
      'custom status',
    );

    expect(
      __testables.verificationStatusLabel({
        ...baseCandidate,
        verified: true,
      }),
    ).toBe('Verified');

    expect(
      __testables.verificationStatusLabel({
        ...baseCandidate,
        verificationStatus: 'pending',
      }),
    ).toBe('Pending');

    expect(
      __testables.verificationStatusLabel({
        ...baseCandidate,
        verified: false,
        verificationStatus: null,
      }),
    ).toBe('Not verified');
  });

  it('formats progress and cooldown labels', () => {
    expect(__testables.formatDayProgress(null)).toBeNull();
    expect(__testables.formatDayProgress({ current: 1, total: 0 })).toBeNull();
    expect(__testables.formatDayProgress({ current: 1.2, total: 3.6 })).toBe(
      '1 / 4',
    );

    expect(__testables.formatCooldown(1)).toBe('Retry in 1s');
    expect(__testables.formatCooldown(2500)).toBe('Retry in 3s');
  });

  it('derives session status', () => {
    expect(
      __testables.deriveStatus({ ...baseCandidate, completedAt: 'now' }),
    ).toBe('completed');
    expect(
      __testables.deriveStatus({ ...baseCandidate, startedAt: 'now' }),
    ).toBe('in_progress');
    expect(__testables.deriveStatus(baseCandidate)).toBe('not_started');
  });

  it('normalizes primitives for plan parsing', () => {
    expect(__testables.toStringOrNull('  ')).toBeNull();
    expect(__testables.toStringOrNull(' Hello ')).toBe('Hello');
    expect(__testables.toStringOrNull(123)).toBeNull();

    expect(__testables.toStringOrCsv(['a', ' b ', 1])).toBe('a, b');
    expect(__testables.toStringOrCsv('Single')).toBe('Single');
    expect(__testables.toStringOrCsv(null)).toBeNull();

    expect(__testables.toNumberOrNull(3)).toBe(3);
    expect(__testables.toNumberOrNull('4')).toBe(4);
    expect(__testables.toNumberOrNull('nope')).toBeNull();

    expect(__testables.toBooleanOrNull(true)).toBe(true);
    expect(__testables.toBooleanOrNull('true')).toBe(true);
    expect(__testables.toBooleanOrNull('false')).toBe(false);
    expect(__testables.toBooleanOrNull('no')).toBeNull();

    expect(__testables.parseDayIndex(2)).toBe(2);
    expect(__testables.parseDayIndex('day 3')).toBe(3);
    expect(__testables.parseDayIndex('x', 4)).toBe(4);
    expect(__testables.parseDayIndex(undefined)).toBe(0);
  });

  it('normalizes rubric shapes', () => {
    expect(__testables.normalizeRubric(null)).toEqual({
      rubricItems: [],
      rubricText: null,
    });

    expect(
      __testables.normalizeRubric([
        'Focus',
        { title: 'Quality' },
        { description: 'Docs' },
        123,
      ]),
    ).toEqual({ rubricItems: ['Focus', 'Quality', 'Docs'], rubricText: null });

    expect(__testables.normalizeRubric('Freeform rubric')).toEqual({
      rubricItems: [],
      rubricText: 'Freeform rubric',
    });

    expect(__testables.normalizeRubric({ summary: 'Summary rubric' })).toEqual({
      rubricItems: [],
      rubricText: 'Summary rubric',
    });

    expect(__testables.normalizeRubric(0)).toEqual({
      rubricItems: [],
      rubricText: null,
    });
  });

  it('normalizes simulation plan day entries', () => {
    const day = __testables.normalizeSimulationPlanDay(
      {
        day_number: '2',
        name: 'Day Two',
        taskType: 'code',
        problem: 'Do the thing',
        rubrics: ['Quality'],
        repo_url: 'https://github.com/acme/repo',
        repo_name: 'acme/repo',
        codespace_url: 'https://codespaces.new/acme/repo',
        repo_provisioned: 'true',
      },
      1,
    );

    expect(day).toEqual({
      dayIndex: 2,
      title: 'Day Two',
      type: 'code',
      prompt: 'Do the thing',
      rubricItems: ['Quality'],
      rubricText: null,
      repoUrl: 'https://github.com/acme/repo',
      repoName: 'acme/repo',
      codespaceUrl: 'https://codespaces.new/acme/repo',
      provisioned: true,
    });
  });

  it('extracts and sorts plan days from varied containers', () => {
    const tasks = __testables.extractDayTasks({
      tasks: [
        { dayIndex: 2, title: 'Second' },
        { dayIndex: 1, title: 'First' },
      ],
    });
    expect(tasks.map((day) => day.dayIndex)).toEqual([2, 1]);

    const mapTasks = __testables.extractDayTasks({
      plan: {
        '1': { title: 'Alpha' },
        '3': { title: 'Gamma' },
      },
    });
    expect(mapTasks.map((day) => day.title)).toEqual(['Alpha', 'Gamma']);

    expect(__testables.extractDayTasks({})).toEqual([]);

    const nested = __testables.extractDayTasks({
      taskPlan: { tasks: { '2': { title: 'Nested' } } },
    });
    expect(nested[0]?.title).toBe('Nested');
  });

  it('normalizes full simulation plan payloads', () => {
    const plan = __testables.normalizeSimulationPlan({
      title: 'Infra',
      template_key: 'node-express-ts',
      role: ['Backend', 'Infra'],
      tech_stack: ['Node', 'TS'],
      focus_area: 'APIs',
      scenario: { summary: 'Build APIs' },
      days: [
        { dayIndex: 2, title: 'Day 2' },
        { dayIndex: 1, title: 'Day 1' },
      ],
    });

    expect(plan).toEqual({
      title: 'Infra',
      templateKey: 'node-express-ts',
      role: 'Backend, Infra',
      techStack: 'Node, TS',
      focus: 'APIs',
      scenario: 'Build APIs',
      days: [
        {
          dayIndex: 1,
          title: 'Day 1',
          type: null,
          prompt: null,
          rubricItems: [],
          rubricText: null,
          repoUrl: null,
          repoName: null,
          codespaceUrl: null,
          provisioned: null,
        },
        {
          dayIndex: 2,
          title: 'Day 2',
          type: null,
          prompt: null,
          rubricItems: [],
          rubricText: null,
          repoUrl: null,
          repoName: null,
          codespaceUrl: null,
          provisioned: null,
        },
      ],
    });
  });

  it('parses response bodies safely', async () => {
    const jsonRes = {
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
    } as unknown as Response;
    await expect(__testables.safeParseResponse(jsonRes)).resolves.toEqual({
      ok: true,
    });

    const badJson = {
      headers: { get: () => 'application/json' },
      json: async () => {
        throw new Error('bad');
      },
      clone: () => ({ text: async () => 'fallback-json' }),
    } as unknown as Response;
    await expect(__testables.safeParseResponse(badJson)).resolves.toBe(
      'fallback-json',
    );

    const badText = {
      headers: { get: () => 'text/plain' },
      text: async () => {
        throw new Error('bad');
      },
      clone: () => ({ text: async () => 'fallback-text' }),
    } as unknown as Response;
    await expect(__testables.safeParseResponse(badText)).resolves.toBe(
      'fallback-text',
    );

    const plainText = {
      headers: { get: () => 'text/plain' },
      text: async () => 'ok',
    } as unknown as Response;
    await expect(__testables.safeParseResponse(plainText)).resolves.toBe('ok');
  });
});
