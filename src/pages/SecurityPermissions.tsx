import { PageWrapper } from '@/components/ui/page-wrapper';
import { SecurityPermissions } from '@/components/admin/SecurityPermissions';

const SecurityPermissionsPage = () => {
  return (
    <PageWrapper title="Security & Permissions">
      <SecurityPermissions />
    </PageWrapper>
  );
};

export default SecurityPermissionsPage;