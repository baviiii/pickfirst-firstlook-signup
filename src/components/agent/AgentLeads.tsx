import { PageWrapper } from '@/components/ui/page-wrapper';
import { AgentInquiries } from '@/components/agent/AgentInquiries';
import { withErrorBoundary } from '@/components/ui/error-boundary';

const AgentLeadsComponent = () => {
  return (
    <PageWrapper title="Leads & Inquiries">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-pickfirst-yellow/10 to-pickfirst-amber/10 p-4 rounded-lg border border-pickfirst-yellow/20">
          <h2 className="text-lg font-semibold text-white mb-2">Lead Management</h2>
          <p className="text-gray-300 text-sm">
            Manage property inquiries, convert leads to clients, and schedule appointments. 
            Each inquiry can be responded to, converted into a client relationship, or used to schedule an appointment.
          </p>
        </div>
        <AgentInquiries />
      </div>
    </PageWrapper>
  );
};

export const AgentLeads = withErrorBoundary(AgentLeadsComponent);