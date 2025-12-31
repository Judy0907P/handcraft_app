# Handcraft Management Frontend

Modern React frontend for the Handcraft Management System.

## Features

- **User Authentication**: Login and registration pages
- **Organization Management**: Select or create shops/organizations
- **Parts Management**: 
  - Create, edit, and delete parts
  - Categorize by type and subtype
  - Search and sort functionality
  - Image thumbnail support (ready for when backend is implemented)
- **Products Management**: 
  - Similar functionality to parts
  - Full product details management
- **Sales Management**: 
  - Create sales orders
  - View sales history
  - Sort by quantity, amount, or date
- **Settings**: User and organization settings

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for routing
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Lucide React** for icons
- **date-fns** for date formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional):
```env
VITE_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   ├── auth/       # Authentication components
│   │   ├── layout/     # Layout components
│   │   ├── parts/      # Parts-related components
│   │   ├── products/   # Products-related components
│   │   └── sales/      # Sales-related components
│   ├── contexts/        # React contexts (Auth, Org)
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json
```

## API Integration

The frontend communicates with the FastAPI backend. Make sure the backend is running on `http://localhost:8000` (or configure via `VITE_API_URL`).

## Features in Detail

### Authentication
- Login and registration pages
- Session management via localStorage
- Protected routes

### Parts Page
- View parts categorized by type and subtype
- Create, edit, and delete parts
- Search by name
- Sort by stock, name, or date
- Manage types and subtypes
- Image thumbnail placeholder (ready for backend implementation)

### Products Page
- Similar to parts page
- Full product details including colors, difficulty, pricing
- Image URL support

### Sales Page
- Create sales with product selection
- View sales history
- Sort by quantity, amount, or date
- Summary statistics

### Settings Page
- View user information
- Change organization
- Logout functionality

## Development Notes

- The authentication is currently using localStorage. When backend auth is implemented, update `AuthContext.tsx` to use actual API calls.
- Image thumbnails are ready but will work once the backend image handling is properly implemented.
- The app uses React Router for navigation and protected routes.

