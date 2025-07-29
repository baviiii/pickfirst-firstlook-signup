import { PageWrapper } from '@/components/ui/page-wrapper';
import { AgentProfile } from '@/components/agent/AgentProfile';

const AgentProfilePage = () => {
  return (
    <PageWrapper title="Profile Settings">
      <AgentProfile />
    </PageWrapper>
  );
};

export default AgentProfilePage;