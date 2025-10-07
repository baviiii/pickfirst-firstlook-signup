drop extension if exists "pg_net";

drop trigger if exists "trigger_send_initial_inquiry_message" on "public"."conversations";

drop trigger if exists "trigger_create_conversation_for_inquiry" on "public"."property_inquiries";

drop policy "Agents can create conversations with clients" on "public"."conversations";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Users can view own profile" on "public"."profiles";

drop policy "Agents can delete own listings" on "public"."property_listings";

drop policy "Agents can insert own listings" on "public"."property_listings";

drop policy "Agents can update own listings" on "public"."property_listings";

drop policy "Agents can view own listings" on "public"."property_listings";

drop policy "Buyers can view approved listings" on "public"."property_listings";

drop policy "Users can update their own messages" on "public"."messages";

alter table "public"."conversations" drop constraint "conversations_agent_id_client_id_inquiry_id_key";

alter table "public"."conversations" drop constraint "conversations_priority_check";

alter table "public"."conversations" drop constraint "conversations_status_check";

alter table "public"."messages" drop constraint "messages_content_type_check";

alter table "public"."profiles" drop constraint "profiles_email_key";

alter table "public"."property_inquiries" drop constraint "property_inquiries_buyer_id_property_id_key";

alter table "public"."property_inquiries" drop constraint "property_inquiries_conversation_id_fkey";

drop function if exists "public"."create_conversation_for_inquiry"();

drop function if exists "public"."send_initial_inquiry_message"();

drop index if exists "public"."conversations_agent_id_client_id_inquiry_id_key";

drop index if exists "public"."profiles_email_key";

drop index if exists "public"."property_inquiries_buyer_id_property_id_key";


  create table "public"."appointments" (
    "id" uuid not null default gen_random_uuid(),
    "agent_id" uuid not null,
    "client_id" uuid,
    "inquiry_id" uuid,
    "client_name" text not null,
    "client_phone" text,
    "client_email" text not null,
    "property_id" uuid,
    "property_address" text not null default 'Virtual/Office Meeting'::text,
    "appointment_type" text not null,
    "date" date not null,
    "time" time without time zone not null,
    "duration" integer not null default 60,
    "status" text not null default 'scheduled'::text,
    "notes" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."appointments" enable row level security;


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "action" text not null,
    "table_name" text not null,
    "record_id" uuid,
    "old_values" jsonb,
    "new_values" jsonb,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."client_interactions" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "agent_id" uuid not null,
    "interaction_type" text not null,
    "subject" text,
    "content" text,
    "duration_minutes" integer,
    "outcome" text,
    "next_follow_up" timestamp with time zone,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."client_interactions" enable row level security;


  create table "public"."client_notes" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "agent_id" uuid not null,
    "note_type" text not null default 'general'::text,
    "content" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."client_notes" enable row level security;


  create table "public"."clients" (
    "id" uuid not null,
    "agent_id" uuid not null,
    "name" text not null,
    "email" text not null,
    "phone" text,
    "status" text not null default 'lead'::text,
    "budget_range" text,
    "preferred_areas" text[],
    "property_type" text,
    "rating" integer default 0,
    "notes" text,
    "last_contact" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."clients" enable row level security;


  create table "public"."subscription_plans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "price_monthly" numeric(10,2),
    "price_yearly" numeric(10,2),
    "features" jsonb not null default '[]'::jsonb,
    "max_listings" integer,
    "featured_listings_included" integer default 0,
    "priority_support" boolean default false,
    "advanced_analytics" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."subscription_plans" enable row level security;


  create table "public"."system_alerts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text not null,
    "severity" text not null,
    "category" text not null,
    "source" text not null,
    "acknowledged" boolean not null default false,
    "resolved" boolean not null default false,
    "acknowledged_by" uuid,
    "resolved_by" uuid,
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."system_alerts" enable row level security;

alter table "public"."conversations" alter column "agent_id" drop not null;

alter table "public"."conversations" alter column "client_id" drop not null;

alter table "public"."conversations" alter column "priority" drop not null;

alter table "public"."conversations" alter column "status" drop not null;

alter table "public"."conversations" alter column "subject" drop default;

alter table "public"."conversations" alter column "subject" drop not null;

alter table "public"."messages" drop column "updated_at";

alter table "public"."messages" alter column "content_type" drop not null;

alter table "public"."messages" alter column "conversation_id" drop not null;

alter table "public"."messages" alter column "sender_id" drop not null;

alter table "public"."profiles" alter column "id" drop default;

alter table "public"."profiles" alter column "subscription_status" set default 'inactive'::text;

alter table "public"."profiles" alter column "subscription_tier" set default 'free'::text;

alter table "public"."property_inquiries" drop column "conversation_id";

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX client_interactions_pkey ON public.client_interactions USING btree (id);

CREATE UNIQUE INDEX client_notes_pkey ON public.client_notes USING btree (id);

CREATE UNIQUE INDEX clients_agent_id_id_key ON public.clients USING btree (agent_id, id);

CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);

CREATE UNIQUE INDEX conversations_agent_id_client_id_key ON public.conversations USING btree (agent_id, client_id);

CREATE INDEX idx_appointments_agent_id ON public.appointments USING btree (agent_id);

CREATE INDEX idx_appointments_date ON public.appointments USING btree (date);

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);

CREATE INDEX idx_audit_logs_record_id ON public.audit_logs USING btree (record_id);

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

CREATE INDEX idx_client_interactions_client_id ON public.client_interactions USING btree (client_id);

CREATE INDEX idx_client_interactions_created_at ON public.client_interactions USING btree (created_at);

CREATE INDEX idx_client_notes_client_id ON public.client_notes USING btree (client_id);

CREATE INDEX idx_client_notes_created_at ON public.client_notes USING btree (created_at);

CREATE INDEX idx_clients_agent_id ON public.clients USING btree (agent_id);

CREATE INDEX idx_clients_created_at ON public.clients USING btree (created_at);

CREATE INDEX idx_clients_email ON public.clients USING btree (email);

CREATE INDEX idx_clients_status ON public.clients USING btree (status);

CREATE INDEX idx_conversations_agent_id ON public.conversations USING btree (agent_id);

CREATE INDEX idx_conversations_client_id ON public.conversations USING btree (client_id);

CREATE INDEX idx_conversations_priority ON public.conversations USING btree (priority);

CREATE INDEX idx_conversations_status ON public.conversations USING btree (status);

CREATE INDEX idx_messages_content_search ON public.messages USING gin (to_tsvector('english'::regconfig, content));

CREATE INDEX idx_messages_content_type ON public.messages USING btree (content_type);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_messages_delivered_at ON public.messages USING btree (delivered_at);

CREATE INDEX idx_property_listings_agent_id ON public.property_listings USING btree (agent_id);

CREATE INDEX idx_property_listings_created_at ON public.property_listings USING btree (created_at);

CREATE INDEX idx_property_listings_location ON public.property_listings USING btree (city, state);

CREATE INDEX idx_property_listings_price ON public.property_listings USING btree (price);

CREATE INDEX idx_property_listings_status ON public.property_listings USING btree (status);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX system_alerts_pkey ON public.system_alerts USING btree (id);

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."client_interactions" add constraint "client_interactions_pkey" PRIMARY KEY using index "client_interactions_pkey";

alter table "public"."client_notes" add constraint "client_notes_pkey" PRIMARY KEY using index "client_notes_pkey";

alter table "public"."clients" add constraint "clients_pkey" PRIMARY KEY using index "clients_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."system_alerts" add constraint "system_alerts_pkey" PRIMARY KEY using index "system_alerts_pkey";

alter table "public"."appointments" add constraint "appointments_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."appointments" validate constraint "appointments_agent_id_fkey";

alter table "public"."appointments" add constraint "appointments_appointment_type_check" CHECK ((appointment_type = ANY (ARRAY['property_showing'::text, 'consultation'::text, 'contract_review'::text, 'closing'::text, 'follow_up'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_appointment_type_check";

alter table "public"."appointments" add constraint "appointments_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL not valid;

alter table "public"."appointments" validate constraint "appointments_client_id_fkey";

alter table "public"."appointments" add constraint "appointments_inquiry_id_fkey" FOREIGN KEY (inquiry_id) REFERENCES property_inquiries(id) ON DELETE SET NULL not valid;

alter table "public"."appointments" validate constraint "appointments_inquiry_id_fkey";

alter table "public"."appointments" add constraint "appointments_property_id_fkey" FOREIGN KEY (property_id) REFERENCES property_listings(id) ON DELETE SET NULL not valid;

alter table "public"."appointments" validate constraint "appointments_property_id_fkey";

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."client_interactions" add constraint "client_interactions_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."client_interactions" validate constraint "client_interactions_agent_id_fkey";

alter table "public"."client_interactions" add constraint "client_interactions_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."client_interactions" validate constraint "client_interactions_client_id_fkey";

alter table "public"."client_interactions" add constraint "client_interactions_interaction_type_check" CHECK ((interaction_type = ANY (ARRAY['call'::text, 'email'::text, 'text'::text, 'meeting'::text, 'showing'::text, 'offer_submitted'::text, 'offer_accepted'::text, 'offer_rejected'::text]))) not valid;

alter table "public"."client_interactions" validate constraint "client_interactions_interaction_type_check";

alter table "public"."client_notes" add constraint "client_notes_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."client_notes" validate constraint "client_notes_agent_id_fkey";

alter table "public"."client_notes" add constraint "client_notes_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."client_notes" validate constraint "client_notes_client_id_fkey";

alter table "public"."client_notes" add constraint "client_notes_note_type_check" CHECK ((note_type = ANY (ARRAY['general'::text, 'meeting'::text, 'showing'::text, 'offer'::text, 'follow_up'::text, 'important'::text]))) not valid;

alter table "public"."client_notes" validate constraint "client_notes_note_type_check";

alter table "public"."clients" add constraint "clients_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."clients" validate constraint "clients_agent_id_fkey";

alter table "public"."clients" add constraint "clients_agent_id_id_key" UNIQUE using index "clients_agent_id_id_key";

alter table "public"."clients" add constraint "clients_id_fkey" FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."clients" validate constraint "clients_id_fkey";

alter table "public"."clients" add constraint "clients_rating_check" CHECK (((rating >= 0) AND (rating <= 5))) not valid;

alter table "public"."clients" validate constraint "clients_rating_check";

alter table "public"."clients" add constraint "clients_status_check" CHECK ((status = ANY (ARRAY['lead'::text, 'active'::text, 'inactive'::text, 'past_client'::text]))) not valid;

alter table "public"."clients" validate constraint "clients_status_check";

alter table "public"."conversations" add constraint "conversations_agent_id_client_id_key" UNIQUE using index "conversations_agent_id_client_id_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_subscription_status_check" CHECK ((subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text, 'cancelled'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_subscription_status_check";

alter table "public"."profiles" add constraint "profiles_subscription_tier_check" CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'basic'::text, 'premium'::text, 'pro'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_subscription_tier_check";

alter table "public"."system_alerts" add constraint "system_alerts_acknowledged_by_fkey" FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_acknowledged_by_fkey";

alter table "public"."system_alerts" add constraint "system_alerts_category_check" CHECK ((category = ANY (ARRAY['security'::text, 'performance'::text, 'database'::text, 'system'::text, 'user'::text]))) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_category_check";

alter table "public"."system_alerts" add constraint "system_alerts_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_resolved_by_fkey";

alter table "public"."system_alerts" add constraint "system_alerts_severity_check" CHECK ((severity = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text]))) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_severity_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_system_alert(alert_title text, alert_description text, alert_severity text, alert_category text, alert_source text, alert_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO system_alerts (title, description, severity, category, source, metadata)
  VALUES (alert_title, alert_description, alert_severity, alert_category, alert_source, alert_metadata)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_database_statistics()
 RETURNS TABLE(table_name text, row_count bigint, table_size text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'profiles'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('profiles'::regclass)) as table_size
  FROM profiles
  UNION ALL
  SELECT 
    'property_listings'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('property_listings'::regclass)) as table_size
  FROM property_listings
  UNION ALL
  SELECT 
    'property_inquiries'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('property_inquiries'::regclass)) as table_size
  FROM property_inquiries
  UNION ALL
  SELECT 
    'property_favorites'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('property_favorites'::regclass)) as table_size
  FROM property_favorites
  UNION ALL
  SELECT 
    'conversations'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('conversations'::regclass)) as table_size
  FROM conversations
  UNION ALL
  SELECT 
    'messages'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('messages'::regclass)) as table_size
  FROM messages;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'agent' THEN 'agent'
      WHEN NEW.raw_user_meta_data->>'user_type' = 'super_admin' THEN 'super_admin'
      ELSE 'buyer'
    END
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.conversations 
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."appointments" to "anon";

grant insert on table "public"."appointments" to "anon";

grant references on table "public"."appointments" to "anon";

grant select on table "public"."appointments" to "anon";

grant trigger on table "public"."appointments" to "anon";

grant truncate on table "public"."appointments" to "anon";

grant update on table "public"."appointments" to "anon";

grant delete on table "public"."appointments" to "authenticated";

grant insert on table "public"."appointments" to "authenticated";

grant references on table "public"."appointments" to "authenticated";

grant select on table "public"."appointments" to "authenticated";

grant trigger on table "public"."appointments" to "authenticated";

grant truncate on table "public"."appointments" to "authenticated";

grant update on table "public"."appointments" to "authenticated";

grant delete on table "public"."appointments" to "service_role";

grant insert on table "public"."appointments" to "service_role";

grant references on table "public"."appointments" to "service_role";

grant select on table "public"."appointments" to "service_role";

grant trigger on table "public"."appointments" to "service_role";

grant truncate on table "public"."appointments" to "service_role";

grant update on table "public"."appointments" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."client_interactions" to "anon";

grant insert on table "public"."client_interactions" to "anon";

grant references on table "public"."client_interactions" to "anon";

grant select on table "public"."client_interactions" to "anon";

grant trigger on table "public"."client_interactions" to "anon";

grant truncate on table "public"."client_interactions" to "anon";

grant update on table "public"."client_interactions" to "anon";

grant delete on table "public"."client_interactions" to "authenticated";

grant insert on table "public"."client_interactions" to "authenticated";

grant references on table "public"."client_interactions" to "authenticated";

grant select on table "public"."client_interactions" to "authenticated";

grant trigger on table "public"."client_interactions" to "authenticated";

grant truncate on table "public"."client_interactions" to "authenticated";

grant update on table "public"."client_interactions" to "authenticated";

grant delete on table "public"."client_interactions" to "service_role";

grant insert on table "public"."client_interactions" to "service_role";

grant references on table "public"."client_interactions" to "service_role";

grant select on table "public"."client_interactions" to "service_role";

grant trigger on table "public"."client_interactions" to "service_role";

grant truncate on table "public"."client_interactions" to "service_role";

grant update on table "public"."client_interactions" to "service_role";

grant delete on table "public"."client_notes" to "anon";

grant insert on table "public"."client_notes" to "anon";

grant references on table "public"."client_notes" to "anon";

grant select on table "public"."client_notes" to "anon";

grant trigger on table "public"."client_notes" to "anon";

grant truncate on table "public"."client_notes" to "anon";

grant update on table "public"."client_notes" to "anon";

grant delete on table "public"."client_notes" to "authenticated";

grant insert on table "public"."client_notes" to "authenticated";

grant references on table "public"."client_notes" to "authenticated";

grant select on table "public"."client_notes" to "authenticated";

grant trigger on table "public"."client_notes" to "authenticated";

grant truncate on table "public"."client_notes" to "authenticated";

grant update on table "public"."client_notes" to "authenticated";

grant delete on table "public"."client_notes" to "service_role";

grant insert on table "public"."client_notes" to "service_role";

grant references on table "public"."client_notes" to "service_role";

grant select on table "public"."client_notes" to "service_role";

grant trigger on table "public"."client_notes" to "service_role";

grant truncate on table "public"."client_notes" to "service_role";

grant update on table "public"."client_notes" to "service_role";

grant delete on table "public"."clients" to "anon";

grant insert on table "public"."clients" to "anon";

grant references on table "public"."clients" to "anon";

grant select on table "public"."clients" to "anon";

grant trigger on table "public"."clients" to "anon";

grant truncate on table "public"."clients" to "anon";

grant update on table "public"."clients" to "anon";

grant delete on table "public"."clients" to "authenticated";

grant insert on table "public"."clients" to "authenticated";

grant references on table "public"."clients" to "authenticated";

grant select on table "public"."clients" to "authenticated";

grant trigger on table "public"."clients" to "authenticated";

grant truncate on table "public"."clients" to "authenticated";

grant update on table "public"."clients" to "authenticated";

grant delete on table "public"."clients" to "service_role";

grant insert on table "public"."clients" to "service_role";

grant references on table "public"."clients" to "service_role";

grant select on table "public"."clients" to "service_role";

grant trigger on table "public"."clients" to "service_role";

grant truncate on table "public"."clients" to "service_role";

grant update on table "public"."clients" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

grant delete on table "public"."system_alerts" to "anon";

grant insert on table "public"."system_alerts" to "anon";

grant references on table "public"."system_alerts" to "anon";

grant select on table "public"."system_alerts" to "anon";

grant trigger on table "public"."system_alerts" to "anon";

grant truncate on table "public"."system_alerts" to "anon";

grant update on table "public"."system_alerts" to "anon";

grant delete on table "public"."system_alerts" to "authenticated";

grant insert on table "public"."system_alerts" to "authenticated";

grant references on table "public"."system_alerts" to "authenticated";

grant select on table "public"."system_alerts" to "authenticated";

grant trigger on table "public"."system_alerts" to "authenticated";

grant truncate on table "public"."system_alerts" to "authenticated";

grant update on table "public"."system_alerts" to "authenticated";

grant delete on table "public"."system_alerts" to "service_role";

grant insert on table "public"."system_alerts" to "service_role";

grant references on table "public"."system_alerts" to "service_role";

grant select on table "public"."system_alerts" to "service_role";

grant trigger on table "public"."system_alerts" to "service_role";

grant truncate on table "public"."system_alerts" to "service_role";

grant update on table "public"."system_alerts" to "service_role";


  create policy "Agents can create appointments"
  on "public"."appointments"
  as permissive
  for insert
  to public
with check ((agent_id = auth.uid()));



  create policy "Agents can delete their own appointments"
  on "public"."appointments"
  as permissive
  for delete
  to public
using ((agent_id = auth.uid()));



  create policy "Agents can update their own appointments"
  on "public"."appointments"
  as permissive
  for update
  to public
using ((agent_id = auth.uid()));



  create policy "Agents can view their own appointments"
  on "public"."appointments"
  as permissive
  for select
  to public
using ((agent_id = auth.uid()));



  create policy "Admins can view all audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));



  create policy "Users can insert their own audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Agents can delete interactions for their clients"
  on "public"."client_interactions"
  as permissive
  for delete
  to public
using ((auth.uid() = agent_id));



  create policy "Agents can insert interactions for their clients"
  on "public"."client_interactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = agent_id));



  create policy "Agents can update interactions for their clients"
  on "public"."client_interactions"
  as permissive
  for update
  to public
using ((auth.uid() = agent_id));



  create policy "Agents can view interactions for their clients"
  on "public"."client_interactions"
  as permissive
  for select
  to public
using ((auth.uid() = agent_id));



  create policy "agents_can_manage_client_interactions"
  on "public"."client_interactions"
  as permissive
  for all
  to authenticated
using (((((auth.jwt() ->> 'role'::text) = 'agent'::text) AND (agent_id = auth.uid())) OR ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)));



  create policy "Agents can delete notes for their clients"
  on "public"."client_notes"
  as permissive
  for delete
  to public
using ((auth.uid() = agent_id));



  create policy "Agents can insert notes for their clients"
  on "public"."client_notes"
  as permissive
  for insert
  to public
with check ((auth.uid() = agent_id));



  create policy "Agents can update notes for their clients"
  on "public"."client_notes"
  as permissive
  for update
  to public
using ((auth.uid() = agent_id));



  create policy "Agents can view notes for their clients"
  on "public"."client_notes"
  as permissive
  for select
  to public
using ((auth.uid() = agent_id));



  create policy "agents_can_manage_client_notes"
  on "public"."client_notes"
  as permissive
  for all
  to authenticated
using (((((auth.jwt() ->> 'role'::text) = 'agent'::text) AND (agent_id = auth.uid())) OR ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)));



  create policy "Agents can insert new clients for existing buyers"
  on "public"."clients"
  as permissive
  for insert
  to authenticated
with check (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'agent'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = clients.id) AND (profiles.role = 'buyer'::text))))));



  create policy "Agents can insert new clients"
  on "public"."clients"
  as permissive
  for insert
  to authenticated
with check ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'agent'::text));



  create policy "Users can create conversations"
  on "public"."conversations"
  as permissive
  for insert
  to public
with check (((agent_id = auth.uid()) OR (client_id = auth.uid())));



  create policy "Agents can insert buyer profiles"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((role = 'buyer'::text));



  create policy "Agents can update buyer profiles"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((role = 'buyer'::text));



  create policy "Agents can view buyer profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((role = 'buyer'::text));



  create policy "Super admins can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((((auth.jwt() ->> 'role'::text) = 'super_admin'::text) OR ((auth.jwt() ->> 'user_type'::text) = 'super_admin'::text)));



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Agents can delete their own listings"
  on "public"."property_listings"
  as permissive
  for delete
  to public
using ((auth.uid() = agent_id));



  create policy "Agents can insert their own listings"
  on "public"."property_listings"
  as permissive
  for insert
  to public
with check ((auth.uid() = agent_id));



  create policy "Agents can update their own listings"
  on "public"."property_listings"
  as permissive
  for update
  to public
using ((auth.uid() = agent_id));



  create policy "Agents can view all listings"
  on "public"."property_listings"
  as permissive
  for select
  to public
using (true);



  create policy "Anyone can view approved listings"
  on "public"."property_listings"
  as permissive
  for select
  to public
using ((status = 'approved'::text));



  create policy "Super admins can delete alerts"
  on "public"."system_alerts"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));



  create policy "Super admins can insert alerts"
  on "public"."system_alerts"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));



  create policy "Super admins can update alerts"
  on "public"."system_alerts"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))));

-- Add policy for super admins to update any property listing
create policy "Super admins can update any listing"
  on "public"."property_listings"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))));

-- Add policy for super admins to delete any property listing
create policy "Super admins can delete any listing"
  on "public"."property_listings"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))));



  create policy "Super admins can view all alerts"
  on "public"."system_alerts"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));



  create policy "Users can update their own messages"
  on "public"."messages"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.agent_id = auth.uid()) OR (conversations.client_id = auth.uid()))))));


CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_listings_updated_at BEFORE UPDATE ON public.property_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at BEFORE UPDATE ON public.system_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


