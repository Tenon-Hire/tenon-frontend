import type { ReactNode } from "react";
import { CandidateSessionProvider } from "./CandidateSessionProvider";

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return <CandidateSessionProvider>{children}</CandidateSessionProvider>;
}
