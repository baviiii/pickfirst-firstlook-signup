/**
 * Zod validation schemas for type-safe form validation
 * These schemas provide compile-time type safety and runtime validation
 */

import { z } from 'zod';

// ============= Authentication Schemas =============

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .toLowerCase(),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a number'),
  
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Name too long')
    .optional(),
  
  userType: z.enum(['buyer', 'agent']).default('buyer'),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  
  password: z
    .string()
    .min(1, 'Password is required'),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a number'),
  
  confirmPassword: z.string(),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// ============= Property Listing Schemas =============

export const propertyListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title too long'),
  
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description too long')
    .optional(),
  
  property_type: z.enum(['house', 'apartment', 'condo', 'townhouse', 'land', 'commercial']),
  
  address: z
    .string()
    .trim()
    .min(5, 'Address is required')
    .max(500, 'Address too long'),
  
  city: z
    .string()
    .trim()
    .min(2, 'City is required')
    .max(100, 'City name too long'),
  
  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(100, 'State name too long'),
  
  zip_code: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'Invalid zip code format'),
  
  price: z
    .number()
    .positive('Price must be positive')
    .max(999999999, 'Price too high'),
  
  bedrooms: z
    .number()
    .int('Bedrooms must be a whole number')
    .min(0, 'Bedrooms cannot be negative')
    .max(50, 'Too many bedrooms')
    .optional(),
  
  bathrooms: z
    .number()
    .min(0, 'Bathrooms cannot be negative')
    .max(50, 'Too many bathrooms')
    .optional(),
  
  square_feet: z
    .number()
    .int('Square feet must be a whole number')
    .positive('Square feet must be positive')
    .max(1000000, 'Square feet too large')
    .optional(),
  
  garages: z
    .number()
    .int('Garages must be a whole number')
    .min(0, 'Garages cannot be negative')
    .max(20, 'Too many garages')
    .optional(),
  
  contact_email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .optional(),
  
  contact_phone: z
    .string()
    .trim()
    .regex(/^[0-9\s\-\+\(\)]+$/, 'Invalid phone number format')
    .max(20, 'Phone number too long')
    .optional(),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

// ============= Client Management Schemas =============

export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name too long'),
  
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .optional(),
  
  phone: z
    .string()
    .trim()
    .regex(/^[0-9\s\-\+\(\)]+$/, 'Invalid phone number format')
    .max(20, 'Phone number too long')
    .optional(),
  
  budget_range: z
    .string()
    .trim()
    .max(100, 'Budget range too long')
    .optional(),
  
  property_type: z
    .string()
    .trim()
    .max(50, 'Property type too long')
    .optional(),
  
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes too long')
    .optional(),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

// ============= Message Schemas =============

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)'),
  
  conversation_id: z
    .string()
    .uuid('Invalid conversation ID'),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

// ============= Appointment Schemas =============

export const appointmentSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(2, 'Client name must be at least 2 characters')
    .max(200, 'Name too long'),
  
  client_email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(254, 'Email too long'),
  
  client_phone: z
    .string()
    .trim()
    .regex(/^[0-9\s\-\+\(\)]+$/, 'Invalid phone number format')
    .max(20, 'Phone number too long')
    .optional(),
  
  appointment_type: z.enum(['property_viewing', 'consultation', 'meeting', 'other']),
  
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum duration is 15 minutes')
    .max(480, 'Maximum duration is 8 hours')
    .default(60),
  
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes too long')
    .optional(),
  
  csrfToken: z.string().length(64, 'Invalid CSRF token')
});

// ============= Type Exports =============

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type PropertyListingFormData = z.infer<typeof propertyListingSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type AppointmentFormData = z.infer<typeof appointmentSchema>;
