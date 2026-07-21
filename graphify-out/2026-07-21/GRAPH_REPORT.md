# Graph Report - .  (2026-07-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 861 nodes · 1720 edges · 67 communities (50 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 2,194 input · 632 output

## Graph Freshness
- Built from commit: `8f26530e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Session and Permissions API
- PDF and Excel Document Generation
- Date and Number Formatting
- Certificate of Analysis Reports
- Development Dependencies Setup
- Runtime Dependencies Management
- TypeScript and Build Configuration
- API Permissions and Approvals
- Quotation and Form Utilities
- User Management API
- Certificate of Analysis UI Components
- result/route.ts
- Technical Documents and Forms
- Dashboard Pages
- Dashboard Layout Components
- Invoice and Document Numbering
- Login and Animation Components
- Invoice UI Components
- Customer Management UI
- Database Seeding and Role Access
- Role-Based Access Control UI
- Quotation Item Management
- Quotation Creation and Listing
- Certificate of Compliance API
- Certificate of Analysis Templates
- Customer API
- Certificate of Analysis Template UI
- STPS API
- Database Schema and Entities
- Certificate of Analysis Template API
- Customer Listing API
- Admin User Management UI
- Parameter Management UI
- Invoice Excel Export
- Data Import API
- Application Layout and Motion
- Invoice Approval and Retest API
- Certificate Template Database Migration
- Account API
- Excel Document Database Migration
- Purchase Order API
- Results API
- Payment Status API
- Send Operation API
- Distribution API
- Start Process API
- Validation API
- Sample Parameter Verification API
- Sample Start API
- Sample Verification API
- Receive Operation API
- ESLint Configuration
- Next.js Configuration
- PostCSS Configuration
- Logo Asset
- Sample Review API
- Customer Active Status Migration
- Coc Sampling Location Migration
- Invoice Payment Proof Migration

## God Nodes (most connected - your core abstractions)
1. `getSession()` - 81 edges
2. `requireApiPermission()` - 78 edges
3. `requireAnyApiPermission()` - 54 edges
4. `canAccessMenu()` - 47 edges
5. `formatDate()` - 29 edges
6. `safeFileName()` - 29 edges
7. `generateDocumentNo()` - 20 edges
8. `compilerOptions` - 16 edges
9. `renderPdfToBuffer()` - 15 edges
10. `getLabAnalysisPageData()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `CustomerDashboardPage()` --calls--> `getSession()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/customer/page.tsx → src/lib/auth.ts
- `DashboardLayout()` --calls--> `getSession()`  [EXTRACTED]
  src/app/(dashboard)/layout.tsx → src/lib/auth.ts
- `PATCH()` --calls--> `requireApiPermission()`  [EXTRACTED]
  src/app/api/finance/invoices/[id]/approve/route.ts → src/lib/api-permission.ts
- `PATCH()` --calls--> `requireApiPermission()`  [EXTRACTED]
  src/app/api/finance/invoices/[id]/paid/route.ts → src/lib/api-permission.ts
- `PATCH()` --calls--> `requireApiPermission()`  [EXTRACTED]
  src/app/api/finance/invoices/[id]/send/route.ts → src/lib/api-permission.ts

## Import Cycles
- None detected.

## Communities (67 total, 17 thin omitted)

### Community 0 - "Session and Permissions API"
Cohesion: 0.06
Nodes (62): GET(), PATCH(), PermissionInput, RouteContext, GET(), POST(), POST(), GET() (+54 more)

### Community 1 - "PDF and Excel Document Generation"
Cohesion: 0.06
Nodes (50): GET(), RouteContext, GET(), RouteContext, GET(), RouteContext, GET(), RouteContext (+42 more)

### Community 2 - "Date and Number Formatting"
Cohesion: 0.06
Nodes (59): buildLtrExcel(), rupiahFormat(), setThinBorder(), styleLabel(), styleSection(), styleValue(), buildQuotationExcel(), rupiahFormat() (+51 more)

### Community 3 - "Certificate of Analysis Reports"
Cohesion: 0.10
Nodes (34): GET(), RouteContext, GET(), RouteContext, GET(), RouteContext, GET(), RouteContext (+26 more)

### Community 4 - "Development Dependencies Setup"
Cohesion: 0.05
Nodes (40): bcrypt, dotenv, eslint, eslint-config-next, devDependencies, bcrypt, dotenv, eslint (+32 more)

### Community 5 - "Runtime Dependencies Management"
Cohesion: 0.07
Nodes (29): bcryptjs, clsx, exceljs, framer-motion, jose, lucide-react, next, dependencies (+21 more)

### Community 6 - "TypeScript and Build Configuration"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 7 - "API Permissions and Approvals"
Cohesion: 0.11
Nodes (17): GET(), PATCH(), RouteContext, GET(), columns, GET(), setThinBorder(), PATCH() (+9 more)

### Community 8 - "Quotation and Form Utilities"
Cohesion: 0.10
Nodes (23): addDaysInputDate(), CoaTemplateOption, CustomerOption, FlowMode, flowSteps, formatDate(), formatRupiah(), FormItem (+15 more)

### Community 9 - "User Management API"
Cohesion: 0.11
Nodes (20): DELETE(), GET(), PATCH(), RouteContext, updateUserSchema, createUserSchema, GET(), POST() (+12 more)

### Community 10 - "Certificate of Analysis UI Components"
Cohesion: 0.10
Nodes (16): Coa, CoaFlowClient(), CoaMode, getStatusStyle(), Props, Sample, SampleParameter, Props (+8 more)

### Community 11 - "result/route.ts"
Cohesion: 0.50
Nodes (3): PATCH(), resultSchema, RouteContext

### Community 12 - "Technical Documents and Forms"
Cohesion: 0.12
Nodes (11): CocForm, CocItemForm, Customer, formatDateTime(), getTodayInputDate(), Mode, Props, Quotation (+3 more)

### Community 13 - "Dashboard Pages"
Cohesion: 0.18
Nodes (5): CustomerDashboardPage(), StatCardProps, MotionHeader(), MotionHeaderProps, globalForPrisma

### Community 14 - "Dashboard Layout Components"
Cohesion: 0.12
Nodes (15): DashboardLayout(), AppShellProps, MenuItem, DashboardShell(), PageTransition(), DashboardMenuItem, DashboardSession, getInitials() (+7 more)

### Community 15 - "Invoice and Document Numbering"
Cohesion: 0.14
Nodes (16): POST(), RouteContext, POST(), RouteContext, createInvoiceSchema, GET(), getInvoiceAmount(), POST() (+8 more)

### Community 16 - "Login and Animation Components"
Cohesion: 0.21
Nodes (11): LoginPage(), StatCardShell(), buttonHover, buttonTap, EASE_IN_OUT, EASE_OUT, fadeScale, fadeUp (+3 more)

### Community 17 - "Invoice UI Components"
Cohesion: 0.20
Nodes (13): Customer, formatDate(), formatRupiah(), getInvoiceStatusText(), getQuotationGrandTotal(), getStatusStyle(), Invoice, InvoiceFlowClient() (+5 more)

### Community 18 - "Customer Management UI"
Cohesion: 0.18
Nodes (10): cleanForm(), CustomerForm, CustomerRow, CustomerUser, emptyForm, getCustomerLoginUser(), MasterCustomerClient(), Props (+2 more)

### Community 19 - "Database Seeding and Role Access"
Cohesion: 0.24
Nodes (10): getPermissionByRoleAndMenu(), main(), menus, prisma, roleAccess, roles, upsertCoaTemplate(), upsertCustomer() (+2 more)

### Community 20 - "Role-Based Access Control UI"
Cohesion: 0.20
Nodes (9): createInitialPermissions(), getMenuGroup(), PermissionItem, PermissionKey, permissions, PermissionState, Props, RbacPermissionTable() (+1 more)

### Community 21 - "Quotation Item Management"
Cohesion: 0.24
Nodes (10): calculateTotals(), GET(), nullableDate, nullableString, PATCH(), quotationItemSchema, quotationUpdateSchema, RouteContext (+2 more)

### Community 22 - "Quotation Creation and Listing"
Cohesion: 0.28
Nodes (8): calculateTotals(), GET(), nullableDate, nullableString, POST(), quotationCreateSchema, quotationItemSchema, toDate()

### Community 23 - "Certificate of Compliance API"
Cohesion: 0.28
Nodes (8): cocItemSchema, cocSchema, ensureSampleAndParametersTx(), nullableDate, nullableString, POST(), RouteContext, toDate()

### Community 24 - "Certificate of Analysis Templates"
Cohesion: 0.29
Nodes (7): DELETE(), GET(), normalizeCode(), PATCH(), RouteContext, templateParameterSchema, templateSchema

### Community 25 - "Customer API"
Cohesion: 0.25
Nodes (7): customerSchema, DELETE(), GET(), nullableEmail, nullableString, PATCH(), RouteContext

### Community 26 - "Certificate of Analysis Template UI"
Cohesion: 0.29
Nodes (7): emptyForm, MasterCoaTemplateClient(), normalizeCode(), Props, TemplateForm, TemplateParamForm, TemplateWithParams

### Community 27 - "STPS API"
Cohesion: 0.33
Nodes (6): nullableDate, nullableString, POST(), RouteContext, stpsSchema, toDate()

### Community 28 - "Database Schema and Entities"
Cohesion: 0.25
Nodes (16): `AnalysisParameter`, `Coa`, `Coc`, `Customer`, `Invoice`, `Ltr`, `Menu`, `PurchaseOrder` (+8 more)

### Community 29 - "Certificate of Analysis Template API"
Cohesion: 0.40
Nodes (5): GET(), normalizeCode(), POST(), templateParameterSchema, templateSchema

### Community 30 - "Customer Listing API"
Cohesion: 0.33
Nodes (5): customerSchema, GET(), nullableEmail, nullableString, POST()

### Community 31 - "Admin User Management UI"
Cohesion: 0.33
Nodes (4): emptyForm, Props, UserForm, UserWithRelations

### Community 32 - "Parameter Management UI"
Cohesion: 0.40
Nodes (5): emptyForm, formatRupiah(), MasterParameterClient(), ParameterForm, Props

### Community 33 - "Invoice Excel Export"
Cohesion: 0.31
Nodes (10): GET(), RouteContext, buildInvoiceExcel(), getFinalCoaNo(), rupiahFormat(), setThinBorder(), styleLabel(), styleSection() (+2 more)

### Community 34 - "Data Import API"
Cohesion: 0.70
Nodes (4): clean(), getCell(), POST(), yes()

### Community 36 - "Invoice Approval and Retest API"
Cohesion: 0.10
Nodes (14): PATCH(), RouteContext, PATCH(), retestSchema, RouteContext, PATCH(), RouteContext, PATCH() (+6 more)

### Community 37 - "Certificate Template Database Migration"
Cohesion: 0.60
Nodes (5): `CoaTemplate`, `CoaTemplateParameter`, `Quotation`, `Sample`, `SampleParameter`

### Community 38 - "Account API"
Cohesion: 0.50
Nodes (3): accountSchema, POST(), RouteContext

### Community 39 - "Excel Document Database Migration"
Cohesion: 0.40
Nodes (5): `Coc`, `Customer`, `Quotation`, `QuotationItem`, `Stps`

### Community 40 - "Purchase Order API"
Cohesion: 0.50
Nodes (3): poSchema, POST(), RouteContext

### Community 41 - "Results API"
Cohesion: 0.50
Nodes (3): PATCH(), resultSchema, RouteContext

### Community 44 - "Distribution API"
Cohesion: 0.50
Nodes (3): distributeSchema, PATCH(), RouteContext

## Ambiguous Edges - Review These
- `README.md` → `pnpm-workspace.yaml`  [AMBIGUOUS]
  README.md · relation: references

## Knowledge Gaps
- **274 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `README.md` and `pnpm-workspace.yaml`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `getSession()` connect `Session and Permissions API` to `Invoice Approval and Retest API`, `API Permissions and Approvals`, `Dashboard Pages`, `Dashboard Layout Components`, `Invoice and Document Numbering`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `requireAnyApiPermission()` connect `API Permissions and Approvals` to `Session and Permissions API`, `Invoice Excel Export`, `Data Import API`, `Certificate of Analysis Reports`, `Invoice Approval and Retest API`, `PDF and Excel Document Generation`, `Purchase Order API`, `User Management API`, `Invoice and Document Numbering`, `Quotation Item Management`, `Quotation Creation and Listing`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `requireApiPermission()` connect `User Management API` to `API Permissions and Approvals`, `result/route.ts`, `Invoice and Document Numbering`, `Certificate of Compliance API`, `Certificate of Analysis Templates`, `Customer API`, `STPS API`, `Certificate of Analysis Template API`, `Customer Listing API`, `Invoice Approval and Retest API`, `Account API`, `Results API`, `Payment Status API`, `Send Operation API`, `Distribution API`, `Start Process API`, `Validation API`, `Sample Parameter Verification API`, `Sample Start API`, `Sample Verification API`, `Receive Operation API`, `Sample Review API`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Session and Permissions API` be split into smaller, more focused modules?**
  _Cohesion score 0.05934065934065934 - nodes in this community are weakly interconnected._
- **Should `PDF and Excel Document Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.06308610400682012 - nodes in this community are weakly interconnected._