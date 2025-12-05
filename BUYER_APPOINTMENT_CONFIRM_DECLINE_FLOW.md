# Buyer Confirm/Decline Appointment Flow - Complete Overview

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. BUYER UI ACTION (BuyerDashboardNew.tsx / BuyerAccountSettings.tsx) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ handleConfirmAppointment(id)        │
        │ OR                                   │
        │ handleDeclineAppointment(id)        │
        └─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. APPOINTMENT SERVICE (appointmentService.updateAppointment())  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │ Permission Check     │   │ Status Validation    │
    │ - Is buyer?          │   │ - Must be 'scheduled'│
    │ - Is appointment     │   │ - Can only change to │
    │   client?            │   │   'confirmed' or     │
    │ - Can update?        │   │   'declined'         │
    └──────────────────────┘   └──────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ Update Database (Supabase)          │
        │ appointments.status = 'confirmed'   │
        │ OR                                  │
        │ appointments.status = 'declined'    │
        └─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. NOTIFICATION CREATION (notificationService)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │ Agent Notification   │   │ Buyer Notification   │
    │ - 'appointment_      │   │ - 'appointment_      │
    │   confirmed'         │   │   confirmed'         │
    │ - 'appointment_      │   │   (if agent confirms)│
    │   cancelled'         │   │                      │
    │   (if declined)      │   │                      │
    └──────────────────────┘   └──────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EMAIL NOTIFICATION (EmailService.sendAppointmentStatusUpdate)│
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │ sendStatusChange     │   │ Determine Recipient  │
    │ Notifications()      │   │ - If buyer confirms  │
    │                      │   │   → Notify AGENT     │
    │                      │   │ - If buyer declines  │
    │                      │   │   → Notify AGENT     │
    └──────────────────────┘   └──────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ Try Direct Send (Edge Function)     │
        │ supabase.functions.invoke('send-email')│
        └─────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         SUCCESS ▼                   FAIL ▼
    ┌──────────────────┐   ┌──────────────────────┐
    │ Email Sent! ✅   │   │ Fallback: Queue Email│
    │                  │   │ email_queue table    │
    └──────────────────┘   └──────────────────────┘
```

---

## 📋 Step-by-Step Breakdown

### **STEP 1: Buyer Clicks Confirm/Decline**

**Locations:**
- `src/components/dashboard/BuyerDashboardNew.tsx` (Dashboard)
- `src/pages/BuyerAccountSettings.tsx` (Settings Page)

**Handler Functions:**
```typescript
// Confirm
const handleConfirmAppointment = async (id: string) => {
  const result = await appointmentService.updateAppointment(id, { 
    status: 'confirmed' 
  });
  // Refresh appointments & show success toast
}

// Decline
const handleDeclineAppointment = async (id: string) => {
  const result = await appointmentService.updateAppointment(id, { 
    status: 'declined' 
  });
  // Refresh appointments & show success toast
}
```

---

### **STEP 2: Permission & Validation Checks**

**File:** `src/services/appointmentService.ts`  
**Method:** `updateAppointment()`

**Checks:**
1. ✅ User is authenticated
2. ✅ Appointment exists
3. ✅ User is the appointment client (by `client_id` OR `client_email`)
4. ✅ Current status is `'scheduled'` (buyers can only confirm/decline scheduled appointments)
5. ✅ New status is either `'confirmed'` or `'declined'`

**Code:**
```typescript
// Line 446-447: Check if user is the client
const isAppointmentClient = 
  currentAppointment.client_id === user.id || 
  (appointmentEmail && userEmail && appointmentEmail === userEmail);

// Line 452-457: Validate buyer permissions
if ((isBuyer || (isAgent && isInBuyerMode)) && isAppointmentClient) {
  if (!['confirmed', 'declined'].includes(updates.status) || 
      currentAppointment.status !== 'scheduled') {
    throw new Error('Invalid status change for buyer');
  }
}
```

---

### **STEP 3: Database Update**

**File:** `src/services/appointmentService.ts`  
**Lines:** 470-475

```typescript
const { data, error } = await supabase
  .from('appointments')
  .update(updates)  // { status: 'confirmed' } or { status: 'declined' }
  .eq('id', id)
  .select()
  .single();
```

---

### **STEP 4: In-App Notifications Created**

**File:** `src/services/appointmentService.ts`  
**Lines:** 488-530

**When Buyer Confirms:**
- Creates notification for **AGENT**: `'appointment_confirmed'`
- Message: `"[Client Name] confirmed the appointment on [date] at [time]"`

**When Buyer Declines:**
- Creates notification for **AGENT**: `'appointment_cancelled'`
- Message: `"[Client Name] declined the appointment on [date] at [time]"`

**Code:**
```typescript
if (updates.status === 'confirmed' && data.agent_id) {
  await notificationService.createNotification(
    data.agent_id,
    'appointment_confirmed',
    'Appointment Confirmed',
    `${data.client_name} confirmed the appointment...`,
    '/appointments',
    { appointment_id: data.id }
  );
}
```

---

### **STEP 5: Email Notification Flow**

**File:** `src/services/appointmentService.ts`  
**Method:** `sendStatusChangeNotifications()`  
**Lines:** 962-1155

**Key Logic:**

1. **Fetches Agent Profile** (Lines 978-987)
   - Gets agent's email, name, phone from `profiles` table

2. **Determines Who Made the Change** (Lines 994-1003)
   ```typescript
   const isBuyerMakingChange = isClientMakingChange;
   const isAgentMakingChange = !isClientMakingChange;
   ```

3. **Sends Appropriate Email:**

   **When Buyer Confirms (Lines 1006-1034):**
   - ✅ **Sends email to AGENT**
   - Template: `appointmentStatusUpdate`
   - Status: `'confirmed'`
   - Message: `"Your client has confirmed the appointment"`

   **When Buyer Declines (Lines 1057-1084):**
   - ✅ **Sends email to AGENT**
   - Template: `appointmentStatusUpdate`
   - Status: `'declined'`
   - Message: `"Your client has declined the appointment"`

---

### **STEP 6: Email Sending (Edge Function)**

**File:** `src/services/emailService.ts`  
**Method:** `sendAppointmentStatusUpdate()`  
**Lines:** 394-535

**Process:**

1. **Direct Send Attempt** (Line 417)
   ```typescript
   const { data, error } = await supabase.functions.invoke('send-email', {
     body: {
       to: userEmail,
       template: 'appointmentStatusUpdate',
       subject: `Appointment [Status] - [Type]`,
       data: { ...appointmentData }
     }
   });
   ```

2. **Success Path** ✅
   - Email sent immediately via Edge Function
   - Logged: `"✅ Appointment status update email sent successfully"`

3. **Failure Path** ⚠️
   - **Fallback:** Queues email in `email_queue` table
   - Email will be processed by background job
   - Logged: `"✅ Email queued as fallback"`

---

## 🔍 Critical Points

### ✅ **What Works Correctly:**

1. **Permission Checks:** Only the buyer/client can confirm/decline their appointments
2. **Status Validation:** Can only confirm/decline if status is `'scheduled'`
3. **Email Recipient:** Agent **ALWAYS** gets notified when buyer confirms/declines
4. **Email Delivery:** Uses direct Edge Function send with fallback to queue
5. **Notifications:** In-app notifications created for agents
6. **Audit Logging:** All changes are logged for auditing

### ⚠️ **Potential Issues & Current Status:**

1. **Email Template:** Uses `'appointmentStatusUpdate'` template
   - **Location:** `supabase/functions/send-email/index.ts`
   - **Status:** Should exist in Edge Function

2. **Error Handling:**
   - ✅ Comprehensive error logging
   - ✅ Fallback to email queue if direct send fails
   - ✅ Console logs at every step for debugging

3. **Agent Detection:**
   - ✅ Correctly identifies if buyer is making the change
   - ✅ Uses `isClientMakingChange` parameter passed through

---

## 📧 Email Flow Summary

```
Buyer Confirms Appointment
  │
  ├─→ Creates In-App Notification (Agent sees in notifications bell)
  │
  └─→ Sends Email to Agent
      │
      ├─→ Try: Direct send via Edge Function ✅
      │   └─→ Uses 'appointmentStatusUpdate' template
      │
      └─→ Fallback: Queue in email_queue table ⚠️
          └─→ Background job processes later

Buyer Declines Appointment
  │
  ├─→ Creates In-App Notification (Agent sees in notifications bell)
  │
  └─→ Sends Email to Agent
      │
      ├─→ Try: Direct send via Edge Function ✅
      │   └─→ Uses 'appointmentStatusUpdate' template
      │
      └─→ Fallback: Queue in email_queue table ⚠️
          └─→ Background job processes later
```

---

## 🔧 Files Involved

| File | Purpose | Key Methods |
|------|---------|-------------|
| `src/components/dashboard/BuyerDashboardNew.tsx` | Buyer dashboard UI | `handleConfirmAppointment()`, `handleDeclineAppointment()` |
| `src/pages/BuyerAccountSettings.tsx` | Settings page UI | `handleConfirmAppointment()`, `handleDeclineAppointment()` |
| `src/services/appointmentService.ts` | Appointment logic | `updateAppointment()`, `sendStatusChangeNotifications()` |
| `src/services/emailService.ts` | Email sending | `sendAppointmentStatusUpdate()` |
| `src/services/notificationService.ts` | In-app notifications | `createNotification()` |
| `supabase/functions/send-email/index.ts` | Edge Function | Handles email delivery |

---

## 🐛 Debugging

**Console Logs to Look For:**
1. `[AppointmentService] About to send status change notifications:` - Starting email flow
2. `[AppointmentService] Buyer confirmed/declined appointment - sending email to agent:` - Determining recipient
3. `[EmailService] Sending appointment status update email:` - Email service called
4. `[EmailService] ✅ Appointment status update email sent successfully` - Email sent
5. `[EmailService] ❌ Error sending appointment status update email:` - Error occurred
6. `[EmailService] ✅ Email queued as fallback` - Using fallback queue

---

## ✅ Current Status

**As of latest code review:**

- ✅ Buyer can confirm appointments (status: `'scheduled'` → `'confirmed'`)
- ✅ Buyer can decline appointments (status: `'scheduled'` → `'declined'`)
- ✅ Agent receives in-app notifications
- ✅ Agent should receive emails (via Edge Function with queue fallback)
- ✅ Comprehensive logging for debugging
- ✅ Error handling with fallback mechanisms

**If emails aren't being sent:**
1. Check Edge Function logs in Supabase Dashboard
2. Check `email_queue` table for queued emails
3. Verify `'appointmentStatusUpdate'` template exists in Edge Function
4. Check console logs for error messages

