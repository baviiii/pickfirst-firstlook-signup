import { PageWrapper } from '@/components/ui/page-wrapper';
import { AgentMessages } from '@/components/agent/AgentMessages';

const AgentMessagesPage = () => {
  return (
    <PageWrapper title="Messages">
      <AgentMessages />
    </PageWrapper>
  );
};

export default AgentMessagesPage;