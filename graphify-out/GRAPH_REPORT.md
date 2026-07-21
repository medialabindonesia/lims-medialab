# Graph Report - .  (2026-07-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 782 nodes · 1630 edges · 53 communities (40 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b353399`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50

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

## Communities (53 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (62): GET(), PATCH(), PermissionInput, RouteContext, GET(), POST(), POST(), GET() (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (59): buildLtrExcel(), rupiahFormat(), setThinBorder(), styleLabel(), styleSection(), styleValue(), buildQuotationExcel(), rupiahFormat() (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (50): GET(), RouteContext, GET(), RouteContext, GET(), RouteContext, GET(), RouteContext (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (42): dependencies, bcryptjs, clsx, exceljs, framer-motion, jose, lucide-react, next (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (34): GET(), RouteContext, GET(), RouteContext, GET(), RouteContext, GET(), RouteContext (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (23): addDaysInputDate(), CoaTemplateOption, CustomerOption, FlowMode, flowSteps, formatDate(), formatRupiah(), FormItem (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (20): DELETE(), GET(), PATCH(), RouteContext, updateUserSchema, createUserSchema, GET(), POST() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): GET(), PATCH(), RouteContext, GET(), columns, GET(), setThinBorder(), PATCH() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (16): POST(), RouteContext, POST(), RouteContext, createInvoiceSchema, GET(), getInvoiceAmount(), POST() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): DashboardLayout(), AppShellProps, MenuItem, DashboardShell(), PageTransition(), DashboardMenuItem, DashboardSession, getInitials() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (16): Coa, CoaFlowClient(), CoaMode, getStatusStyle(), Props, Sample, SampleParameter, Props (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (14): PATCH(), RouteContext, PATCH(), retestSchema, RouteContext, PATCH(), RouteContext, PATCH() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (5): CustomerDashboardPage(), StatCardProps, MotionHeader(), MotionHeaderProps, globalForPrisma

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (11): CocForm, CocItemForm, Customer, formatDateTime(), getTodayInputDate(), Mode, Props, Quotation (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (11): LoginPage(), StatCardShell(), buttonHover, buttonTap, EASE_IN_OUT, EASE_OUT, fadeScale, fadeUp (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (13): Customer, formatDate(), formatRupiah(), getInvoiceStatusText(), getQuotationGrandTotal(), getStatusStyle(), Invoice, InvoiceFlowClient() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.31
Nodes (10): GET(), RouteContext, buildInvoiceExcel(), getFinalCoaNo(), rupiahFormat(), setThinBorder(), styleLabel(), styleSection() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): cleanForm(), CustomerForm, CustomerRow, CustomerUser, emptyForm, getCustomerLoginUser(), MasterCustomerClient(), Props (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (10): getPermissionByRoleAndMenu(), main(), menus, prisma, roleAccess, roles, upsertCoaTemplate(), upsertCustomer() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (9): createInitialPermissions(), getMenuGroup(), PermissionItem, PermissionKey, permissions, PermissionState, Props, RbacPermissionTable() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (10): calculateTotals(), GET(), nullableDate, nullableString, PATCH(), quotationItemSchema, quotationUpdateSchema, RouteContext (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (8): calculateTotals(), GET(), nullableDate, nullableString, POST(), quotationCreateSchema, quotationItemSchema, toDate()

### Community 23 - "Community 23"
Cohesion: 0.28
Nodes (8): cocItemSchema, cocSchema, ensureSampleAndParametersTx(), nullableDate, nullableString, POST(), RouteContext, toDate()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (7): DELETE(), GET(), normalizeCode(), PATCH(), RouteContext, templateParameterSchema, templateSchema

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (7): customerSchema, DELETE(), GET(), nullableEmail, nullableString, PATCH(), RouteContext

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (7): emptyForm, MasterCoaTemplateClient(), normalizeCode(), Props, TemplateForm, TemplateParamForm, TemplateWithParams

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (6): nullableDate, nullableString, POST(), RouteContext, stpsSchema, toDate()

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (5): GET(), normalizeCode(), POST(), templateParameterSchema, templateSchema

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (5): customerSchema, GET(), nullableEmail, nullableString, POST()

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (4): emptyForm, Props, UserForm, UserWithRelations

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (5): emptyForm, formatRupiah(), MasterParameterClient(), ParameterForm, Props

### Community 32 - "Community 32"
Cohesion: 0.70
Nodes (4): clean(), getCell(), POST(), yes()

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): PATCH(), resultSchema, RouteContext

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): PATCH(), resultSchema, RouteContext

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (3): accountSchema, POST(), RouteContext

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (3): poSchema, POST(), RouteContext

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): distributeSchema, PATCH(), RouteContext

## Knowledge Gaps
- **259 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+254 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSession()` connect `Community 0` to `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `requireAnyApiPermission()` connect `Community 7` to `Community 32`, `Community 0`, `Community 2`, `Community 4`, `Community 37`, `Community 6`, `Community 8`, `Community 11`, `Community 17`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `requireApiPermission()` connect `Community 6` to `Community 7`, `Community 8`, `Community 11`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05934065934065934 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06418219461697723 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06308610400682012 - nodes in this community are weakly interconnected._