# VN Speech Guardian Frontend

Frontend React 19 + Vite 7 cho hệ thống **Speech-to-Text tiếng Việt** với **phát hiện nội dung độc hại real-time**.

## 🎯 Tổng quan

Frontend này được thiết kế để cung cấp trải nghiệm người dùng mượt mà cho việc:

- **Ghi âm real-time** với Voice Activity Detection
- **Chuyển đổi giọng nói sang văn bản** tiếng Việt chính xác
- **Phát hiện nội dung độc hại** trong thời gian thực
- **Giao diện responsive** với dark/light theme
- **Dashboard analytics** cho admin monitoring

## 🛠 Tech Stack

### Core Framework
- **React 19.1.1** - Latest với React Compiler support
- **Vite 7.1.2** - Lightning fast build tool
- **TypeScript 5.8.3** - Type-safe development

### UI & Styling  
- **TailwindCSS 4.0 Beta** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible components
- **Framer Motion 11.15** - Animation library
- **Lucide React** - Beautiful icons

### State Management
- **Zustand 5.0** - Lightweight state management
- **TanStack Query 5.89** - Server state management
- **TanStack Router 1.131** - Type-safe routing

### Audio Processing
- **Web Audio API** - Native audio processing
- **Wavesurfer.js 7.8** - Audio visualization
- **AudioWorklet** - High-performance audio processing

### Authentication & API
- **Clerk 5.47** - Complete authentication solution
- **Axios 1.7.9** - HTTP client với interceptors
- **Socket.IO Client 4.8** - Real-time communication

### Form & Validation
- **React Hook Form 7.54** - Performant forms
- **Zod 3.24** - Schema validation
- **@hookform/resolvers** - Form validation integration

### Testing
- **Vitest 2.1** - Fast unit testing
- **Playwright 1.49** - E2E testing
- **React Testing Library 16.1** - Component testing
- **MSW 2.6** - API mocking

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js version 22+ required
node --version  # Should be >= 22.0.0
npm --version   # Should be >= 10.0.0
```

### Installation

```bash
# Clone repository (nếu chưa có)
git clone <repository-url>
cd vn-speech-guardian/apps/web

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Chỉnh sửa .env.local với configuration thực tế

# Start development server
npm run dev
```

### Development Server

```bash
# Development với hot reload
npm run dev           # Chạy trên http://localhost:3000

# Build cho production
npm run build         # Output trong ./dist

# Preview production build
npm run preview       # Preview trên http://localhost:3001
```

## 🧪 Testing

### Unit Testing với Vitest

```bash
# Chạy tests
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:ui           # Visual test runner
npm run test:coverage     # Coverage report (target >80%)
```

### E2E Testing với Playwright

```bash
# Install browsers (chỉ cần chạy 1 lần)
npx playwright install

# Chạy E2E tests
npm run test:e2e          # Headless mode
npm run test:e2e:headed   # Headed mode (xem browser)
```

## 📚 Vietnamese Developer Experience

Workspace này được optimized cho Vietnamese developers với:

- **Vietnamese comments** trong business logic
- **Comprehensive TypeScript** types với Vietnamese descriptions  
- **TDD approach** với >80% test coverage target
- **Professional tooling** setup cho enterprise development
- **Performance optimization** cho real-time audio processing

## 🏗 Folder Structure

```
src/
├── components/          # React components
│   ├── ui/             # Base UI components (Button, Dialog, etc.)
│   ├── audio/          # Audio-related components
│   ├── dashboard/      # Dashboard-specific components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── services/           # External service integrations
├── stores/             # Zustand stores
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
├── constants/          # Application constants
├── worklets/           # Audio worklet processors
└── routes/             # Route components
```

## ⚡ Key Features

### Real-time Audio Processing
- **Voice Activity Detection** với WebAudio API
- **PCM 16-bit processing** cho optimal speech recognition
- **AudioWorklet** implementation cho low-latency processing
- **Cross-browser compatibility** với fallbacks

### Content Moderation
- **Real-time harmful content detection** 
- **Hysteresis smoothing** để giảm false positives
- **Severity-based alerts** với Vietnamese localization
- **Admin dashboard** cho monitoring và statistics

### Modern UI/UX
- **Responsive design** mobile-first approach
- **Dark/Light theme** với system preference detection
- **Accessibility** compliance với WCAG guidelines
- **Smooth animations** với Framer Motion

---

**VN Speech Guardian Frontend** - Protecting Vietnamese Speech với Modern Web Technology 🇻🇳
```
