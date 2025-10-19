import { ProfileSettings as ProfileSettingsComponent } from '@/components/user/ProfileSettings';
import { PageWrapper } from '@/components/ui/page-wrapper';

export default function ProfileSettings() {
  return (
    <PageWrapper title="Profile Settings" showBackButton={true} backTo="/dashboard" backText="Back to Dashboard">
      <ProfileSettingsComponent />
    </PageWrapper>
  );
}