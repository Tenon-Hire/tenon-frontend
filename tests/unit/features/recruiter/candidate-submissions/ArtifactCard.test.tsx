import { render, screen } from '@testing-library/react';
import { ArtifactCard } from '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage';

const baseArtifact = {
  submissionId: 1,
  candidateSessionId: 2,
  submittedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  task: {
    taskId: 3,
    dayIndex: 1,
    type: 'design',
    title: 'Design doc',
    prompt: null,
  },
  testResults: null,
};

describe('ArtifactCard', () => {
  it('renders markdown-formatted content', () => {
    render(
      <ArtifactCard
        artifact={{
          ...baseArtifact,
          contentText: '# Heading\n\n- item one',
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Heading', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('item one')).toBeInTheDocument();
  });

  it('handles missing content', () => {
    render(
      <ArtifactCard
        artifact={{
          ...baseArtifact,
          contentText: null,
        }}
      />,
    );

    expect(
      screen.getByText(/No content captured for this submission/i),
    ).toBeInTheDocument();
  });

  it('preserves single newlines for plain text submissions', () => {
    render(
      <ArtifactCard
        artifact={{
          ...baseArtifact,
          contentText: 'Line 1\nLine 2',
        }}
      />,
    );

    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });
});
