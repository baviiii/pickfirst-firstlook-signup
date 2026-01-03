import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  to: string;
  template: string;
  data: Record<string, any>;
  subject?: string;
}

export interface SuspiciousLoginData {
  email: string;
  ip_address: string;
  location_info?: {
    city?: string;
    country?: string;
    region?: string;
  };
  device_info?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  attempts_last_hour?: number;
  failure_reason?: string;
  created_at: string;
}

export class EmailService {
  static async queueEmail(params: {
    to: string;
    template: string;
    subject?: string;
    data?: Record<string, any>;
    sendAt?: Date;
  }): Promise<void> {
    try {
      await supabase
        .from('email_queue')
        .insert({
          email: params.to,
          template: params.template,
          subject: params.subject ?? null,
          payload: params.data ?? {},
          scheduled_for: params.sendAt ? params.sendAt.toISOString() : undefined
        });
    } catch (error) {
      console.error('Error queuing email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(userId: string, userEmail: string, userName?: string): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'welcome',
          data: {
            name: userName || 'User',
            email: userEmail,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://www.pickfirst.com.au',
            userId
          }
        }
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  /**
   * Send property alert email (on-market properties)
   */
  static async sendPropertyAlert(
    userEmail: string, 
    userName: string, 
    propertyData: {
      title: string;
      price?: number | null;
      priceDisplay?: string;
      location: string;
      propertyType: string;
      bedrooms: number;
      bathrooms: number;
      propertyUrl?: string;
    }
  ): Promise<void> {
    await this.queueEmail({
      to: userEmail,
      template: 'propertyAlert',
      subject: `🏠 New Property Alert: ${propertyData.title}`,
      data: {
        name: userName,
        propertyTitle: propertyData.title,
        price: propertyData.price ?? null,
        priceDisplay: propertyData.priceDisplay,
        location: propertyData.location,
        propertyType: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        propertyUrl: propertyData.propertyUrl
      }
    });
  }

  /**
   * Send off-market property alert email (premium exclusive)
   */
  static async sendOffMarketPropertyAlert(
    userEmail: string, 
    userName: string, 
    propertyData: {
      title: string;
      price?: number | null;
      priceDisplay?: string;
      location: string;
      propertyType: string;
      bedrooms: number;
      bathrooms: number;
      propertyUrl?: string;
    }
  ): Promise<void> {
    await this.queueEmail({
      to: userEmail,
      template: 'offMarketPropertyAlert',
      subject: `🔐 Exclusive Off-Market Property: ${propertyData.title}`,
      data: {
        name: userName,
        propertyTitle: propertyData.title,
        price: propertyData.price ?? null,
        priceDisplay: propertyData.priceDisplay,
        location: propertyData.location,
        propertyType: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        propertyUrl: propertyData.propertyUrl,
        isOffMarket: true
      }
    });
  }

  /**
   * Send appointment confirmation email
   */
  static async sendAppointmentConfirmation(
    userEmail: string,
    userName: string,
    appointmentData: {
      propertyTitle: string;
      date: string;
      time: string;
      agentName: string;
      agentPhone: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'appointmentConfirmation',
          data: {
            name: userName,
            propertyTitle: appointmentData.propertyTitle,
            date: appointmentData.date,
            time: appointmentData.time,
            agentName: appointmentData.agentName,
            agentPhone: appointmentData.agentPhone
          }
        }
      });
    } catch (error) {
      console.error('Error sending appointment confirmation email:', error);
    }
  }

  /**
   * Send appointment notification email to agent
   */
  static async sendAppointmentNotification(
    agentEmail: string,
    agentName: string,
    appointmentData: {
      clientName: string;
      clientEmail: string;
      clientPhone: string;
      appointmentType: string;
      date: string;
      time: string;
      duration: number;
      location: string;
      notes: string;
      appointmentId: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: agentEmail,
          template: 'appointmentNotification',
          data: {
            agentName: agentName,
            clientName: appointmentData.clientName,
            clientEmail: appointmentData.clientEmail,
            clientPhone: appointmentData.clientPhone,
            appointmentType: appointmentData.appointmentType,
            date: appointmentData.date,
            time: appointmentData.time,
            duration: appointmentData.duration,
            location: appointmentData.location,
            notes: appointmentData.notes,
            appointmentId: appointmentData.appointmentId
          },
          subject: `New Appointment Scheduled - ${appointmentData.clientName}`
        }
      });
    } catch (error) {
      console.error('Error sending appointment notification email:', error);
    }
  }

  /**
   * Send market update email
   */
  static async sendMarketUpdate(
    userEmail: string,
    userName: string,
    marketData: {
      area: string;
      avgPrice?: number;
      newListings?: number;
      trend?: string;
      daysOnMarket?: number;
      recommendation?: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'marketUpdate',
          data: {
            name: userName,
            area: marketData.area,
            avgPrice: marketData.avgPrice,
            newListings: marketData.newListings,
            trend: marketData.trend,
            daysOnMarket: marketData.daysOnMarket,
            recommendation: marketData.recommendation
          }
        }
      });
    } catch (error) {
      console.error('Error sending market update email:', error);
    }
  }

  /**
   * Send confirmation that preferences were updated
   */
  static async sendPreferencesUpdated(
    userEmail: string,
    userName?: string,
    preferences: Record<string, any> = {}
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'preferencesUpdated',
          data: {
            name: userName || 'User',
            preferences, // Pass the full preferences object with values
            dashboardUrl: 'https://www.pickfirst.com.au/dashboard'
          },
          subject: 'Your Property Preferences Have Been Updated'
        }
      });
    } catch (error) {
      console.error('Error sending preferences updated email:', error);
    }
  }

  /**
   * Send confirmation that search preferences were saved
   */
  static async sendSearchPreferencesSaved(
    userEmail: string,
    userName: string,
    criteria: {
      location?: string;
      minPrice?: number;
      maxPrice?: number;
      propertyType?: string;
      bedrooms?: number;
      bathrooms?: number;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'searchPreferencesSaved',
          data: {
            name: userName,
            ...criteria
          },
          subject: 'Search preferences saved'
        }
      });
    } catch (error) {
      console.error('Error sending search preferences saved email:', error);
    }
  }

  /**
   * Send a digest of new matching properties (call from a scheduled job)
   */
  static async sendNewMatchesDigest(
    userEmail: string,
    userName: string,
    matches: Array<{
      title: string;
      price: number;
      city?: string;
      state?: string;
      bedrooms?: number;
      bathrooms?: number;
      url?: string;
    }>
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'newMatchesDigest',
          data: {
            name: userName,
            matches
          },
          subject: 'New properties that match your preferences'
        }
      });
    } catch (error) {
      console.error('Error sending new matches digest:', error);
    }
  }

  /**
   * Send custom template email
   */
  static async sendCustomEmail(emailData: EmailTemplate): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: emailData
      });
    } catch (error) {
      console.error('Error sending custom email:', error);
    }
  }

  /**
   * Send bulk emails (for marketing campaigns)
   */
  static async sendBulkEmails(
    emails: Array<{
      to: string;
      name: string;
      customData?: Record<string, any>;
    }>,
    template: string,
    commonData: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Process emails in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const promises = batch.map(email => 
          supabase.functions.invoke('send-email', {
            body: {
              to: email.to,
              template,
              data: {
                name: email.name,
                ...commonData,
                ...email.customData
              }
            }
          })
        );

        await Promise.allSettled(promises);
        
        // Small delay between batches
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error sending bulk emails:', error);
    }
  }

  /**
   * Send appointment status update email
   */
  static async sendAppointmentStatusUpdate(
    userEmail: string,
    userName: string,
    appointmentData: {
      clientName?: string;
      clientEmail?: string;
      agentName?: string;
      appointmentType: string;
      date: string;
      time: string;
      location: string;
      status: string;
      statusMessage: string;
    }
  ): Promise<void> {
    try {
      console.log('[EmailService] Sending appointment status update email:', {
        to: userEmail,
        status: appointmentData.status,
        appointmentType: appointmentData.appointmentType
      });

      // Send directly via Edge Function for immediate delivery (appointment status updates need to be immediate)
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'appointmentStatusUpdate',
          subject: `Appointment ${appointmentData.status.charAt(0).toUpperCase() + appointmentData.status.slice(1)} - ${appointmentData.appointmentType}`,
          data: {
            name: userName,
            clientName: appointmentData.clientName,
            clientEmail: appointmentData.clientEmail,
            agentName: appointmentData.agentName,
            appointmentType: appointmentData.appointmentType,
            date: appointmentData.date,
            time: appointmentData.time,
            location: appointmentData.location,
            status: appointmentData.status,
            statusMessage: appointmentData.statusMessage,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });

      if (error) {
        console.error('[EmailService] ❌ Error sending appointment status update email:', error);
        console.error('[EmailService] Error details:', {
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
          to: userEmail,
          status: appointmentData.status
        });
        // Fallback: queue the email if direct send fails
        try {
          await this.queueEmail({
            to: userEmail,
            template: 'appointmentStatusUpdate',
            subject: `Appointment ${appointmentData.status.charAt(0).toUpperCase() + appointmentData.status.slice(1)} - ${appointmentData.appointmentType}`,
            data: {
              name: userName,
              clientName: appointmentData.clientName,
              clientEmail: appointmentData.clientEmail,
              agentName: appointmentData.agentName,
              appointmentType: appointmentData.appointmentType,
              date: appointmentData.date,
              time: appointmentData.time,
              location: appointmentData.location,
              status: appointmentData.status,
              statusMessage: appointmentData.statusMessage,
              platformName: 'PickFirst Real Estate',
              platformUrl: 'https://pickfirst.com.au'
            }
          });
          console.log('[EmailService] ✅ Email queued as fallback for:', userEmail);
        } catch (queueError) {
          console.error('[EmailService] ❌ CRITICAL: Failed to queue email as fallback:', queueError);
          throw queueError; // Re-throw so caller knows email failed
        }
      } else if (data?.error) {
        // Check if response body contains an error
        console.error('[EmailService] ❌ Edge function returned error in response:', data.error);
        // Fallback: queue the email
        try {
          await this.queueEmail({
            to: userEmail,
            template: 'appointmentStatusUpdate',
            subject: `Appointment ${appointmentData.status.charAt(0).toUpperCase() + appointmentData.status.slice(1)} - ${appointmentData.appointmentType}`,
            data: {
              name: userName,
              clientName: appointmentData.clientName,
              clientEmail: appointmentData.clientEmail,
              agentName: appointmentData.agentName,
              appointmentType: appointmentData.appointmentType,
              date: appointmentData.date,
              time: appointmentData.time,
              location: appointmentData.location,
              status: appointmentData.status,
              statusMessage: appointmentData.statusMessage,
              platformName: 'PickFirst Real Estate',
              platformUrl: 'https://pickfirst.com.au'
            }
          });
          console.log('[EmailService] ✅ Email queued as fallback for:', userEmail);
        } catch (queueError) {
          console.error('[EmailService] ❌ CRITICAL: Failed to queue email as fallback:', queueError);
          throw new Error(`Failed to send or queue email: ${data.error}`);
        }
      } else {
        console.log('[EmailService] ✅ Appointment status update email sent successfully to:', userEmail);
        console.log('[EmailService] Response data:', data);
      }
    } catch (error) {
      console.error('[EmailService] Exception sending appointment status update email:', error);
      // Fallback: try to queue the email even if there's an exception
      try {
        await this.queueEmail({
          to: userEmail,
          template: 'appointmentStatusUpdate',
          subject: `Appointment ${appointmentData.status.charAt(0).toUpperCase() + appointmentData.status.slice(1)} - ${appointmentData.appointmentType}`,
          data: {
            name: userName,
            clientName: appointmentData.clientName,
            clientEmail: appointmentData.clientEmail,
            agentName: appointmentData.agentName,
            appointmentType: appointmentData.appointmentType,
            date: appointmentData.date,
            time: appointmentData.time,
            location: appointmentData.location,
            status: appointmentData.status,
            statusMessage: appointmentData.statusMessage,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://pickfirst.com.au'
          }
        });
        console.log('[EmailService] Appointment status update email queued as fallback');
      } catch (queueError) {
        console.error('[EmailService] Failed to queue appointment status update email:', queueError);
      }
    }
  }


  /**
   * Send agent-specific welcome email
   */
  static async sendAgentWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'agentWelcome',
          data: {
            name: userName,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending agent welcome email:', error);
    }
  }

  /**
   * Send buyer-specific welcome email
   */
  static async sendBuyerWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'buyerWelcome',
          data: {
            name: userName,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending buyer welcome email:', error);
    }
  }

  /**
   * Send security alert email
   */
  static async sendSecurityAlertEmail(
    userEmail: string,
    userName: string,
    alertData: {
      activity: string;
      timestamp: string;
      location: string;
      device: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'securityAlert',
          data: {
            name: userName,
            ...alertData,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending security alert email:', error);
    }
  }

  /**
   * Send message notification email
   */
  static async sendMessageNotification(
    recipientEmail: string,
    recipientName: string,
    messageData: {
      senderName: string;
      senderEmail: string;
      messagePreview: string;
      messageContent?: string;
      conversationId: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: recipientEmail,
          template: 'messageNotification',
          data: {
            recipientName,
            ...messageData,
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending message notification email:', error);
    }
  }

  /**
   * Send lead assignment notification to agent
   */
  static async sendLeadAssignmentEmail(
    agentEmail: string,
    agentName: string,
    leadData: {
      clientName: string;
      clientEmail: string;
      clientPhone: string;
      propertyType: string;
      location: string;
      budgetRange: string;
      leadId: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: agentEmail,
          template: 'leadAssignment',
          data: {
            agentName,
            ...leadData,
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending lead assignment email:', error);
    }
  }

  /**
   * Send property viewing reminder
   */
  static async sendViewingReminderEmail(
    userEmail: string,
    userName: string,
    viewingData: {
      propertyTitle: string;
      address: string;
      time: string;
      agentName: string;
      agentPhone: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'propertyViewing',
          data: {
            name: userName,
            ...viewingData,
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending viewing reminder email:', error);
    }
  }

  /**
   * Send follow-up email
   */
  static async sendFollowUpEmail(
    userEmail: string,
    userName: string,
    followUpData: {
      subject: string;
      message: string;
      nextSteps?: string[];
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'followUp',
          data: {
            name: userName,
            ...followUpData,
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error('Error sending follow-up email:', error);
    }
  }

  /**
   * Send subscription-related emails
   */
  static async sendSubscriptionEmail(
    userEmail: string,
    userName: string,
    type: 'upgrade' | 'expiry' | 'paymentSuccess' | 'paymentFailed' | 'suspension',
    subscriptionData: {
      planName?: string;
      amount?: number;
      interval?: string;
      nextBillingDate?: string;
      features?: string[];
      daysLeft?: number;
      expiryDate?: string;
      transactionId?: string;
      paymentDate?: string;
      billingPeriod?: string;
      failureReason?: string;
      attemptDate?: string;
      reason?: string;
      suspensionDate?: string;
      duration?: string;
    }
  ): Promise<void> {
    try {
      const templateMap = {
        upgrade: 'subscriptionUpgrade',
        expiry: 'subscriptionExpiry',
        paymentSuccess: 'paymentSuccess',
        paymentFailed: 'paymentFailed',
        suspension: 'accountSuspension'
      };

      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: templateMap[type],
          data: {
            name: userName,
            ...subscriptionData,
            platformUrl: 'https://pickfirst.com.au'
          }
        }
      });
    } catch (error) {
      console.error(`Error sending ${type} email:`, error);
    }
  }

  /**
   * Send bulk marketing campaign emails
   */
  static async sendBulkMarketingEmail(
    emails: Array<{
      to: string;
      name: string;
    }>,
    campaignData: {
      subject: string;
      title: string;
      content: string;
      callToAction?: string;
      callToActionUrl?: string;
      unsubscribeUrl?: string;
    }
  ): Promise<void> {
    try {
      const batchSize = 10;
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const promises = batch.map(email => 
          supabase.functions.invoke('send-email', {
            body: {
              to: email.to,
              template: 'bulkCampaign',
              data: {
                name: email.name,
                ...campaignData,
                platformUrl: 'https://pickfirst.com.au'
              }
            }
          })
        );

        await Promise.allSettled(promises);
        
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error sending bulk marketing emails:', error);
    }
  }

  /**
   * Get all super admin emails
   */
  static async getSuperAdminEmails(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'super_admin');

      if (error) {
        console.error('Error fetching super admin emails:', error);
        return [];
      }

      return data?.map(admin => admin.email).filter(Boolean) || [];
    } catch (error) {
      console.error('Error fetching super admin emails:', error);
      return [];
    }
  }

  /**
   * Send security alert to all super admins
   */
  static async sendSecurityAlertToAdmins(
    alertType: 'suspicious_login' | 'brute_force' | 'new_location' | 'multiple_failures',
    alertData: SuspiciousLoginData
  ): Promise<void> {
    try {
      const superAdminEmails = await this.getSuperAdminEmails();
      
      if (superAdminEmails.length === 0) {
        console.warn('[EmailService] No super admins found to send security alert');
        return;
      }

      console.log(`[EmailService] Sending security alert to ${superAdminEmails.length} super admins`);

      const alertTitles: Record<string, string> = {
        suspicious_login: '🚨 Suspicious Login Detected',
        brute_force: '🔴 Brute Force Attack Detected',
        new_location: '⚠️ Login from New Location',
        multiple_failures: '⚠️ Multiple Failed Login Attempts'
      };

      const subject = alertTitles[alertType] || '🚨 Security Alert';

      // Send to all super admins
      const promises = superAdminEmails.map(adminEmail => 
        supabase.functions.invoke('send-email', {
          body: {
            to: adminEmail,
            template: 'securityAlert',
            data: {
              alertType,
              alertTitle: subject,
              targetEmail: alertData.email,
              ipAddress: alertData.ip_address,
              location: alertData.location_info 
                ? `${alertData.location_info.city || 'Unknown'}, ${alertData.location_info.region || ''} ${alertData.location_info.country || ''}`
                : 'Unknown location',
              device: alertData.device_info
                ? `${alertData.device_info.browser || 'Unknown'} on ${alertData.device_info.os || 'Unknown'} (${alertData.device_info.device || 'Unknown'})`
                : 'Unknown device',
              attemptsLastHour: alertData.attempts_last_hour || 0,
              failureReason: alertData.failure_reason || 'N/A',
              timestamp: alertData.created_at,
              platformName: 'PickFirst Real Estate',
              platformUrl: 'https://pickfirst.com.au',
              dashboardUrl: 'https://pickfirst.com.au/admin/login-history'
            }
          }
        })
      );

      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`[EmailService] Security alerts sent: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        console.error('[EmailService] Some security alerts failed to send');
      }
    } catch (error) {
      console.error('[EmailService] Error sending security alerts:', error);
    }
  }

  /**
   * Check for suspicious login activity and alert admins
   * Auto-blocks user, IP, and device after 10 failed attempts
   */
  static async checkAndAlertSuspiciousLogin(loginData: {
    email: string;
    ip_address: string;
    success: boolean;
    failure_reason?: string;
    location_info?: any;
    device_info?: any;
  }): Promise<void> {
    try {
      console.log(`[EmailService] checkAndAlertSuspiciousLogin called:`, {
        email: loginData.email,
        ip: loginData.ip_address,
        success: loginData.success,
        failure_reason: loginData.failure_reason
      });
      
      // Skip check if IP is unknown or invalid
      if (!loginData.ip_address || loginData.ip_address === 'unknown' || loginData.ip_address === 'invalid-format') {
        console.warn(`[EmailService] Skipping suspicious login check - invalid IP: ${loginData.ip_address}`);
        return;
      }

      // Check if this IP has multiple failed attempts
      // Trim IP to handle any whitespace issues
      const cleanIP = loginData.ip_address.trim();
      
      console.log(`[EmailService] Checking suspicious activity for IP: ${cleanIP}, Email: ${loginData.email}`);
      
      // First, try using the suspicious_logins view (more efficient and already filtered)
      const { data: suspiciousData, error: suspiciousError } = await supabase
        .from('suspicious_logins')
        .select('*')
        .eq('ip_address', cleanIP)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log(`[EmailService] Suspicious logins view query:`, {
        found: suspiciousData?.length || 0,
        data: suspiciousData?.slice(0, 3), // Show first 3
        error: suspiciousError
      });
      
      // Also query login_history directly as fallback
      const { data: recentAttempts, error } = await supabase
        .from('login_history')
        .select('id, ip_address, email, success, failure_reason, created_at')
        .eq('ip_address', cleanIP)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      console.log(`[EmailService] Query result for IP ${cleanIP}:`, {
        foundAttempts: recentAttempts?.length || 0,
        attempts: recentAttempts,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null
      });

      if (error) {
        console.error('[EmailService] Error checking recent login attempts:', {
          error,
          ip: cleanIP,
          code: error.code,
          message: error.message
        });
        // Don't return - continue to check if we can still get some data
        // Sometimes RLS errors still return partial data
      }

      // Use suspicious_logins view data if available, otherwise use direct query
      const attemptsToCheck = suspiciousData && suspiciousData.length > 0 
        ? suspiciousData 
        : recentAttempts;
      
      // If query returned empty, try a broader query to debug
      if (!attemptsToCheck || attemptsToCheck.length === 0) {
        console.warn(`[EmailService] No attempts found for IP ${cleanIP} in last hour, checking all time...`);
        const { data: allAttempts, error: allError } = await supabase
          .from('login_history')
          .select('id, ip_address, email, success, created_at')
          .eq('ip_address', cleanIP)
          .order('created_at', { ascending: false })
          .limit(20);
        
        console.log(`[EmailService] All-time query for IP ${cleanIP}:`, {
          foundAttempts: allAttempts?.length || 0,
          attempts: allAttempts,
          error: allError
        });
        
        // If we found attempts in all-time but not in last hour, use all-time for now
        if (allAttempts && allAttempts.length > 0) {
          console.warn(`[EmailService] Found ${allAttempts.length} attempts in all-time but 0 in last hour - possible timezone/query issue`);
          // Use all-time data but filter to last hour manually
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recentFromAll = allAttempts.filter(a => new Date(a.created_at) >= oneHourAgo);
          if (recentFromAll.length > 0) {
            console.log(`[EmailService] After manual filtering: ${recentFromAll.length} attempts in last hour`);
            // Use the manually filtered data
            const failedAttempts = recentFromAll.filter(a => !a.success) || [];
            const totalAttempts = recentFromAll.length;
            
            // Continue with the logic below using these values
            const shouldAlert = failedAttempts.length >= 3 || totalAttempts >= 5;
            const shouldAutoBlock = failedAttempts.length >= 10 || totalAttempts >= 10;
            
            if (shouldAutoBlock) {
              console.log(`[EmailService] Auto-blocking based on all-time query: ${failedAttempts.length} failed, ${totalAttempts} total`);
              await this.autoBlockUserAndIP(loginData.email, loginData.ip_address, loginData.device_info);
            } else if (shouldAlert) {
              console.log(`[EmailService] Alerting based on all-time query: ${failedAttempts.length} failed, ${totalAttempts} total`);
            }
            return; // Exit early since we handled it
          }
        }
      }

      const failedAttempts = attemptsToCheck?.filter(a => !a.success) || [];
      const totalAttempts = attemptsToCheck?.length || 0;

      // Debug logging
      console.log(`[EmailService] Suspicious login check for IP ${loginData.ip_address}:`, {
        totalAttempts,
        failedAttempts: failedAttempts.length,
        email: loginData.email,
        attemptsToCheck: attemptsToCheck?.slice(0, 5), // Show first 5 for debugging
        usingSuspiciousView: suspiciousData && suspiciousData.length > 0
      });

      // Alert conditions:
      // 1. More than 5 failed attempts from same IP in last hour
      // 2. More than 10 total attempts from same IP in last hour (auto-block)
      // 3. Failed login with no prior successful logins from this IP

      let shouldAlert = false;
      let shouldAutoBlock = false;
      let alertType: 'suspicious_login' | 'brute_force' | 'new_location' | 'multiple_failures' = 'suspicious_login';

      if (failedAttempts.length >= 10) {
        shouldAlert = true;
        shouldAutoBlock = true;
        alertType = 'brute_force';
        console.log(`[EmailService] Triggering auto-block: ${failedAttempts.length} failed attempts >= 10`);
      } else if (totalAttempts >= 10) {
        shouldAlert = true;
        shouldAutoBlock = true;
        alertType = 'brute_force';
        console.log(`[EmailService] Triggering auto-block: ${totalAttempts} total attempts >= 10`);
      } else if (failedAttempts.length >= 5) {
        shouldAlert = true;
        alertType = 'multiple_failures';
      } else if (!loginData.success && failedAttempts.length >= 3) {
        shouldAlert = true;
        alertType = 'multiple_failures';
      }

      // Auto-block after 10 failed attempts OR 10 total attempts
      if (shouldAutoBlock) {
        console.log(`[EmailService] Auto-blocking due to ${failedAttempts.length} failed attempts (${totalAttempts} total)`);
        await this.autoBlockUserAndIP(loginData.email, loginData.ip_address, loginData.device_info);
      }

      if (shouldAlert) {
        console.log(`[EmailService] Suspicious activity detected: ${alertType}`);
        
        await this.sendSecurityAlertToAdmins(alertType, {
          email: loginData.email,
          ip_address: loginData.ip_address,
          location_info: loginData.location_info,
          device_info: loginData.device_info,
          attempts_last_hour: totalAttempts,
          failure_reason: loginData.failure_reason,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[EmailService] Error checking suspicious login:', error);
    }
  }

  /**
   * Auto-block user, IP, and device after 10 failed attempts
   */
  static async autoBlockUserAndIP(
    email: string, 
    ipAddress: string, 
    deviceInfo?: any
  ): Promise<void> {
    try {
      console.log(`[EmailService] Auto-blocking user: ${email}, IP: ${ipAddress}`);

      // 1. Suspend the user account
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, subscription_status')
        .eq('email', email)
        .single();

      if (userProfile && userProfile.subscription_status !== 'suspended') {
        await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', userProfile.id);
        
        console.log(`[EmailService] User ${email} suspended`);
      }

      // 2. Block the IP address
      const blockResult = await this.blockIP(ipAddress, `Brute force attack targeting: ${email}`, 'system');
      if (blockResult.error) {
        console.error(`[EmailService] Failed to block IP ${ipAddress}:`, blockResult.error);
        // Try using the database function as fallback
        try {
          const { error: rpcError } = await (supabase as any)
            .rpc('block_ip', { 
              ip_address_to_block: ipAddress,
              block_reason: `Brute force attack targeting: ${email}`,
              blocked_by_user: 'system'
            });
          if (rpcError) {
            console.error(`[EmailService] Failed to block IP via RPC:`, rpcError);
          } else {
            console.log(`[EmailService] IP ${ipAddress} blocked via RPC function`);
          }
        } catch (rpcErr) {
          console.error(`[EmailService] RPC block_ip function error:`, rpcErr);
        }
      }

      // 3. Block the device if device info is available
      if (deviceInfo?.browser && deviceInfo?.os) {
        await this.blockDevice(deviceInfo, `Brute force attack targeting: ${email}`, 'system');
      }

      console.log(`[EmailService] Auto-block completed for ${email}`);
    } catch (error) {
      console.error('[EmailService] Error auto-blocking:', error);
    }
  }

  /**
   * Block an IP address
   */
  static async blockIP(
    ipAddress: string, 
    reason: string, 
    blockedBy: string = 'system'
  ): Promise<{ error: any }> {
    try {
      // Check if already blocked (using 'as any' - types generated after migration)
      const { data: existing } = await (supabase as any)
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', ipAddress)
        .single();

      if (existing) {
        console.log(`[EmailService] IP ${ipAddress} already blocked`);
        return { error: null };
      }

      const { error } = await (supabase as any)
        .from('blocked_ips')
        .insert({
          ip_address: ipAddress,
          reason,
          blocked_by: blockedBy,
          blocked_at: new Date().toISOString(),
          is_active: true
        });

      if (error) {
        // If table doesn't exist, log but don't fail
        if (error.code === '42P01') {
          console.warn('[EmailService] blocked_ips table does not exist, skipping IP block');
          return { error: null };
        }
        throw error;
      }

      console.log(`[EmailService] IP ${ipAddress} blocked successfully`);
      return { error: null };
    } catch (error) {
      console.error('[EmailService] Error blocking IP:', error);
      return { error };
    }
  }

  /**
   * Block a device
   */
  static async blockDevice(
    deviceInfo: any, 
    reason: string, 
    blockedBy: string = 'system'
  ): Promise<{ error: any }> {
    try {
      const deviceFingerprint = `${deviceInfo.browser || 'unknown'}_${deviceInfo.os || 'unknown'}_${deviceInfo.device || 'unknown'}`;

      // Using 'as any' - types generated after migration
      const { error } = await (supabase as any)
        .from('blocked_devices')
        .insert({
          device_fingerprint: deviceFingerprint,
          device_info: deviceInfo,
          reason,
          blocked_by: blockedBy,
          blocked_at: new Date().toISOString(),
          is_active: true
        });

      if (error) {
        // If table doesn't exist, log but don't fail
        if (error.code === '42P01') {
          console.warn('[EmailService] blocked_devices table does not exist, skipping device block');
          return { error: null };
        }
        throw error;
      }

      console.log(`[EmailService] Device ${deviceFingerprint} blocked successfully`);
      return { error: null };
    } catch (error) {
      console.error('[EmailService] Error blocking device:', error);
      return { error };
    }
  }

  /**
   * Check if an IP is blocked
   */
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      // First try using the database function (more secure)
      const { data: functionResult, error: functionError } = await (supabase as any)
        .rpc('is_ip_blocked', { ip_address_to_check: ipAddress });

      if (!functionError && functionResult !== null) {
        return functionResult === true;
      }

      // Fallback to direct table query if function doesn't exist yet
      // Using 'as any' - types generated after migration
      const { data, error } = await (supabase as any)
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', ipAddress)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine (IP not blocked)
        if (error.code === '42P01') {
          // Table doesn't exist - migration hasn't been run
          console.warn('[EmailService] blocked_ips table does not exist. Run migration 20251213_fix_suspend_and_ip_blocking.sql');
          return false;
        }
        if (error.code === '42883') {
          // Function doesn't exist - migration hasn't been run
          console.warn('[EmailService] is_ip_blocked function does not exist. Run migration 20251213_fix_suspend_and_ip_blocking.sql');
          return false;
        }
        console.error('[EmailService] Error checking blocked IP:', error);
      }

      return !!data;
    } catch (error) {
      console.error('[EmailService] Error checking blocked IP:', error);
      return false;
    }
  }

  /**
   * Unblock an IP address (for admin use)
   */
  static async unblockIP(ipAddress: string): Promise<{ error: any }> {
    try {
      // Using 'as any' - types generated after migration
      const { error } = await (supabase as any)
        .from('blocked_ips')
        .update({ is_active: false, unblocked_at: new Date().toISOString() })
        .eq('ip_address', ipAddress);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Get all blocked IPs (for admin use)
   */
  static async getBlockedIPs(): Promise<{ data: any[]; error: any }> {
    try {
      // Using 'as any' - types generated after migration
      const { data, error } = await (supabase as any)
        .from('blocked_ips')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
}

export default EmailService;