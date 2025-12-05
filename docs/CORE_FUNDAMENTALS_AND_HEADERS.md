# Core Fundamentals You Should Know + Supabase Headers Explained

## 🎯 Core Stuff You Should Know

### 1. **JavaScript Fundamentals** (The Foundation)

#### A. Variables & Data Types
```javascript
// Variables
const name = 'John';        // Constant (can't change)
let age = 25;               // Let (can change)
var oldWay = 'avoid';       // Old way (avoid)

// Data Types
const string = 'text';
const number = 42;
const boolean = true;
const array = [1, 2, 3];
const object = { name: 'John', age: 25 };
const nullValue = null;
const undefinedValue = undefined;
```

#### B. Functions
```javascript
// Regular function
function greet(name) {
  return `Hello ${name}`;
}

// Arrow function (modern)
const greet = (name) => {
  return `Hello ${name}`;
};

// Arrow function (shorthand)
const greet = name => `Hello ${name}`;

// Async function
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};
```

#### C. Promises & Async/Await
```javascript
// Promise (old way)
fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));

// Async/Await (modern way - easier!)
async function getData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
```

#### D. Array Methods (Used EVERYWHERE)
```javascript
const users = [
  { id: 1, name: 'John', age: 25 },
  { id: 2, name: 'Jane', age: 30 }
];

// Map - Transform array
const names = users.map(user => user.name);
// Result: ['John', 'Jane']

// Filter - Get subset
const youngUsers = users.filter(user => user.age < 30);
// Result: [{ id: 1, name: 'John', age: 25 }]

// Find - Find one item
const user = users.find(user => user.id === 1);
// Result: { id: 1, name: 'John', age: 25 }

// ForEach - Loop through
users.forEach(user => console.log(user.name));
```

#### E. Object Destructuring
```javascript
const user = { name: 'John', age: 25, email: 'john@example.com' };

// Old way
const name = user.name;
const age = user.age;

// New way (destructuring)
const { name, age } = user;
// Same as above but shorter!

// With arrays
const [first, second] = [1, 2, 3];
// first = 1, second = 2
```

#### F. Optional Chaining & Nullish Coalescing
```javascript
const user = { profile: { name: 'John' } };

// Safe access (won't crash if null)
const name = user?.profile?.name; // 'John'
const city = user?.profile?.city; // undefined (no crash!)

// Default values
const city = user?.profile?.city ?? 'Unknown';
// If city is null/undefined, use 'Unknown'
```

### 2. **React Fundamentals**

#### A. Components
```javascript
// Function component (modern)
function UserCard({ name, age }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>Age: {age}</p>
    </div>
  );
}

// Arrow function component
const UserCard = ({ name, age }) => {
  return (
    <div>
      <h2>{name}</h2>
      <p>Age: {age}</p>
    </div>
  );
};
```

#### B. Hooks (State Management)
```javascript
import { useState, useEffect } from 'react';

function Counter() {
  // useState - Store data that can change
  const [count, setCount] = useState(0);
  
  // useEffect - Run code when component mounts or data changes
  useEffect(() => {
    console.log('Component mounted or count changed');
    // Cleanup function (runs when component unmounts)
    return () => {
      console.log('Component unmounting');
    };
  }, [count]); // Only run when 'count' changes
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

#### C. Props & State
```javascript
// Props - Data passed TO component (from parent)
function UserCard({ user }) {
  return <div>{user.name}</div>;
}

// State - Data managed INSIDE component
function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

### 3. **HTTP Requests (API Calls)**

#### Basic Fetch
```javascript
// GET request
async function getUsers() {
  const response = await fetch('https://api.example.com/users');
  const data = await response.json();
  return data;
}

// POST request
async function createUser(userData) {
  const response = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123'
    },
    body: JSON.stringify(userData)
  });
  return response.json();
}
```

### 4. **Error Handling**
```javascript
try {
  const data = await fetchData();
  console.log('Success:', data);
} catch (error) {
  console.error('Error:', error.message);
  // Handle error (show user message, retry, etc.)
} finally {
  console.log('This always runs');
}
```

---

## 🔐 Supabase Headers - How It Works

### **YES, Supabase Automatically Sends Headers on Every Request!**

Here's what happens behind the scenes:

### 1. **Frontend Requests (Your React App)**

When you use the Supabase client:

```javascript
// You write this:
const { data } = await supabase.from('users').select('*');

// Supabase SDK automatically sends this HTTP request:
fetch('https://your-project.supabase.co/rest/v1/users?select=*', {
  method: 'GET',
  headers: {
    'apikey': 'your-anon-key',              // ✅ Always included
    'Authorization': 'Bearer user-jwt-token', // ✅ If user is logged in
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
});
```

**Key Points:**
- ✅ **`apikey` header** - ALWAYS sent (your public anon key)
- ✅ **`Authorization` header** - Sent if user is logged in (contains JWT token)
- ✅ **No proxy needed** - Direct from browser to Supabase

### 2. **How Headers Are Stored & Sent**

```javascript
// When user signs in:
const { data, error } = await supabase.auth.signIn({
  email: 'user@example.com',
  password: 'password'
});

// Supabase SDK automatically:
// 1. Receives JWT token from response
// 2. Stores it in localStorage
// 3. Automatically includes it in ALL future requests

// After sign in, every request includes:
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### 3. **Where Tokens Are Stored**

```javascript
// Supabase stores tokens in localStorage automatically:
localStorage.getItem('sb-access-token');   // User's JWT token
localStorage.getItem('sb-refresh-token');  // Refresh token

// SDK automatically reads these and includes in headers
```

### 4. **Checking Headers in Browser**

1. Open **DevTools** (F12)
2. Go to **Network** tab
3. Make a Supabase request
4. Click on the request
5. Look at **Headers** tab
6. You'll see:
   ```
   Request Headers:
     apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Content-Type: application/json
   ```

### 5. **Why No Proxy/NGINX Needed**

**Frontend (Browser) → Supabase:**
- ✅ Direct connection
- ✅ Browser sends headers automatically
- ✅ Supabase validates headers on their servers
- ❌ No proxy needed

**When You WOULD Need Proxy:**
- Backend server making requests
- Hiding API keys from frontend
- Adding custom middleware
- Load balancing

### 6. **Authentication Flow**

```javascript
// Step 1: Sign in
const { data, error } = await supabase.auth.signIn({
  email: 'user@example.com',
  password: 'password'
});

// Step 2: Supabase SDK automatically:
// - Receives JWT token
// - Stores in localStorage
// - Adds to all future requests

// Step 3: All database queries automatically include auth:
const { data } = await supabase
  .from('posts')
  .select('*');
  
// This request includes:
// headers: {
//   'Authorization': 'Bearer <jwt-token>',  // ✅ Automatic!
//   'apikey': '<your-anon-key>'             // ✅ Automatic!
// }

// Step 4: Supabase server checks:
// - Is token valid? ✅
// - Does user have permission? (RLS policies)
// - Return data or error
```

### 7. **Manual Header Management (Edge Functions)**

When you create Supabase Edge Functions, you manually handle headers:

```javascript
// In Edge Function
serve(async (req) => {
  // Get Authorization header from request
  const authHeader = req.headers.get('Authorization');
  
  // Extract token
  const token = authHeader?.replace('Bearer ', '');
  
  // Verify token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // User is authenticated!
});
```

### 8. **Two Types of Keys**

```javascript
// 1. ANON KEY (Public - Safe in frontend)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Used for:
// - Public requests
// - Authenticated requests (with user JWT)
// - Client-side only

// 2. SERVICE ROLE KEY (Secret - Backend only!)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
// Used for:
// - Admin operations
// - Bypassing RLS policies
// - Server-side only (NEVER expose in frontend!)
```

### 9. **Header Security**

```javascript
// ✅ SAFE - In browser
headers: {
  'apikey': 'anon-key',           // Public, okay in browser
  'Authorization': 'Bearer jwt'   // User's token, okay in browser
}

// ❌ DANGEROUS - Never expose in browser!
headers: {
  'apikey': 'service-role-key'    // Admin key, bypasses security!
}
```

---

## 📚 Practice Exercises

### Exercise 1: Basic Async/Await
```javascript
// Practice this pattern:
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### Exercise 2: Array Methods
```javascript
const products = [
  { id: 1, name: 'Laptop', price: 1000, inStock: true },
  { id: 2, name: 'Phone', price: 500, inStock: false },
  { id: 3, name: 'Tablet', price: 300, inStock: true }
];

// Find products under $600
const cheap = products.filter(p => p.price < 600);

// Get all product names
const names = products.map(p => p.name);

// Find first in-stock product
const available = products.find(p => p.inStock);
```

### Exercise 3: Destructuring
```javascript
// Practice destructuring:
const user = { name: 'John', age: 25, email: 'john@example.com' };
const { name, email } = user;

// In React components:
function UserCard({ user: { name, email } }) {
  return <div>{name} - {email}</div>;
}
```

---

## 🎯 Key Takeaways

1. **Core JavaScript**: Variables, functions, arrays, objects, async/await
2. **React Basics**: Components, hooks (useState, useEffect), props
3. **HTTP Requests**: Fetch API, headers, error handling
4. **Supabase Headers**: Automatically included, no proxy needed for frontend
5. **Security**: Anon key (public) vs Service role key (secret)

---

## 🔍 How to Verify Headers

1. Open DevTools (F12)
2. Network tab
3. Make any Supabase request
4. Click request → Headers tab
5. See all headers being sent automatically!

---

## 💡 Remember

- **Supabase SDK = Convenience wrapper** around HTTP requests
- **Headers are automatic** - you don't need to add them manually
- **No proxy needed** - browser → Supabase directly
- **Learn the fundamentals** - they apply everywhere!
- **Practice patterns** - async/await, array methods, destructuring

You're learning real skills! 🚀

