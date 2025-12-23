"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  inviteCandidate,
  listSimulations,
  type SimulationListItem,
} from "@/lib/recruiterApi";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";

export type RecruiterProfile = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type RecruiterDashboardContentProps = {
  profile: RecruiterProfile | null;
  error: string | null;
};

type InviteUiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

type InviteModalState = {
  open: boolean;
  simulationId: string;
  simulationTitle: string;
};

type ToastState =
  | { open: false }
  | {
      open: true;
      kind: "success" | "error";
      message: string;
      inviteUrl?: string;
    };

function formatCreatedDate(iso: string): string {
  if (typeof iso !== "string") return "";
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

function errorToMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const maybeMsg = (e as { message?: unknown }).message;
    if (typeof maybeMsg === "string" && maybeMsg.trim()) return maybeMsg;
    const maybeDetail = (e as { detail?: unknown }).detail;
    if (typeof maybeDetail === "string" && maybeDetail.trim())
      return maybeDetail;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

async function copyToClipboard(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(trimmed);
      return true;
    } catch {
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = trimmed;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function InviteCandidateModal(props: {
  open: boolean;
  title: string;
  initialName?: string;
  initialEmail?: string;
  state: InviteUiState;
  onClose: () => void;
  onSubmit: (candidateName: string, inviteEmail: string) => void;
}) {
  const { open, title, onClose, onSubmit, state } = props;

  const [candidateName, setCandidateName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const nameInputId = "invite-candidate-name";
  const emailInputId = "invite-candidate-email";

  const openKey = open
    ? `${props.initialName ?? ""}::${props.initialEmail ?? ""}`
    : "closed";

  useEffect(() => {
    if (!open) return;
    setCandidateName(props.initialName ?? "");
    setInviteEmail(props.initialEmail ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  const clientValidationError = useMemo(() => {
    if (!open) return null;
    if (!candidateName.trim()) return "Candidate name is required.";
    if (!inviteEmail.trim()) return "Candidate email is required.";
    return null;
  }, [open, candidateName, inviteEmail]);

  if (!open) return null;

  const disabled = state.status === "loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={disabled ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Invite candidate</h3>
            <p className="mt-1 text-sm text-gray-600">{title}</p>
          </div>
          <button
            type="button"
            className="rounded p-2 text-gray-500 hover:bg-gray-100"
            onClick={disabled ? undefined : onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={nameInputId}
              className="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Candidate name
            </label>
            <input
              id={nameInputId}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Jane Doe"
              disabled={disabled}
            />
          </div>

          <div>
            <label
              htmlFor={emailInputId}
              className="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Candidate email
            </label>
            <input
              id={emailInputId}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jane@example.com"
              disabled={disabled}
            />
          </div>

          {clientValidationError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{clientValidationError}</p>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Invite failed</p>
              <p className="text-sm text-red-700">{state.message}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} disabled={disabled}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (clientValidationError) return;
              onSubmit(candidateName, inviteEmail);
            }}
            disabled={disabled || Boolean(clientValidationError)}
          >
            {state.status === "loading" ? "Creating…" : "Create invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RecruiterDashboardContent({
  profile,
  error,
}: RecruiterDashboardContentProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [simError, setSimError] = useState<string | null>(null);

  const [modal, setModal] = useState<InviteModalState>({
    open: false,
    simulationId: "",
    simulationTitle: "",
  });

  const [inviteState, setInviteState] = useState<InviteUiState>({
    status: "idle",
  });

  const [toast, setToast] = useState<ToastState>({ open: false });
  const [copied, setCopied] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  function dismissToast() {
    setToast({ open: false });
    setCopied(false);
  }

  function showToast(next: Omit<Extract<ToastState, { open: true }>, "open">) {
    setToast({ open: true, ...next });
    setCopied(false);

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      dismissToast();
      toastTimerRef.current = null;
    }, 6500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setSimError(null);
        const sims = await listSimulations();
        if (!cancelled) setSimulations(Array.isArray(sims) ? sims : []);
      } catch (e: unknown) {
        const message = errorToMessage(e, "Failed to load simulations.");
        if (!cancelled) setSimError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function openInviteModal(sim: SimulationListItem) {
    setInviteState({ status: "idle" });
    setModal({
      open: true,
      simulationId: sim.id,
      simulationTitle: sim.title,
    });
  }

  function closeInviteModal() {
    setModal({ open: false, simulationId: "", simulationTitle: "" });
    setInviteState({ status: "idle" });
  }

  async function submitInvite(candidateName: string, inviteEmail: string) {
    setInviteState({ status: "loading" });

    try {
      const res = await inviteCandidate(
        modal.simulationId,
        candidateName,
        inviteEmail
      );

      closeInviteModal();

      const displayName = candidateName.trim();
      const displayEmail = inviteEmail.trim();
      const who = displayName
        ? `${displayName} (${displayEmail})`
        : displayEmail;

      showToast({
        kind: "success",
        message: `Invite created for ${who}.`,
        inviteUrl: res.inviteUrl,
      });

      try {
        const sims = await listSimulations();
        setSimulations(Array.isArray(sims) ? sims : []);
      } catch {
      }

      setInviteState({ status: "idle" });
    } catch (e: unknown) {
      const message = errorToMessage(e, "Failed to invite candidate.");
      setInviteState({ status: "error", message });
    }
  }

  return (
    <main className="flex flex-col gap-4 py-8">
      <PageHeader
        title="Dashboard"
        actions={
          <Button
            type="button"
            onClick={() => router.push("/dashboard/simulations/new")}
          >
            New Simulation
          </Button>
        }
      />

      {toast.open ? (
        <div
          className={
            toast.kind === "success"
              ? "rounded border border-green-200 bg-green-50 p-3"
              : "rounded border border-red-200 bg-red-50 p-3"
          }
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-full">
              <p
                className={
                  toast.kind === "success"
                    ? "text-sm text-green-800"
                    : "text-sm text-red-800"
                }
              >
                {toast.message}
              </p>

              {toast.kind === "success" && toast.inviteUrl ? (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-800/80">
                    Invite URL
                  </p>
                  <div className="mt-1 flex items-stretch gap-2">
                    <input
                      className="w-full rounded border border-green-200 bg-white px-3 py-2 font-mono text-xs"
                      readOnly
                      value={toast.inviteUrl}
                      aria-label="Invite URL"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(toast.inviteUrl ?? "");
                        setCopied(ok);

                        if (copiedTimerRef.current)
                          window.clearTimeout(copiedTimerRef.current);

                        copiedTimerRef.current = window.setTimeout(() => {
                          setCopied(false);
                          copiedTimerRef.current = null;
                        }, 1800);
                      }}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-black/5"
              onClick={dismissToast}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {profile ? (
        <div className="rounded border border-gray-200 p-4">
          <p className="font-medium">{profile.name}</p>
          <p className="text-sm text-gray-600">{profile.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
            Role: {profile.role}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Simulations</h2>

        {loading ? (
          <p className="text-sm text-gray-600">Loading simulations…</p>
        ) : null}

        {!loading && simError ? (
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">
              Couldn’t load simulations
            </p>
            <p className="text-sm text-red-700">{simError}</p>
          </div>
        ) : null}

        {!loading && !simError && simulations.length === 0 ? (
          <div className="rounded border border-gray-200 p-4">
            <p className="text-sm text-gray-600">No simulations yet.</p>
          </div>
        ) : null}

        {!loading && !simError && simulations.length > 0 ? (
          <div className="rounded border border-gray-200">
            <div className="grid grid-cols-12 gap-3 border-b border-gray-200 bg-gray-50 p-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              <div className="col-span-4">Title</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3">Created</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {simulations.map((sim) => (
              <div
                key={sim.id}
                className="border-b border-gray-200 p-3 last:border-b-0"
              >
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4">
                    <Link
                      href={`/dashboard/simulations/${sim.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {sim.title}
                    </Link>
                    {typeof sim.candidateCount === "number" ? (
                      <p className="text-xs text-gray-500">
                        {sim.candidateCount} candidate(s)
                      </p>
                    ) : null}
                  </div>

                  <div className="col-span-3">
                    <p className="text-sm text-gray-700">{sim.role}</p>
                  </div>

                  <div className="col-span-3">
                    <p className="text-sm text-gray-700">
                      {formatCreatedDate(sim.createdAt)}
                    </p>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button onClick={() => openInviteModal(sim)}>
                      Invite candidate
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <InviteCandidateModal
        open={modal.open}
        title={modal.simulationTitle}
        state={inviteState}
        onClose={closeInviteModal}
        onSubmit={submitInvite}
        initialName=""
        initialEmail=""
      />
    </main>
  );
}
