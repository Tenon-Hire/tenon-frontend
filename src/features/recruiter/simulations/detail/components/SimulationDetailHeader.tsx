'use client';

import { SimulationDetailHeaderCore } from './SimulationDetailHeaderCore';
import type { SimulationDetailViewProps } from './types';

type Props = Pick<
  SimulationDetailViewProps,
  'simulationId' | 'templateKeyLabel' | 'titleLabel'
> & { onInvite: () => void };

export function SimulationDetailHeader({
  simulationId,
  templateKeyLabel,
  titleLabel,
  onInvite,
}: Props) {
  return (
    <SimulationDetailHeaderCore
      simulationId={simulationId}
      title={titleLabel}
      templateKey={templateKeyLabel}
      onInvite={onInvite}
    />
  );
}
