# CraftFlow Frontend

Modern React frontend for the CraftFlow System. A comprehensive web interface for managing inventory, production, sales, and orders.

## Features

### Authentication & User Management
- User registration and login
- JWT-based authentication
- Session management via localStorage
- Protected routes
- User profile management

### Organization Management
- Select or create organizations/stores
- Switch between organizations
- Organization context throughout the app

### Parts Management
- View parts categorized by type and subtype
- Create, edit, and delete parts
- Search by name
- Sort by stock, name, or date
- Manage part types and subtypes
- Image upload and display
- Inventory adjustments
- Status label management

### Products Management
- View products categorized by type and subtype
- Create, edit, and delete products
- Full product details including:
  - Colors (primary and secondary)
  - Difficulty levels
  - Pricing and cost tracking
  - Status labels
- Image upload and display
- Recipe (BOM) management
- Inventory adjustments
- Product type and subtype management

### Cart & Orders
- Shopping cart functionality
- Add products to cart from products page
- Adjust quantities and custom prices
- Channel selection (online/offline)
- Platform selection
- Order notes
- Checkout to create orders
- Full order management:
  - View order details
  - Order status workflow: created → completed → shipped → closed
  - Cancel and return orders
  - Tracking number support
  - Edit order notes, channel, and platform
  - View order line items with costs and prices

### Sales Management
- Create sales records
- View sales history
- Sort by quantity, amount, or date
- Summary statistics
- Product-specific sales tracking

### Settings
- View user information
- Change organization
- Logout functionality

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
- Backend API running (see `backend/README.md`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional, defaults to `http://localhost:8000`):
```env
VITE_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000` (or the port Vite assigns).

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── auth/            # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── layout/          # Layout components
│   │   │   └── MainLayout.tsx
│   │   ├── parts/           # Parts-related components
│   │   │   ├── PartModal.tsx
│   │   │   ├── PartTypeModal.tsx
│   │   │   ├── PartSubtypeModal.tsx
│   │   │   └── PartInventoryDialog.tsx
│   │   ├── products/        # Products-related components
│   │   │   ├── ProductModal.tsx
│   │   │   ├── ProductTypeModal.tsx
│   │   │   ├── ProductSubtypeModal.tsx
│   │   │   └── ProductInventoryDialog.tsx
│   │   ├── platforms/       # Platform components
│   │   │   └── PlatformModal.tsx
│   │   └── sales/           # Sales-related components
│   │       └── SaleModal.tsx
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx  # Authentication state
│   │   ├── OrgContext.tsx   # Organization state
│   │   └── CartContext.tsx  # Shopping cart state
│   ├── pages/               # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── OrgSelectionPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── PartsPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── SalesPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/            # API service layer
│   │   └── api.ts           # Axios API client
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## API Integration

The frontend communicates with the FastAPI backend. Make sure the backend is running on `http://localhost:8000` (or configure via `VITE_API_URL`).

### Authentication Flow

1. User registers or logs in
2. JWT token is stored in localStorage
3. Token is included in all API requests via Axios interceptors
4. Protected routes check for valid authentication
5. Token expiration is handled automatically

### API Service Layer

All API calls are centralized in `src/services/api.ts`. The service includes:
- Automatic token injection
- Error handling
- Request/response interceptors

## Features in Detail

### Authentication
- **Login**: Email and password authentication
- **Registration**: Create new user accounts with email, password, and username
- **Session Management**: Tokens stored in localStorage with automatic refresh
- **Protected Routes**: Routes require authentication via `ProtectedRoute` component

### Parts Page
- **View Parts**: Organized by type and subtype with search and sort
- **Create/Edit Parts**: Modal forms for part management
- **Inventory Management**: Adjust stock levels with transaction logging
- **Type Management**: Create and manage part types and subtypes
- **Image Support**: Upload and display part images
- **Status Labels**: Assign and manage status labels

### Products Page
- **View Products**: Organized by type and subtype with search and sort
- **Create/Edit Products**: Comprehensive product forms with all attributes
- **Recipe Management**: View and manage bill of materials
- **Inventory Management**: Adjust product quantities
- **Type Management**: Create and manage product types and subtypes
- **Image Support**: Upload and display product images
- **Status Labels**: Assign and manage status labels
- **Add to Cart**: Quick add products to shopping cart

### Cart Page
- **Cart Management**: View, edit, and remove cart items
- **Quantity Adjustment**: Increase/decrease quantities with stock validation
- **Custom Pricing**: Override default prices per item
- **Order Information**: Set channel, platform, and notes
- **Checkout**: Create orders from cart items
- **Stock Validation**: Prevents checkout if insufficient stock

### Orders Page
- **Order List**: View all orders with sorting and filtering
- **Order Details**: Comprehensive order view with:
  - Order information (ID, status, dates)
  - Channel and platform
  - Order line items with costs and prices
  - Notes (editable)
- **Status Management**: 
  - Mark as completed
  - Mark as shipped (with tracking number)
  - Close order
  - Cancel order
  - Return shipped orders
- **Summary Statistics**: Total orders, pending orders, closed revenue

### Sales Page
- **Create Sales**: Record individual sales transactions
- **Sales History**: View all sales with sorting
- **Summary Statistics**: Total sales, revenue, and profit
- **Product Filtering**: View sales by product

### Settings Page
- **User Information**: View current user details
- **Organization Management**: Switch between organizations
- **Logout**: Clear session and logout

## Development Notes

### State Management
- **Context API**: Used for global state (auth, organization, cart)
- **Local State**: Component-level state for UI interactions
- **API State**: Fetched data stored in component state

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-friendly layouts
- **Custom Colors**: Primary color scheme defined in Tailwind config

### Image Handling
- Images are uploaded to the backend
- Displayed from backend URLs or local uploads
- Fallback placeholders for missing images
- Error handling for broken image links

### Error Handling
- API errors are caught and displayed to users
- Form validation on client and server
- Loading states for async operations
- User-friendly error messages

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: `http://localhost:8000`)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ support required
- LocalStorage support required for authentication

## Troubleshooting

### API Connection Issues
- Verify backend is running on the correct port
- Check `VITE_API_URL` environment variable
- Check browser console for CORS errors
- Verify authentication token is valid

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Clear Vite cache: `rm -rf node_modules/.vite`

### Authentication Issues
- Clear localStorage and login again
- Check token expiration (30 days)
- Verify backend authentication is working

## Future Enhancements

- Real-time updates via WebSockets
- Offline support with service workers
- Advanced filtering and search
- Export functionality (CSV, PDF)
- Dashboard with charts and analytics
- Mobile app (React Native)
