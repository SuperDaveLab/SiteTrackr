-- CreateEnums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'TECH');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "TemplateFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE', 'TIME', 'DATETIME', 'PHOTO_REF', 'READING');
CREATE TYPE "AttachmentType" AS ENUM ('PHOTO', 'DOCUMENT', 'OTHER');
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'ADMIN');
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTables
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GlobalCounter" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "ticketNext" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalCounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TECH',
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT,
    "phone" TEXT,
    "skills" JSONB,

    CONSTRAINT "TechnicianProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSiteOwnerAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteOwnerId" TEXT NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEW',

    CONSTRAINT "UserSiteOwnerAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserTicketTemplateAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketTemplateId" TEXT NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEW',

    CONSTRAINT "UserTicketTemplateAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteOwner" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteOwner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteOwnerId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "county" TEXT,
    "equipmentType" TEXT,
    "marketName" TEXT,
    "towerType" TEXT,
    "notes" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT,
    "serial" TEXT,
    "tag" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketTemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TemplateFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT,
    "sectionOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTemplateField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteFieldDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteOwnerId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TemplateFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteFieldDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "externalId" TEXT,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "assetId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "scheduledStartAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldKey" TEXT,
    "fieldLabel" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "technicianUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "location" JSONB,
    "readings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "visitId" TEXT,
    "companyId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL DEFAULT 'PHOTO',
    "filename" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
CREATE INDEX "UserSiteOwnerAccess_userId_idx" ON "UserSiteOwnerAccess"("userId");
CREATE INDEX "UserSiteOwnerAccess_siteOwnerId_idx" ON "UserSiteOwnerAccess"("siteOwnerId");
CREATE UNIQUE INDEX "UserSiteOwnerAccess_userId_siteOwnerId_key" ON "UserSiteOwnerAccess"("userId", "siteOwnerId");
CREATE INDEX "UserTicketTemplateAccess_userId_idx" ON "UserTicketTemplateAccess"("userId");
CREATE INDEX "UserTicketTemplateAccess_ticketTemplateId_idx" ON "UserTicketTemplateAccess"("ticketTemplateId");
CREATE UNIQUE INDEX "UserTicketTemplateAccess_userId_ticketTemplateId_key" ON "UserTicketTemplateAccess"("userId", "ticketTemplateId");
CREATE INDEX "SiteOwner_companyId_idx" ON "SiteOwner"("companyId");
CREATE UNIQUE INDEX "SiteOwner_companyId_code_key" ON "SiteOwner"("companyId", "code");
CREATE INDEX "Site_companyId_idx" ON "Site"("companyId");
CREATE INDEX "Site_companyId_siteOwnerId_idx" ON "Site"("companyId", "siteOwnerId");
CREATE INDEX "Asset_companyId_idx" ON "Asset"("companyId");
CREATE INDEX "Asset_companyId_siteId_idx" ON "Asset"("companyId", "siteId");
CREATE INDEX "TicketTemplate_companyId_idx" ON "TicketTemplate"("companyId");
CREATE UNIQUE INDEX "TicketTemplate_companyId_code_key" ON "TicketTemplate"("companyId", "code");
CREATE INDEX "TicketTemplateField_templateId_idx" ON "TicketTemplateField"("templateId");
CREATE UNIQUE INDEX "TicketTemplateField_templateId_key_key" ON "TicketTemplateField"("templateId", "key");
CREATE INDEX "SiteFieldDefinition_companyId_idx" ON "SiteFieldDefinition"("companyId");
CREATE INDEX "SiteFieldDefinition_companyId_siteOwnerId_idx" ON "SiteFieldDefinition"("companyId", "siteOwnerId");
CREATE UNIQUE INDEX "SiteFieldDefinition_companyId_siteOwnerId_key_key" ON "SiteFieldDefinition"("companyId", "siteOwnerId", "key");
CREATE INDEX "Ticket_companyId_idx" ON "Ticket"("companyId");
CREATE INDEX "Ticket_companyId_siteId_idx" ON "Ticket"("companyId", "siteId");
CREATE INDEX "Ticket_companyId_assetId_idx" ON "Ticket"("companyId", "assetId");
CREATE INDEX "Ticket_companyId_status_idx" ON "Ticket"("companyId", "status");
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE UNIQUE INDEX "Ticket_companyId_externalId_key" ON "Ticket"("companyId", "externalId");
CREATE INDEX "Ticket_companyId_assignedToUserId_idx" ON "Ticket"("companyId", "assignedToUserId");
CREATE INDEX "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");
CREATE INDEX "TicketActivity_userId_idx" ON "TicketActivity"("userId");
CREATE INDEX "Visit_ticketId_idx" ON "Visit"("ticketId");
CREATE INDEX "Visit_technicianUserId_idx" ON "Visit"("technicianUserId");
CREATE INDEX "Attachment_companyId_idx" ON "Attachment"("companyId");
CREATE INDEX "Attachment_ticketId_idx" ON "Attachment"("ticketId");
CREATE INDEX "Attachment_visitId_idx" ON "Attachment"("visitId");

-- AddForeignKeys
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianProfile" ADD CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSiteOwnerAccess" ADD CONSTRAINT "UserSiteOwnerAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSiteOwnerAccess" ADD CONSTRAINT "UserSiteOwnerAccess_siteOwnerId_fkey" FOREIGN KEY ("siteOwnerId") REFERENCES "SiteOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTicketTemplateAccess" ADD CONSTRAINT "UserTicketTemplateAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTicketTemplateAccess" ADD CONSTRAINT "UserTicketTemplateAccess_ticketTemplateId_fkey" FOREIGN KEY ("ticketTemplateId") REFERENCES "TicketTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteOwner" ADD CONSTRAINT "SiteOwner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_siteOwnerId_fkey" FOREIGN KEY ("siteOwnerId") REFERENCES "SiteOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketTemplate" ADD CONSTRAINT "TicketTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketTemplateField" ADD CONSTRAINT "TicketTemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TicketTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteFieldDefinition" ADD CONSTRAINT "SiteFieldDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteFieldDefinition" ADD CONSTRAINT "SiteFieldDefinition_siteOwnerId_fkey" FOREIGN KEY ("siteOwnerId") REFERENCES "SiteOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TicketTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_technicianUserId_fkey" FOREIGN KEY ("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
