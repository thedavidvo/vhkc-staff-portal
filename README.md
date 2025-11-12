# VHKC Staff Portal

A modern, responsive web application for managing go kart drivers, race results, and performance data. Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.

## Features

- 📊 **Dashboard** with key metrics and performance tables
- 👥 **Driver Management** with sorting and filtering
- 🏁 **Race Tracking** and results management
- 🏆 **Division Management** for organizing drivers
- 📈 **Reports & Analytics** for performance insights
- ⚙️ **Settings** for portal configuration
- 🌓 **Dark/Light Mode** toggle
- 📱 **Fully Responsive** design for desktop, tablet, and mobile
- ✨ **Modern UI** with smooth animations and gradients

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
vhkc-staff-portal/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with sidebar
│   ├── page.tsx           # Dashboard page
│   ├── drivers/           # Drivers page
│   ├── races/             # Races page
│   ├── divisions/         # Divisions page
│   ├── reports/           # Reports page
│   └── settings/          # Settings page
├── components/            # Reusable React components
│   ├── Sidebar.tsx        # Collapsible navigation sidebar
│   ├── Header.tsx         # Top header with search and profile
│   ├── StatsCards.tsx     # Dashboard statistics cards
│   ├── PerformanceTable.tsx # Driver performance table
│   └── AddDriverModal.tsx # Modal for adding new drivers
├── data/                  # Mock data
│   └── mockData.ts        # Sample drivers and stats
├── types/                 # TypeScript type definitions
│   └── index.ts           # Driver, Race, and Stats interfaces
└── public/                # Static assets
```

## Features in Detail

### Dashboard
- Real-time statistics cards showing key metrics
- Interactive performance table with sorting and filtering
- Search functionality for drivers
- Division-based filtering
- Add new driver modal form

### Responsive Design
- Mobile-first approach
- Collapsible sidebar that transforms into a mobile menu
- Adaptive layouts for all screen sizes
- Touch-friendly interface elements

### Dark Mode
- System preference detection
- Manual toggle in header
- Persistent theme selection
- Smooth transitions

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Mock Data

The application currently uses mock data located in `data/mockData.ts`. In a production environment, you would replace this with API calls to your backend service.

## License

This project is private and proprietary.
