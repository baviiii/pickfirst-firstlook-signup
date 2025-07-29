import { PageWrapper } from '@/components/ui/page-wrapper';
import { DatabaseManagement } from '@/components/admin/DatabaseManagement';

const DatabaseManagementPage = () => {
  return (
    <PageWrapper title="Database Management">
      <DatabaseManagement />
    </PageWrapper>
  );
};

export default DatabaseManagementPage;