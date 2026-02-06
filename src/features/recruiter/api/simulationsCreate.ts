import { extractBackendMessage, fallbackStatus } from '@/lib/api/errors/errors';
import type { CreateSimulationInput, CreateSimulationResponse } from './types';
import { normalizeCreateSimulationResponse } from './simulationsNormalize';
import { isRecord } from './simUtils';
import { throwMappedApiError } from '@/lib/api/errors/errorMapping';
import { requestRecruiterBff } from './requestRecruiterBff';

export async function createSimulation(
  input: CreateSimulationInput,
  options?: { signal?: AbortSignal; cache?: RequestCache },
): Promise<CreateSimulationResponse> {
  const safeTitle = input.title.trim();
  const safeRole = input.role.trim();
  const safeTechStack = input.techStack.trim();
  const safeTemplateKey = input.templateKey.trim();

  if (!safeTitle || !safeRole || !safeTechStack || !safeTemplateKey) {
    return {
      id: '',
      ok: false,
      status: 400,
      message: 'Missing required fields',
    };
  }

  try {
    const payload = {
      title: safeTitle,
      role: safeRole,
      techStack: safeTechStack,
      seniority: input.seniority,
      templateKey: safeTemplateKey,
      focus: input.focus?.trim() ? input.focus.trim() : undefined,
    };

    const { data } = await requestRecruiterBff<unknown>('/simulations', {
      method: 'POST',
      body: payload,
      cache: options?.cache,
      signal: options?.signal,
    });

    const statusFromData = isRecord(data)
      ? (data as { status?: unknown }).status
      : undefined;
    const normalized = normalizeCreateSimulationResponse(
      data,
      typeof statusFromData === 'number' ? statusFromData : 201,
    );
    if (!normalized.ok) {
      const message =
        normalized.message ??
        extractBackendMessage(data, true) ??
        'Unable to create simulation. Please try again shortly.';
      return { ...normalized, message };
    }
    return normalized;
  } catch (caught: unknown) {
    if (!(caught instanceof TypeError) && caught) {
      try {
        throwMappedApiError(
          caught,
          'Unable to create simulation right now.',
          'recruiter',
        );
      } catch (mapped) {
        const status = (mapped as { status?: number }).status ?? 0;
        const message =
          (mapped as { message?: string }).message ??
          'Unable to create simulation right now.';
        return { ok: false, status, id: '', message };
      }
    }
    const status = fallbackStatus(caught, 0);
    const message =
      extractBackendMessage(
        (caught as { details?: unknown })?.details ?? caught,
        true,
      ) ??
      (caught instanceof Error ? caught.message : null) ??
      'Unable to create simulation right now.';
    return { ok: false, status, id: '', message };
  }
}
