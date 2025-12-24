# SiteTrackr

A comprehensive field operations management platform for tracking work orders, site visits, and assets across multiple locations. Built for telecom and infrastructure field service organizations.

![SiteTrackr GUI Screenshot](Screenshot%201.png)

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
- **📱 Offline-First Architecture** - Dexie-powered IndexedDB cache plus sync runner for tickets, visits, templates, and attachment uploads
- **🔐 Secure Authentication** - JWT-based authentication with role-based permissions (ADMIN, MANAGER, TECH)
- **📥 Bulk Downloads** - Download all attachments as ZIP archives
- **📤 Admin Import/Export** - CSV-based bulk import/export for Site Owners, Sites, Ticket Templates, and Tickets with custom field support
- **🎨 Company Branding** - Token-based theming with preset palettes, dark mode toggle, and tenant-specific logos
- **🗺 Map View** - Leaflet-powered ticket map with live bounding-box filtering, owner/template filters, clustering, hover previews, and click-to-pin popups for rapid situational awareness

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
- **Styling**: Token-driven CSS variables with a ThemeProvider

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
create database sitetrackr
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

Run the helper script for a full reset plus demo data:

```bash
./scripts/reset-db.sh
```

The script drops the database referenced by `DATABASE_URL`, reruns Prisma migrations, and then applies the expanded seed file at `apps/api/seed-demo.sql`.

The API will automatically create a demo company and admin user on first run:
- **Company ID**: `11111111-1111-1111-1111-111111111111`
- **Admin User**: `00000000-0000-0000-0000-000000000001`
- **Email**: `admin@demo.com`
- **Password**: `change-me`

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
│   │   │   │   ├── adminImportExport/ # CSV import/export
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
│       │   │   ├── admin/      # Admin import/export
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
- Offline capture queue with pending/failed status badges and automatic retries

### Role-Based Access Control
- **ADMIN**: Full system access including import/export
- **MANAGER**: Limited administrative access
- **TECH**: Field technician access
- Site owner-based filtering for non-admin users

### Admin Import/Export
**CSV-based bulk data management** (Admin only):
- **Site Owners**: Export/import owner definitions with custom field schemas using `field:key:label` column format
- **Sites**: Export/import sites with owner assignments and custom field values using `cf:fieldKey` column format
- **Ticket Templates**: Export/import templates with field definitions and sections using `field:key:label` column format
- **Tickets**: Export/import tickets with template assignments and custom field values using `cf:fieldKey` column format

**Key Features:**
- **UPSERT Logic**: Intelligently creates new records or updates existing ones based on ID, external ID, or unique identifiers
- **Row Validation**: Detailed error reporting with row numbers and field-specific errors
- **Custom Field Support**: Import/export custom field definitions and values using special column naming conventions
- **Reference Validation**: Validates relationships (e.g., siteOwnerId, templateId) and provides clear error messages
- **Automatic Ticket Numbering**: Generates globally unique ticket numbers (ST00001, ST00002, etc.) when not provided
- **No Destructive Actions**: Import only creates or updates records; never deletes existing data

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
- `POST /tickets/:ticketId/attachments/metadata` - Create attachment metadata (idempotent/offline)
- `GET /uploads/:companyId/:filename` - Retrieve file
- `POST /visits/:visitId/attachments` - Upload visit attachment
- `POST /visits/:visitId/attachments/metadata` - Create visit attachment metadata
- `PUT /attachments/:id/content` - Upload attachment bytes for a pending metadata record

**Branding (Admin):**
- `GET /company/branding` - Retrieve theme tokens for the active company
- `PUT /company/branding` - Update branding (primary color, logo URL, mode)

**Admin Import/Export:**
- `POST /admin/import/site-owners` - Import Site Owners from CSV
- `GET /admin/export/site-owners` - Export Site Owners to CSV
- `POST /admin/import/sites` - Import Sites from CSV
- `GET /admin/export/sites` - Export Sites to CSV
- `POST /admin/import/ticket-templates` - Import Ticket Templates from CSV
- `GET /admin/export/ticket-templates` - Export Ticket Templates to CSV
- `POST /admin/import/tickets` - Import Tickets from CSV
- `GET /admin/export/tickets` - Export Tickets to CSV

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

- [x] Admin CSV Import/Export
- [x] Excel (XLSX) import/export support
- [ ] Mobile app (React Native)
- [x] Offline-first sync engine (Phase 1-2 web cache + outbox)
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
- CSV import/export uses `csv-parse` and `csv-stringify` libraries
- Ticket numbers are globally unique with format ST00001-ST99999
- Custom fields support both field definitions (`field:key:label`) and values (`cf:key`) in CSV imports

## 🐛 Known Issues

- Mobile responsive design needs improvement
- Performance optimization needed for large datasets
- Attachment uploads limited to 25MB per file

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with ❤️ for field service teams | Free and Open Source Software**
