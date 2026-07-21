# Graph Report - .  (2026-07-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 861 nodes · 1720 edges · 67 communities (50 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 2,194 input · 628 output

## Graph Freshness
- Built from commit: `673a4762`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Session and Permissions API
- Excel Formatting Utilities
- PDF and Excel Rendering
- Certificate of Analysis Exports
- Development Dependencies
- Runtime Dependencies
- TypeScript Configuration
- Quotation and Form Flow
- User Management API
- API Permissions and Approvals
- Invoice and Document Generation
- Dashboard Layout Components
- Certificate of Analysis Flow
- Sample Review and Permissions
- Dashboard Pages
- Technical Document and Forms
- Database Schema Entities
- Login and Animation Components
- Invoice Flow and Status
- Invoice Excel Exports
- Customer Management UI
- Role and Permission Setup
- Role-Based Access Control UI
- Quotation Item Management
- Quotation Creation API
- Certificate of Conformance API
- Coa Template Management API
- Customer API
- Master Coa Template UI
- STPS API
- Coa Template Database Migration
- Excel Document Database Migration
- Coa Template API
- Customer API Endpoints
- Admin User Management UI
- Master Parameter Management UI
- Import API
- App Layout and Motion
- Result API Patch
- Results API Patch
- Account API
- Purchase Order API
- Distribution API
- Payment Status API
- Send API
- Start Process API
- Validation API
- Sample Parameter Verification API
- Sample Review API
- Sample Start API
- Sample Verification API
- Receive API
- ESLint Configuration
- Next.js Configuration
- PostCSS Configuration
- Customer Migration
- Coc Sampling Location Migration
- Invoice Payment Proof Migration
- Medialab Logo

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

### Community 1 - "Excel Formatting Utilities"
Cohesion: 0.06
Nodes (59): buildLtrExcel(), rupiahFormat(), setThinBorder(), styleLabel(), styleSection(), styleValue(), buildQuotationExcel(), rupiahFormat() (+51 more)

### Community 2 - "PDF and Excel Rendering"
Cohesion: 0.06
Nodes (50): GET(), RouteContext, GET(), RouteContext, GET(), RouteContext, GET(), RouteContext (+42 more)

### Community 3 - "Certificate of Analysis Exports"
Cohesion: 0.10
Nodes (34): GET(), RouteContext, GET(), RouteContext, GET(), RouteContext, GET(), RouteContext (+26 more)

### Community 4 - "Development Dependencies"
Cohesion: 0.05
Nodes (40): bcrypt, dotenv, eslint, eslint-config-next, devDependencies, bcrypt, dotenv, eslint (+32 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (29): bcryptjs, clsx, exceljs, framer-motion, jose, lucide-react, next, dependencies (+21 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 7 - "Quotation and Form Flow"
Cohesion: 0.10
Nodes (23): addDaysInputDate(), CoaTemplateOption, CustomerOption, FlowMode, flowSteps, formatDate(), formatRupiah(), FormItem (+15 more)

### Community 8 - "User Management API"
Cohesion: 0.11
Nodes (20): DELETE(), GET(), PATCH(), RouteContext, updateUserSchema, createUserSchema, GET(), POST() (+12 more)

### Community 9 - "API Permissions and Approvals"
Cohesion: 0.11
Nodes (17): GET(), PATCH(), RouteContext, GET(), columns, GET(), setThinBorder(), PATCH() (+9 more)

### Community 10 - "Invoice and Document Generation"
Cohesion: 0.14
Nodes (16): POST(), RouteContext, POST(), RouteContext, createInvoiceSchema, GET(), getInvoiceAmount(), POST() (+8 more)

### Community 11 - "Dashboard Layout Components"
Cohesion: 0.12
Nodes (15): DashboardLayout(), AppShellProps, MenuItem, DashboardShell(), PageTransition(), DashboardMenuItem, DashboardSession, getInitials() (+7 more)

### Community 12 - "Certificate of Analysis Flow"
Cohesion: 0.10
Nodes (16): Coa, CoaFlowClient(), CoaMode, getStatusStyle(), Props, Sample, SampleParameter, Props (+8 more)

### Community 13 - "Sample Review and Permissions"
Cohesion: 0.10
Nodes (14): PATCH(), RouteContext, PATCH(), retestSchema, RouteContext, PATCH(), RouteContext, PATCH() (+6 more)

### Community 14 - "Dashboard Pages"
Cohesion: 0.18
Nodes (5): CustomerDashboardPage(), StatCardProps, MotionHeader(), MotionHeaderProps, globalForPrisma

### Community 15 - "Technical Document and Forms"
Cohesion: 0.12
Nodes (11): CocForm, CocItemForm, Customer, formatDateTime(), getTodayInputDate(), Mode, Props, Quotation (+3 more)

### Community 16 - "Database Schema Entities"
Cohesion: 0.25
Nodes (16): `AnalysisParameter`, `Coa`, `Coc`, `Customer`, `Invoice`, `Ltr`, `Menu`, `PurchaseOrder` (+8 more)

### Community 17 - "Login and Animation Components"
Cohesion: 0.21
Nodes (11): LoginPage(), StatCardShell(), buttonHover, buttonTap, EASE_IN_OUT, EASE_OUT, fadeScale, fadeUp (+3 more)

### Community 18 - "Invoice Flow and Status"
Cohesion: 0.20
Nodes (13): Customer, formatDate(), formatRupiah(), getInvoiceStatusText(), getQuotationGrandTotal(), getStatusStyle(), Invoice, InvoiceFlowClient() (+5 more)

### Community 19 - "Invoice Excel Exports"
Cohesion: 0.31
Nodes (10): GET(), RouteContext, buildInvoiceExcel(), getFinalCoaNo(), rupiahFormat(), setThinBorder(), styleLabel(), styleSection() (+2 more)

### Community 20 - "Customer Management UI"
Cohesion: 0.18
Nodes (10): cleanForm(), CustomerForm, CustomerRow, CustomerUser, emptyForm, getCustomerLoginUser(), MasterCustomerClient(), Props (+2 more)

### Community 21 - "Role and Permission Setup"
Cohesion: 0.24
Nodes (10): getPermissionByRoleAndMenu(), main(), menus, prisma, roleAccess, roles, upsertCoaTemplate(), upsertCustomer() (+2 more)

### Community 22 - "Role-Based Access Control UI"
Cohesion: 0.20
Nodes (9): createInitialPermissions(), getMenuGroup(), PermissionItem, PermissionKey, permissions, PermissionState, Props, RbacPermissionTable() (+1 more)

### Community 23 - "Quotation Item Management"
Cohesion: 0.24
Nodes (10): calculateTotals(), GET(), nullableDate, nullableString, PATCH(), quotationItemSchema, quotationUpdateSchema, RouteContext (+2 more)

### Community 24 - "Quotation Creation API"
Cohesion: 0.28
Nodes (8): calculateTotals(), GET(), nullableDate, nullableString, POST(), quotationCreateSchema, quotationItemSchema, toDate()

### Community 25 - "Certificate of Conformance API"
Cohesion: 0.28
Nodes (8): cocItemSchema, cocSchema, ensureSampleAndParametersTx(), nullableDate, nullableString, POST(), RouteContext, toDate()

### Community 26 - "Coa Template Management API"
Cohesion: 0.29
Nodes (7): DELETE(), GET(), normalizeCode(), PATCH(), RouteContext, templateParameterSchema, templateSchema

### Community 27 - "Customer API"
Cohesion: 0.25
Nodes (7): customerSchema, DELETE(), GET(), nullableEmail, nullableString, PATCH(), RouteContext

### Community 28 - "Master Coa Template UI"
Cohesion: 0.29
Nodes (7): emptyForm, MasterCoaTemplateClient(), normalizeCode(), Props, TemplateForm, TemplateParamForm, TemplateWithParams

### Community 29 - "STPS API"
Cohesion: 0.33
Nodes (6): nullableDate, nullableString, POST(), RouteContext, stpsSchema, toDate()

### Community 30 - "Coa Template Database Migration"
Cohesion: 0.60
Nodes (5): `CoaTemplate`, `CoaTemplateParameter`, `Quotation`, `Sample`, `SampleParameter`

### Community 31 - "Excel Document Database Migration"
Cohesion: 0.40
Nodes (5): `Coc`, `Customer`, `Quotation`, `QuotationItem`, `Stps`

### Community 32 - "Coa Template API"
Cohesion: 0.40
Nodes (5): GET(), normalizeCode(), POST(), templateParameterSchema, templateSchema

### Community 33 - "Customer API Endpoints"
Cohesion: 0.33
Nodes (5): customerSchema, GET(), nullableEmail, nullableString, POST()

### Community 34 - "Admin User Management UI"
Cohesion: 0.33
Nodes (4): emptyForm, Props, UserForm, UserWithRelations

### Community 35 - "Master Parameter Management UI"
Cohesion: 0.40
Nodes (5): emptyForm, formatRupiah(), MasterParameterClient(), ParameterForm, Props

### Community 36 - "Import API"
Cohesion: 0.70
Nodes (4): clean(), getCell(), POST(), yes()

### Community 38 - "Result API Patch"
Cohesion: 0.50
Nodes (3): PATCH(), resultSchema, RouteContext

### Community 39 - "Results API Patch"
Cohesion: 0.50
Nodes (3): PATCH(), resultSchema, RouteContext

### Community 40 - "Account API"
Cohesion: 0.50
Nodes (3): accountSchema, POST(), RouteContext

### Community 41 - "Purchase Order API"
Cohesion: 0.50
Nodes (3): poSchema, POST(), RouteContext

### Community 42 - "Distribution API"
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
- **Why does `getSession()` connect `Session and Permissions API` to `API Permissions and Approvals`, `Invoice and Document Generation`, `Dashboard Layout Components`, `Sample Review and Permissions`, `Dashboard Pages`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `requireAnyApiPermission()` connect `API Permissions and Approvals` to `Session and Permissions API`, `PDF and Excel Rendering`, `Certificate of Analysis Exports`, `Import API`, `User Management API`, `Purchase Order API`, `Invoice and Document Generation`, `Sample Review and Permissions`, `Invoice Excel Exports`, `Quotation Item Management`, `Quotation Creation API`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `requireApiPermission()` connect `User Management API` to `API Permissions and Approvals`, `Invoice and Document Generation`, `Sample Review and Permissions`, `Certificate of Conformance API`, `Coa Template Management API`, `Customer API`, `STPS API`, `Coa Template API`, `Customer API Endpoints`, `Result API Patch`, `Results API Patch`, `Account API`, `Distribution API`, `Payment Status API`, `Send API`, `Start Process API`, `Validation API`, `Sample Parameter Verification API`, `Sample Review API`, `Sample Start API`, `Sample Verification API`, `Receive API`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Session and Permissions API` be split into smaller, more focused modules?**
  _Cohesion score 0.05934065934065934 - nodes in this community are weakly interconnected._
- **Should `Excel Formatting Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.06418219461697723 - nodes in this community are weakly interconnected._