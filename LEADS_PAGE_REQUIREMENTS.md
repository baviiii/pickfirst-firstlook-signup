# Leads Page - Requirements for Inquiries to Show

## Conditions That Must Be Satisfied

For an inquiry to appear in the Leads page (`/agent-leads`), **ALL** of these conditions must be met:

### 1. **Agent Authentication**
- ✅ Agent must be logged in
- ✅ `profile` must exist (from `useAuth()`)

### 2. **Agent Must Have Listings**
- ✅ `PropertyService.getMyListings()` must return at least one listing
- ✅ Listing must have `agent_id = logged_in_agent.id`
- ⚠️ **No status filter** - includes ALL statuses (pending, approved, rejected, sold)

### 3. **Property Must Match**
- ✅ Inquiry's `property_id` must match one of the agent's listing IDs
- ✅ The property listing must exist in `property_listings` table

### 4. **RLS Policy Check**
- ✅ RLS policy "Agents can view inquiries for their properties" must allow access
- ✅ Policy checks: `EXISTS (SELECT 1 FROM property_listings WHERE property_listings.id = property_inquiries.property_id AND property_listings.agent_id = auth.uid())`

### 5. **Data Fetching**
- ✅ `PropertyService.getPropertyInquiries(listing.id)` must succeed
- ✅ Must return data (not null/empty)

## Current Flow

```javascript
1. fetchInquiries() called
2. Check: if (!profile) return; // Must have profile
3. Get: myListings = PropertyService.getMyListings()
   - Filters: agent_id = user.id
   - No status filter
4. For each listing:
   - Get: propertyInquiries = PropertyService.getPropertyInquiries(listing.id)
   - Filters: property_id = listing.id
5. For each inquiry:
   - Add to allInquiries array
   - Fetch related data (appointments, conversations, clients)
6. Display: allInquiries in UI
```

## Potential Issues

### ❌ **If inquiries don't show:**

1. **Agent has no listings**
   - Check: Does `getMyListings()` return any listings?
   - Fix: Agent needs to create at least one property listing

2. **Property agent_id mismatch**
   - Check: Does the property have `agent_id = logged_in_agent.id`?
   - Fix: Update property's `agent_id` to match agent

3. **Inquiry property_id doesn't match**
   - Check: Does inquiry's `property_id` match one of agent's listings?
   - Fix: Update inquiry's `property_id` or create listing with that ID

4. **RLS blocking access**
   - Check: Does RLS policy allow agent to view?
   - Policy requires: property_listings.id = property_inquiries.property_id AND property_listings.agent_id = auth.uid()
   - Fix: Ensure property belongs to agent

5. **Silent errors**
   - Check: Are errors being caught and ignored?
   - Current code: `if (propertyInquiries)` - silently skips if null/error
   - Fix: Add error logging

## Debugging Steps

1. **Check browser console** for errors
2. **Verify agent has listings:**
   ```sql
   SELECT id, title, agent_id, status 
   FROM property_listings 
   WHERE agent_id = '<agent_user_id>';
   ```

3. **Verify inquiry exists:**
   ```sql
   SELECT id, property_id, buyer_id, created_at 
   FROM property_inquiries 
   WHERE property_id IN (
     SELECT id FROM property_listings WHERE agent_id = '<agent_user_id>'
   );
   ```

4. **Check RLS:**
   ```sql
   -- Test if agent can see inquiry
   SET ROLE authenticated;
   SET request.jwt.claim.sub = '<agent_user_id>';
   SELECT * FROM property_inquiries WHERE property_id = '<property_id>';
   ```

## Current Code Issues

The code silently skips errors:
```javascript
const { data: propertyInquiries } = await PropertyService.getPropertyInquiries(listing.id);
if (propertyInquiries) {  // ⚠️ Silently skips if null/error
  // process inquiries
}
```

**Recommendation:** Add error logging to see what's failing.

