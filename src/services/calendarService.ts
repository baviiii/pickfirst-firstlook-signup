import { supabase } from '@/integrations/supabase/client';
import { Appointment } from './appointmentService';

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: Array<{
    email: string;
    name: string;
  }>;
  calendarId?: string;
}

export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: 'google' | 'outlook' | 'apple';
  accessToken: string;
  refreshToken?: string;
  calendarId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CalendarService {
  /**
   * Get user's calendar integrations
   */
  static async getCalendarIntegrations(userId: string): Promise<{ data: CalendarIntegration[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * Create a calendar event from an appointment
   */
  static async createCalendarEvent(
    appointment: Appointment,
    agentName: string,
    agentEmail: string,
    agentPhone?: string
  ): Promise<{ data: CalendarEvent | null; error: any }> {
    try {
      const startDateTime = new Date(`${appointment.date}T${appointment.time}`);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration * 60000));

      const event: CalendarEvent = {
        title: `${appointment.appointment_type.replace('_', ' ').toUpperCase()} - ${appointment.client_name}`,
        description: this.generateEventDescription(appointment, agentName, agentPhone),
        start: startDateTime,
        end: endDateTime,
        location: appointment.property_address,
        attendees: [
          {
            email: appointment.client_email,
            name: appointment.client_name
          },
          {
            email: agentEmail,
            name: agentName
          }
        ]
      };

      // Get user's calendar integrations
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const { data: integrations } = await this.getCalendarIntegrations(user.id);
      
      if (integrations && integrations.length > 0) {
        // Sync to all active calendar integrations
        const syncPromises = integrations.map(integration => 
          this.syncToCalendar(integration, event)
        );
        
        await Promise.allSettled(syncPromises);
      }

      return { data: event, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate event description from appointment data
   */
  private static generateEventDescription(
    appointment: Appointment,
    agentName: string,
    agentPhone?: string
  ): string {
    let description = `Appointment Type: ${appointment.appointment_type.replace('_', ' ').toUpperCase()}\n`;
    description += `Client: ${appointment.client_name}\n`;
    description += `Client Email: ${appointment.client_email}\n`;
    
    if (appointment.client_phone) {
      description += `Client Phone: ${appointment.client_phone}\n`;
    }
    
    description += `Agent: ${agentName}\n`;
    
    if (agentPhone) {
      description += `Agent Phone: ${agentPhone}\n`;
    }
    
    if (appointment.notes) {
      description += `\nNotes: ${appointment.notes}\n`;
    }
    
    description += `\nCreated via PickFirst Real Estate Platform`;
    
    return description;
  }

  /**
   * Sync event to specific calendar provider
   */
  private static async syncToCalendar(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<{ success: boolean; error?: any }> {
    try {
      switch (integration.provider) {
        case 'google':
          return await this.syncToGoogleCalendar(integration, event);
        case 'outlook':
          return await this.syncToOutlookCalendar(integration, event);
        case 'apple':
          return await this.syncToAppleCalendar(integration, event);
        default:
          return { success: false, error: 'Unsupported calendar provider' };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Sync to Google Calendar
   */
  private static async syncToGoogleCalendar(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // Use Supabase Edge Function for Google Calendar integration
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'create_event',
          accessToken: integration.accessToken,
          calendarId: integration.calendarId,
          event: {
            summary: event.title,
            description: event.description,
            start: {
              dateTime: event.start.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: event.end.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            location: event.location,
            attendees: event.attendees?.map(attendee => ({
              email: attendee.email,
              displayName: attendee.name
            }))
          }
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      return { success: false, error };
    }
  }

  /**
   * Sync to Outlook Calendar
   */
  private static async syncToOutlookCalendar(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // Use Supabase Edge Function for Outlook Calendar integration
      const { data, error } = await supabase.functions.invoke('outlook-calendar-sync', {
        body: {
          action: 'create_event',
          accessToken: integration.accessToken,
          calendarId: integration.calendarId,
          event: {
            subject: event.title,
            body: {
              contentType: 'text',
              content: event.description
            },
            start: {
              dateTime: event.start.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: event.end.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            location: {
              displayName: event.location
            },
            attendees: event.attendees?.map(attendee => ({
              emailAddress: {
                address: attendee.email,
                name: attendee.name
              }
            }))
          }
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Outlook Calendar sync error:', error);
      return { success: false, error };
    }
  }

  /**
   * Sync to Apple Calendar (iCloud)
   */
  private static async syncToAppleCalendar(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // Apple Calendar integration would require CalDAV protocol
      // For now, we'll generate an ICS file that can be imported
      const icsContent = this.generateICSFile(event);
      
      // Store the ICS file and provide download link
      const { data, error } = await supabase.storage
        .from('calendar-files')
        .upload(`${integration.userId}/${event.id || Date.now()}.ics`, icsContent, {
          contentType: 'text/calendar',
          upsert: true
        });

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Apple Calendar sync error:', error);
      return { success: false, error };
    }
  }

  /**
   * Generate ICS file content for Apple Calendar
   */
  private static generateICSFile(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const uid = event.id || `pickfirst-${Date.now()}`;
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PickFirst Real Estate//Appointment//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.location || ''}
${event.attendees?.map(attendee => `ATTENDEE:mailto:${attendee.email}`).join('\n') || ''}
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Update calendar event
   */
  static async updateCalendarEvent(
    appointment: Appointment,
    agentName: string,
    agentEmail: string,
    agentPhone?: string
  ): Promise<{ data: CalendarEvent | null; error: any }> {
    try {
      // Similar to createCalendarEvent but for updates
      return await this.createCalendarEvent(appointment, agentName, agentEmail, agentPhone);
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Delete calendar event
   */
  static async deleteCalendarEvent(
    appointmentId: string,
    userId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: integrations } = await this.getCalendarIntegrations(userId);
      
      if (integrations && integrations.length > 0) {
        const deletePromises = integrations.map(integration => 
          this.deleteFromCalendar(integration, appointmentId)
        );
        
        await Promise.allSettled(deletePromises);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete event from specific calendar provider
   */
  private static async deleteFromCalendar(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      switch (integration.provider) {
        case 'google':
          return await this.deleteFromGoogleCalendar(integration, eventId);
        case 'outlook':
          return await this.deleteFromOutlookCalendar(integration, eventId);
        case 'apple':
          return await this.deleteFromAppleCalendar(integration, eventId);
        default:
          return { success: false, error: 'Unsupported calendar provider' };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete from Google Calendar
   */
  private static async deleteFromGoogleCalendar(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'delete_event',
          accessToken: integration.accessToken,
          calendarId: integration.calendarId,
          eventId: eventId
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete from Outlook Calendar
   */
  private static async deleteFromOutlookCalendar(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.functions.invoke('outlook-calendar-sync', {
        body: {
          action: 'delete_event',
          accessToken: integration.accessToken,
          calendarId: integration.calendarId,
          eventId: eventId
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete from Apple Calendar
   */
  private static async deleteFromAppleCalendar(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // For Apple Calendar, we can't directly delete via API
      // The user would need to manually delete the imported event
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
}

export default CalendarService;
