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
            platformUrl: window.location.origin,
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
}

export default EmailService;