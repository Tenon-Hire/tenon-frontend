'use client';

import { useCallback } from 'react';
import type { SimulationDetailViewProps } from './types';

type InviteModalDeps = Pick<
  SimulationDetailViewProps,
  'resetInviteFlow' | 'setInviteModalOpen'
>;

export function useInviteModalActions({
  resetInviteFlow,
  setInviteModalOpen,
}: InviteModalDeps) {
  const openInviteModal = useCallback(() => {
    resetInviteFlow();
    setInviteModalOpen(true);
  }, [resetInviteFlow, setInviteModalOpen]);

  const closeInviteModal = useCallback(() => {
    resetInviteFlow();
    setInviteModalOpen(false);
  }, [resetInviteFlow, setInviteModalOpen]);

  return { openInviteModal, closeInviteModal };
}
