'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { SimulationCreateForm } from './components/SimulationCreateForm';
import { useSimulationCreateForm } from './hooks/useSimulationCreateForm';

export default function SimulationCreatePage() {
  const router = useRouter();
  const form = useSimulationCreateForm((id) =>
    router.push(`/dashboard/simulations/${encodeURIComponent(id)}`),
  );

  return (
    <main className="flex flex-col gap-6 py-8">
      <PageHeader
        title="New Simulation"
        subtitle="Create a new 5-day simulation."
        actions={
          <Button type="button" onClick={() => router.push('/dashboard')}>
            Back
          </Button>
        }
      />

      <SimulationCreateForm
        values={form.values}
        errors={form.errors}
        isSubmitting={form.isSubmitting}
        seniorityOptions={form.seniorityOptions}
        onChange={form.setField}
        onSubmit={form.handleSubmit}
        onCancel={() => router.push('/dashboard')}
      />
    </main>
  );
}
