# Making a User a Super Admin - Security Explained

## ✅ Excellent Security!

The error you're seeing (`Role changes not allowed`) is **exactly what should happen** - it means your security system is working correctly! 

### What's Protecting You:
- **`block_role_changes()` trigger** - Prevents unauthorized role changes
- **RLS (Row Level Security)** - Ensures users can only modify their own data
- **Role-based access control** - Only super admins can change other users' roles

This prevents:
- ❌ Regular users from escalating their own privileges
- ❌ Agents from making themselves admins
- ❌ SQL injection attacks that try to change roles
- ❌ Malicious scripts from modifying user permissions

## 🔐 How to Properly Make Someone an Admin:

### Option 1: Use Bootstrap Function (If No Admins Exist Yet)

```sql
SELECT public.bootstrap_first_super_admin('info@pickfirst.com.au');
```

**Note:** This only works if NO super admins exist in the system yet.

### Option 2: Use Service Role (Recommended for Production)

If you have service_role access (database admin), run this in a SECURITY DEFINER function:

```sql
-- This bypasses RLS and triggers because it uses SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.make_user_super_admin(_user_email text)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  trigger_rec record;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = _user_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Temporarily disable block_role_changes trigger
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass 
    AND tgenabled = 'O' AND tgisinternal = false
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Update role
  UPDATE public.profiles SET role = 'super_admin', updated_at = now() WHERE id = target_user_id;
  
  -- Re-enable triggers
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass
    AND tgenabled = 'O' AND tgisinternal = false
  LOOP
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Update user_roles
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (target_user_id, 'super_admin', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'email', _user_email);
END;
$$;

-- Call it
SELECT public.make_user_super_admin('info@pickfirst.com.au');
```

### Option 3: Use Admin Dashboard (If You Have Admin Access)

If you already have a super admin account, use the Admin Dashboard UI to promote other users.

## 📝 Summary

**Your security is working perfectly!** The block_role_changes trigger is doing its job. To make someone an admin, you need to:

1. Use the bootstrap function (first admin only)
2. Use service_role privileges (database admin access)
3. Use the admin dashboard (if you're already an admin)

This is the correct and secure way to handle role changes! 🔒

