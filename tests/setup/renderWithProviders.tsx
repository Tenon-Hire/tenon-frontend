import React from "react";
import { render } from "@testing-library/react";
import { CandidateSessionProvider } from "@/app/(public)/(candidate)/candidate/CandidateSessionProvider";

export function renderCandidateWithProviders(ui: React.ReactElement) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}
