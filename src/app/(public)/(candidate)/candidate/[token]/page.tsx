import { notFound } from "next/navigation";
import CandidateSimulationContent from "./CandidateSimulationContent";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ token?: string }>;
}) {
  const { token } = await params;

  if (!token) notFound();

  return <CandidateSimulationContent token={token} />;
}
