# SiteTrackr

A comprehensive field operations management platform for tracking work orders, site visits, and assets across multiple locations. Built for telecom and infrastructure field service organizations.

## 🚀 Features

### Core Functionality
- **🎫 Ticket Management** - Create, track, and manage work orders with customizable templates
- **📍 Site Management** - Organize and monitor sites with custom fields and ownership tracking
- **📦 Asset Tracking** - Track equipment and assets across sites
- **📋 Visit Logging** - Record site visits with notes, custom fields, and photo attachments
- **📎 Attachment Management** - Upload and manage photos, documents, and files with thumbnail previews
- **👥 Multi-tenant Support** - Company-based isolation with role-based access control

### Advanced Features
- **🎨 Custom Templates** - Define custom ticket templates with configurable fields (text, number, date, select, multi-select, etc.)
- **🔍 Advanced Search & Filtering** - Server-backed search and filtering across tickets and sites
- **📊 Table Views** - Professional data tables with sortable columns, pagination, and column visibility controls
- **🏢 Site Owner Management** - Organize sites by owners with granular access controls
- **📱 Offline-First Architecture** - IndexedDB caching for offline access (in progress)
- **🔐 Secure Authentication** - JWT-based authentication with role-based permissions (ADMIN, MANAGER, TECH)
- **📥 Bulk Downloads** - Download all attachments as ZIP archives

## 🛠️ Tech Stack

### Backend (API)
- **Runtime**: Node.js 20+
- **Framework**: Fastify 4.x
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + bcrypt
- **File Storage**: Local filesystem with @fastify/static
- **Validation**: Zod schemas
- **File Processing**: Archiver for ZIP generation

### Frontend (Web)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Data Tables**: TanStack Table
- **Offline Storage**: Dexie (IndexedDB wrapper)
- **Styling**: Inline styles (component-based)

### Database Schema
- Companies, Users, Sites, Assets
- Tickets, Templates, Visits
- Attachments, Custom Fields
- Role-based access controls

## 📋 Prerequisites

- **Node.js**: v20.0.0 or higher
- **PostgreSQL**: v14 or higher
- **npm**: v9.0.0 or higher

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd SiteTrackr
```

### 2. Install dependencies

```bash
# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install
```

### 3. Database Setup

Create a PostgreSQL database:
```bash
createdb sitetrackr
```

Configure environment variables in `apps/api/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sitetrackr"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

Run migrations:
```bash
cd apps/api
npm run prisma:migrate
```

### 4. Seed Demo Data (Optional)

The database will automatically create a demo company and admin user on first run:
- **Company ID**: `11111111-1111-1111-1111-111111111111`
- **Admin User**: `00000000-0000-0000-0000-000000000001`
- **Email**: `admin@demo.com`
- **Password**: Check the seed script or auth plugin

## 🚀 Running the Application

### Development Mode

**Terminal 1 - API Server:**
```bash
cd apps/api
npm run dev
```
API will run on `http://localhost:3001`

**Terminal 2 - Web Client:**
```bash
cd apps/web
npm run dev
```
Web app will run on `http://localhost:5173`

### Production Build

```bash
# Build API
cd apps/api
npm run build
npm start

# Build Web
cd apps/web
npm run build
npm run preview
```

## 📁 Project Structure

```
SiteTrackr/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── migrations/     # Database migrations
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/       # Authentication
│   │   │   │   ├── tickets/    # Ticket management
│   │   │   │   ├── sites/      # Site management
│   │   │   │   ├── visits/     # Visit logging
│   │   │   │   ├── assets/     # Asset tracking
│   │   │   │   └── ...
│   │   │   ├── plugins/        # Fastify plugins
│   │   │   └── index.ts        # API entry point
│   │   └── uploads/            # File storage
│   │
│   └── web/                    # Frontend Web App
│       ├── src/
│       │   ├── features/       # Feature modules
│       │   │   ├── auth/       # Login, auth hooks
│       │   │   ├── tickets/    # Ticket pages & API
│       │   │   ├── sites/      # Site pages & API
│       │   │   ├── visits/     # Visit pages & API
│       │   │   └── ...
│       │   ├── components/     # Shared components
│       │   │   ├── common/     # Button, Input, Card
│       │   │   └── layout/     # AppLayout, navigation
│       │   ├── lib/            # API client, utilities
│       │   └── main.tsx        # App entry point
│       └── public/             # Static assets
│
└── packages/                   # Shared packages (future)
```

## 🔑 Key Features Explained

### Custom Ticket Templates
Define reusable templates with custom fields:
- Text, Textarea, Number
- Date, Time, DateTime
- Boolean (checkbox)
- Select (dropdown)
- Multi-Select
- Field validation and required/optional settings

### Table Views with Persistence
- Sortable columns (client + server)
- Server-side pagination
- Search with debouncing
- Show/hide columns (saved per user in localStorage)
- Clickable rows for navigation

### Attachment System
- **Visit-level attachments**: Photos/files tied to specific visits
- **Ticket-level attachments**: Documents for the entire ticket (timesheets, work orders)
- Unique display names to prevent filename conflicts
- Thumbnail preview for images
- Bulk download as ZIP

### Role-Based Access Control
- **ADMIN**: Full system access
- **MANAGER**: Limited administrative access
- **TECH**: Field technician access
- Site owner-based filtering for non-admin users

## 🔒 Security

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based route protection
- Helmet.js security headers
- CORS configuration
- SQL injection protection via Prisma

## 📝 API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Key Endpoints

**Authentication:**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

**Tickets:**
- `GET /tickets` - List tickets (paginated, searchable, filterable)
- `GET /tickets/:id` - Get ticket details
- `POST /tickets` - Create ticket
- `PATCH /tickets/:id` - Update ticket (status, priority, fields)
- `GET /tickets/:id/attachments/download` - Download all visit attachments as ZIP

**Sites:**
- `GET /sites` - List sites (paginated, searchable)
- `GET /sites/:id` - Get site details
- `PATCH /sites/:id` - Update site

**Visits:**
- `POST /tickets/:ticketId/visits` - Create visit
- `POST /visits/:visitId/attachments` - Upload attachment

**Attachments:**
- `POST /tickets/:ticketId/attachments` - Upload ticket-level attachment
- `GET /uploads/:companyId/:filename` - Retrieve file

## 🧪 Testing

```bash
# API tests (if configured)
cd apps/api
npm test

# Web tests (if configured)
cd apps/web
npm test
```

## 🚧 Roadmap

- [ ] Mobile app (React Native)
- [ ] Offline-first sync engine
- [ ] Real-time notifications
- [ ] Advanced reporting & analytics
- [ ] Equipment maintenance scheduling
- [ ] Integration with third-party systems
- [ ] Geolocation tracking
- [ ] Time tracking & billing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Development Notes

- TypeScript is used throughout for type safety
- Prisma migrations are version controlled
- File uploads stored in `apps/api/uploads/{companyId}/`
- Column visibility preferences stored in browser localStorage
- Search queries debounced at 300ms
- Default page size: 25 items

## 🐛 Known Issues

- Offline sync not yet implemented
- Mobile responsive design needs improvement
- Performance optimization needed for large datasets

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with ❤️ for field service teams | Free and Open Source Software**
