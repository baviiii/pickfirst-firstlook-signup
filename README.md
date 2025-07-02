# PickFirst FirstLook Signup

A modern React application built with Vite, TypeScript, Tailwind CSS, and shadcn/ui components.

## 🚀 Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components for beautiful UI
- **React Router** for navigation
- **React Hook Form** with Zod validation
- **React Query** for data fetching
- **Lucide React** for icons

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or bun

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development Server

```bash
# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:8080`

### Building for Production

```bash
# Build the app
npm run build
# or
bun run build
```

### Preview Production Build

```bash
# Preview the production build
npm run preview
# or
bun run preview
```

## 🚀 Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Instructions

1. **Push your code to GitHub** - Make sure your repository is on GitHub
2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" in the sidebar
   - Under "Source", select "GitHub Actions"
3. **Push to main branch** - The CI/CD pipeline will automatically:
   - Build your application
   - Deploy it to GitHub Pages
   - Make it available at `https://yourusername.github.io/pickfirst-firstlook-signup/`

### Manual Deployment

If you prefer to deploy manually:

1. Build the project: `npm run build`
2. The built files will be in the `dist/` directory
3. Upload the contents of `dist/` to your web server

## 📁 Project Structure

```
├── src/                    # Source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── lib/               # Utility functions
│   └── main.tsx           # Entry point
├── public/                # Static assets
├── .github/workflows/     # CI/CD configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## 🔧 Configuration

- **Vite**: Configured for React with SWC for fast compilation
- **Tailwind CSS**: Includes typography plugin and animations
- **TypeScript**: Strict configuration with path aliases
- **ESLint**: Configured for React and TypeScript

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Live Demo

Once deployed, your app will be available at:
`https://yourusername.github.io/pickfirst-firstlook-signup/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
