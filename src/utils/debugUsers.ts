import { supabase } from '@/integrations/supabase/client';

export const debugUsers = async () => {
  console.log('🔍 Debugging Users in Database...');
  
  try {
    // Get all users
    const { data: allUsers, error: allUsersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (allUsersError) {
      console.error('❌ Error fetching all users:', allUsersError);
      return;
    }

    console.log('📊 All Users in Database:');
    console.table(allUsers);

    // Group by role
    const usersByRole = allUsers?.reduce((acc, user) => {
      const role = user.role || 'no-role';
      if (!acc[role]) acc[role] = [];
      acc[role].push(user);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('👥 Users by Role:');
    Object.entries(usersByRole || {}).forEach(([role, users]) => {
      console.log(`${role}: ${users.length} users`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.full_name || 'No name'})`);
      });
    });

    // Check for users without roles
    const usersWithoutRole = allUsers?.filter(user => !user.role);
    if (usersWithoutRole && usersWithoutRole.length > 0) {
      console.log('⚠️ Users without role:');
      usersWithoutRole.forEach(user => {
        console.log(`  - ${user.email} (${user.full_name || 'No name'})`);
      });
    }

    return {
      totalUsers: allUsers?.length || 0,
      usersByRole,
      usersWithoutRole: usersWithoutRole?.length || 0,
    };

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};

export const testUserSearch = async (email: string) => {
  console.log(`🔍 Testing user search for: ${email}`);
  
  try {
    // Test 1: Search without role restriction
    const { data: userWithoutRole, error: error1 } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('email', email.trim().toLowerCase())
      .single();

    console.log('1️⃣ Search without role restriction:');
    console.log('Result:', userWithoutRole);
    console.log('Error:', error1);

    // Test 2: Search with role = 'buyer'
    const { data: userWithBuyerRole, error: error2 } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('email', email.trim().toLowerCase())
      .eq('role', 'buyer')
      .single();

    console.log('2️⃣ Search with role = "buyer":');
    console.log('Result:', userWithBuyerRole);
    console.log('Error:', error2);

    // Test 3: Search with role = null (no role)
    const { data: userWithNullRole, error: error3 } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('email', email.trim().toLowerCase())
      .is('role', null)
      .single();

    console.log('3️⃣ Search with role = null:');
    console.log('Result:', userWithNullRole);
    console.log('Error:', error3);

    return {
      userWithoutRole,
      userWithBuyerRole,
      userWithNullRole,
      errors: { error1, error2, error3 }
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for easy testing
export const debugAllUsers = debugUsers;
export const testSpecificUser = testUserSearch; 