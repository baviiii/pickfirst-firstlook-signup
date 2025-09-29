import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  to: string;
  template: string;
  data: Record<string, any>;
  subject?: string;
}

export class EmailService {
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup',
            userId
          }
        }
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  /**
   * Send property alert email
   */
  static async sendPropertyAlert(
    userEmail: string, 
    userName: string, 
    propertyData: {
      title: string;
      price: number;
      location: string;
      propertyType: string;
      bedrooms: number;
      bathrooms: number;
      propertyUrl?: string;
    }
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'propertyAlert',
          data: {
            name: userName,
            propertyTitle: propertyData.title,
            price: propertyData.price,
            location: propertyData.location,
            propertyType: propertyData.propertyType,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            propertyUrl: propertyData.propertyUrl
          }
        }
      });
    } catch (error) {
      console.error('Error sending property alert email:', error);
    }
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
    changedFields: string[] = []
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'preferencesUpdated',
          data: {
            name: userName || 'User',
            changedFields
          },
          subject: 'Your preferences were updated'
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
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'appointmentStatusUpdate',
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
          },
          subject: `Appointment ${appointmentData.status.charAt(0).toUpperCase() + appointmentData.status.slice(1)} - ${appointmentData.appointmentType}`
        }
      });
    } catch (error) {
      console.error('Error sending appointment status update email:', error);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(userEmail: string, resetUrl?: string): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          template: 'passwordReset',
          data: {
            email: userEmail,
            resetUrl: resetUrl || `${window.location.origin}/reset-password`,
            platformName: 'PickFirst Real Estate',
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
          },
          subject: 'Reset Your Password - PickFirst Real Estate'
        }
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
      messagePreview: string;
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
            platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
                platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup'
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
}

export default EmailService;