import { CandidateSessionSkeleton } from '../components/CandidateSessionSkeleton';

export function LoadingView({ message }: { message: string }) {
  return <CandidateSessionSkeleton message={message} />;
}
