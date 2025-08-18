# PickFirst Production-Grade Messaging System

## Overview

The PickFirst messaging system provides secure, real-time communication between real estate agents and clients. Built with enterprise-grade security, scalability, and user experience in mind.

## 🏗️ Architecture

### Database Layer
- **Supabase PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** using Supabase Realtime
- **Edge Functions** for secure server-side operations
- **Comprehensive indexing** for performance optimization

### Application Layer
- **React TypeScript** frontend with real-time updates
- **Secure API endpoints** with input validation
- **Role-based access control** (Agent/Client)
- **Real-time message delivery** with read receipts

## 🔒 Security Features

### Row Level Security (RLS)
- Users can only access conversations they're part of
- Messages are isolated by conversation boundaries
- Agent-client relationships are strictly enforced
- No data leakage between different user groups

### Input Validation
- UUID format validation for all IDs
- Content length limits (5000 characters max)
- Subject length limits (200 characters max)
- SQL injection prevention through parameterized queries

### Authentication & Authorization
- JWT-based authentication via Supabase Auth
- Role-based permissions (agent vs client)
- Service role keys for secure database operations
- CORS protection on all endpoints

## 📊 Database Schema

### Core Tables

#### `conversations`
```sql
- id: UUID (Primary Key)
- agent_id: UUID (References profiles.id)
- client_id: UUID (References profiles.id)
- inquiry_id: UUID (Optional, references property_inquiries.id)
- subject: TEXT
- last_message_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `messages`
```sql
- id: UUID (Primary Key)
- conversation_id: UUID (References conversations.id)
- sender_id: UUID (References profiles.id)
- content: TEXT
- content_type: TEXT (text, image, file, system)
- read_at: TIMESTAMP (Nullable)
- delivered_at: TIMESTAMP (Nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `message_attachments` (Future)
```sql
- id: UUID (Primary Key)
- message_id: UUID (References messages.id)
- file_name: TEXT
- file_path: TEXT
- file_size: BIGINT
- mime_type: TEXT
- created_at: TIMESTAMP
```

#### `conversation_participants` (Future)
```sql
- id: UUID (Primary Key)
- conversation_id: UUID (References conversations.id)
- user_id: UUID (References profiles.id)
- role: TEXT (agent, client, participant)
- joined_at: TIMESTAMP
- is_active: BOOLEAN
```

## 🚀 Features

### Real-Time Messaging
- **Instant message delivery** via Supabase Realtime
- **Read receipts** with automatic marking
- **Typing indicators** (planned)
- **Online/offline status** (planned)

### Conversation Management
- **Create new conversations** between agents and clients
- **Search conversations** by client name, email, or subject
- **Filter conversations** by unread status or recency
- **Archive old conversations** automatically

### Message Features
- **Rich text support** with markdown (planned)
- **File attachments** (planned)
- **Message reactions** (planned)
- **Message threading** (planned)

### User Experience
- **Responsive design** for all devices
- **Dark theme** with PickFirst branding
- **Keyboard shortcuts** (Enter to send, Shift+Enter for new line)
- **Auto-scroll** to latest messages
- **Loading states** and error handling

## 🔧 API Endpoints

### Edge Function: `/functions/messaging`

#### `getConversations`
- **Purpose**: Retrieve user's conversations
- **Security**: Role-based filtering (agents see their conversations, clients see theirs)
- **Returns**: Conversations with metadata, unread counts, last messages

#### `getMessages`
- **Purpose**: Get messages for a specific conversation
- **Security**: User must be part of the conversation
- **Returns**: Messages with sender profiles

#### `sendMessage`
- **Purpose**: Send a new message
- **Security**: Sender must be part of the conversation
- **Validation**: Content length, sender verification
- **Returns**: Created message with metadata

#### `createConversation`
- **Purpose**: Create new agent-client conversation
- **Security**: Only agents can create conversations
- **Validation**: Agent and client must exist with correct roles
- **Returns**: Conversation ID

#### `markMessagesAsRead`
- **Purpose**: Mark messages as read
- **Security**: User must be part of the conversation
- **Returns**: Success status

#### `searchMessages`
- **Purpose**: Full-text search across user's messages
- **Security**: User can only search their own conversations
- **Returns**: Matching messages with context

## 🎯 Usage Examples

### Creating a New Conversation
```typescript
const conversationId = await messageService.getOrCreateConversation(
  agentId,
  clientId,
  "Property Inquiry - 123 Main St"
);
```

### Sending a Message
```typescript
const message = await messageService.sendMessage(
  conversationId,
  userId,
  "Hi! I'd be happy to show you the property this weekend.",
  'text'
);
```

### Real-Time Subscriptions
```typescript
const subscription = messageService.subscribeToMessages(
  conversationId,
  (newMessage) => {
    // Handle new message
    console.log('New message:', newMessage);
  },
  (error) => {
    // Handle error
    console.error('Subscription error:', error);
  }
);

// Cleanup
subscription.unsubscribe();
```

## 📱 Component Usage

### AgentMessages Component
```tsx
import { AgentMessages } from '@/components/agent/AgentMessages';

// In your page
<PageWrapper title="Messages">
  <AgentMessages />
</PageWrapper>
```

## 🚨 Error Handling

### Client-Side Errors
- **Network errors**: Automatic retry with exponential backoff
- **Validation errors**: User-friendly error messages
- **Permission errors**: Clear explanation of access restrictions

### Server-Side Errors
- **Database errors**: Logged and sanitized for client
- **Authentication errors**: Redirect to login
- **Rate limiting**: Graceful degradation

## 🔄 Performance Optimizations

### Database
- **Composite indexes** on frequently queried columns
- **Full-text search** indexes for message content
- **Connection pooling** for database connections
- **Query optimization** with proper joins

### Frontend
- **Virtual scrolling** for large message lists (planned)
- **Message pagination** with infinite scroll
- **Optimistic updates** for better UX
- **Debounced search** to reduce API calls

### Real-Time
- **Efficient subscriptions** with proper cleanup
- **Message batching** for high-volume scenarios
- **Connection pooling** for multiple users

## 🧪 Testing

### Unit Tests
- Service layer functions
- Component rendering
- State management

### Integration Tests
- API endpoint functionality
- Database operations
- Real-time subscriptions

### Security Tests
- RLS policy verification
- Input validation
- Authentication flows

## 📈 Monitoring & Analytics

### Metrics Tracked
- **Message delivery rates**
- **Response times**
- **User engagement**
- **Error rates**

### Alerts
- **High error rates**
- **Performance degradation**
- **Security incidents**

## 🔮 Future Enhancements

### Phase 2
- **File attachments** with cloud storage
- **Message reactions** (emojis)
- **Typing indicators**
- **Push notifications**

### Phase 3
- **Group conversations**
- **Message threading**
- **Advanced search** with filters
- **Message templates**

### Phase 4
- **AI-powered responses**
- **Sentiment analysis**
- **Automated follow-ups**
- **Integration with CRM systems**

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Supabase CLI
- PostgreSQL knowledge

### Local Development
```bash
# Install dependencies
npm install

# Start Supabase locally
supabase start

# Run migrations
supabase db reset

# Start development server
npm run dev
```

### Environment Variables
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [React Real-time Patterns](https://react.dev/learn/synchronizing-with-effects)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Follow coding standards**
4. **Add tests for new features**
5. **Submit a pull request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for the PickFirst real estate platform** 