import AppLayout from '@/components/layout/AppLayout';
import SessionWizard from '@/components/session/SessionWizard';

export default function NewSession() {
  return (
    <AppLayout>
      <div className="py-6">
        <SessionWizard />
      </div>
    </AppLayout>
  );
}
