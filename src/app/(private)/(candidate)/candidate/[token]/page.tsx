import { notFound } from "next/navigation";
import CandidateSimulationContent from "./CandidateSimulationContent";

interface CandidatePageProps {
  params: { token: string };
}

export default function CandidatePage({ params }: CandidatePageProps) {
  const { token } = params;

  if (!token) {
    notFound();
  }

  return <CandidateSimulationContent token={token} />;
}
