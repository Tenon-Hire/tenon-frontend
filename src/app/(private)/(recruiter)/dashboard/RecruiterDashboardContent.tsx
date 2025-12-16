"use client";

import { useEffect, useState } from "react";
import { inviteCandidate, listSimulations, type SimulationListItem } from "@/lib/recruiterApi";
import Button from "@/components/common/Button";

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

type InviteState =
  | { status: "idle" }
  | { status: "loading"; simulationId: string }
  | { status: "success"; simulationId: string; inviteUrl: string; token: string }
  | { status: "error"; simulationId: string; message: string };

function formatCreatedDate(iso: string): string {
  if (typeof iso !== "string") return "";
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

function errorToMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export default function RecruiterDashboardContent({
  profile,
  error,
}: RecruiterDashboardContentProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [simError, setSimError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setSimError(null);
        const sims = await listSimulations();
        if (!cancelled) setSimulations(sims);
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

  async function onInvite(simulationId: string) {
    setInvite({ status: "loading", simulationId });

    try {
      const res = await inviteCandidate(simulationId);
      setInvite({
        status: "success",
        simulationId,
        inviteUrl: res.inviteUrl,
        token: res.token,
      });
    } catch (e: unknown) {
      const message = errorToMessage(e, "Failed to invite candidate.");
      setInvite({ status: "error", simulationId, message });
    }
  }

  return (
    <main className="flex flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

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

        {loading ? <p className="text-sm text-gray-600">Loading simulations…</p> : null}

        {!loading && simError ? (
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">Couldn’t load simulations</p>
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
              <div key={sim.id} className="border-b border-gray-200 p-3 last:border-b-0">
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4">
                    <p className="font-medium">{sim.title}</p>
                    {typeof sim.candidateCount === "number" ? (
                      <p className="text-xs text-gray-500">{sim.candidateCount} candidate(s)</p>
                    ) : null}
                  </div>

                  <div className="col-span-3">
                    <p className="text-sm text-gray-700">{sim.role}</p>
                  </div>

                  <div className="col-span-3">
                    <p className="text-sm text-gray-700">{formatCreatedDate(sim.createdAt)}</p>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button
                      onClick={() => onInvite(sim.id)}
                      disabled={invite.status === "loading" && invite.simulationId === sim.id}
                    >
                      {invite.status === "loading" && invite.simulationId === sim.id
                        ? "Inviting…"
                        : "Invite candidate"}
                    </Button>
                  </div>
                </div>

                {invite.status === "error" && invite.simulationId === sim.id ? (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-700">Invite failed</p>
                    <p className="text-sm text-red-700">{invite.message}</p>
                  </div>
                ) : null}

                {invite.status === "success" && invite.simulationId === sim.id ? (
                  <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                    <p className="text-sm font-medium">Invite created</p>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Invite URL
                        </p>
                        <p className="break-all rounded bg-gray-50 p-2 font-mono text-xs">
                          {invite.inviteUrl}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Token
                        </p>
                        <p className="break-all rounded bg-gray-50 p-2 font-mono text-xs">
                          {invite.token}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {!profile && !error ? (
        <p className="text-sm text-gray-600">No profile data available.</p>
      ) : null}
    </main>
  );
}
