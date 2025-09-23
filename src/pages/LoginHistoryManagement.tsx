import { LoginHistoryManager } from '@/components/admin/LoginHistoryManager';
import { PageWrapper } from '@/components/ui/page-wrapper';

const LoginHistoryManagementPage = () => {
  return (
    <PageWrapper title="Login History">
      <LoginHistoryManager />
    </PageWrapper>
  );
};

export default LoginHistoryManagementPage;
