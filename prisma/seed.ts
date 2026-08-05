import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum ada di .env");
  }

  const url = new URL(databaseUrl);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 10,
    // DB remote via internet: latensi bisa 1-5 detik, default 1000ms terlalu ketat.
    connectTimeout: 20000,
    acquireTimeout: 20000,
  });
}
// 
const prisma = new PrismaClient({
  adapter: createAdapter(),
});

const roles = [
  { name: "Super Admin", code: "SUPER_ADMIN" },
  { name: "Lab Admin", code: "LAB_ADMIN" },
  { name: "Lab Supervisor", code: "LAB_SUPERVISOR" },
  { name: "Lab Analyst", code: "LAB_ANALYST" },
  { name: "Lab Manager", code: "LAB_MANAGER" },
  { name: "Customer Engagement", code: "CUSTOMER_ENGAGEMENT" },
  { name: "Sales Staff", code: "SALES_STAFF" },
  { name: "Sales Manager / Director", code: "SALES_MANAGER_DIRECTOR" },
  { name: "Finance Staff", code: "FINANCE_STAFF" },
  { name: "Technical", code: "TECHNICAL" },
  { name: "Customer Service", code: "CUSTOMER_SERVICE" },
];

const menus = [
  { name: "Admin Dashboard", key: "dashboard.admin", href: "/dashboard/admin", icon: "Shield", sort: 1 },
  { name: "Worker Dashboard", key: "dashboard.worker", href: "/dashboard/worker", icon: "Briefcase", sort: 2 },
  { name: "Customer Dashboard", key: "dashboard.customer", href: "/dashboard/customer", icon: "Users", sort: 3 },
  { name: "Finance Dashboard", key: "dashboard.finance", href: "/dashboard/finance", icon: "Wallet", sort: 4 },
  { name: "Lab Dashboard", key: "dashboard.lab", href: "/dashboard/lab", icon: "FlaskConical", sort: 5 },

  { name: "RBAC Role & Menu", key: "admin.rbac", href: "/admin/rbac", icon: "KeyRound", sort: 10 },
  { name: "Users", key: "admin.users", href: "/admin/users", icon: "UserCog", sort: 11 },

  { name: "Master Customer", key: "master.customers", href: "/master/customers", icon: "Building2", sort: 20 },
  { name: "Master Parameter", key: "master.parameters", href: "/master/parameters", icon: "ListChecks", sort: 21 },
  { name: "Master COA Template", key: "master.coa_templates", href: "/master/coa-templates", icon: "FileBadge", sort: 22 },

  { name: "Request Quotation", key: "quotation.request", href: "/quotations/request", icon: "FilePlus", sort: 30 },
  { name: "Verify Quotation", key: "quotation.verify", href: "/quotations/verify", icon: "FileCheck", sort: 31 },
  { name: "Revise Quotation", key: "quotation.revise", href: "/quotations/revise", icon: "FilePenLine", sort: 32 },
  { name: "Approve Quotation", key: "quotation.approve", href: "/quotations/approve", icon: "BadgeCheck", sort: 33 },

  { name: "Create LTR", key: "sales.ltr", href: "/sales/ltr", icon: "FileText", sort: 40 },
  { name: "Sales Monitoring", key: "sales.monitoring", href: "/sales/monitoring", icon: "BarChart3", sort: 41 },
  { name: "Sampling Schedule", key: "sales.sampling_schedule", href: "/sales/sampling-schedule", icon: "CalendarRange", sort: 42 },

  { name: "Create COC", key: "technical.coc", href: "/technical/coc", icon: "ClipboardCheck", sort: 50 },
  { name: "Create STPS", key: "technical.stps", href: "/technical/stps", icon: "FileSignature", sort: 51 },

  { name: "Receive Sample", key: "lab.receive_sample", href: "/lab/receive-sample", icon: "PackageCheck", sort: 60 },
  { name: "Distribute Parameter", key: "lab.distribute_parameter", href: "/lab/distribute-parameter", icon: "Share2", sort: 61 },
  { name: "Conduct Analysis", key: "lab.conduct_analysis", href: "/lab/conduct-analysis", icon: "Microscope", sort: 62 },
  { name: "Enter Results", key: "lab.enter_results", href: "/lab/enter-results", icon: "ClipboardPen", sort: 63 },
  { name: "Review Results", key: "lab.review_results", href: "/lab/review-results", icon: "SearchCheck", sort: 64 },
  { name: "Verify Results", key: "lab.verify_results", href: "/lab/verify-results", icon: "CheckCheck", sort: 65 },
  { name: "Validate Results", key: "lab.validate_results", href: "/lab/validate-results", icon: "ShieldCheck", sort: 66 },
  { name: "Ask Retest", key: "lab.ask_retest", href: "/lab/retest", icon: "RefreshCcw", sort: 67 },
  { name: "Revision Audit Trail", key: "audit.revisions", href: "/audit/revisions", icon: "History", sort: 68 },

  { name: "Preliminary COA", key: "coa.preliminary", href: "/coa/preliminary", icon: "FileBadge", sort: 70 },
  { name: "Final COA", key: "coa.final", href: "/coa/final", icon: "Award", sort: 71 },

  { name: "Create Invoice", key: "finance.create_invoice", href: "/finance/create-invoice", icon: "Receipt", sort: 80 },
  { name: "Approve Invoice", key: "finance.approve_invoice", href: "/finance/approve-invoice", icon: "BadgeDollarSign", sort: 81 },
  { name: "My Invoices", key: "customer.invoices", href: "/customer/invoices", icon: "Receipt", sort: 82 },

  { name: "Support Center", key: "support.center", href: "/support", icon: "LifeBuoy", sort: 90 },
  { name: "Support Desk", key: "support.desk", href: "/support/desk", icon: "Headset", sort: 91 },
  { name: "FAQ Management", key: "support.faq", href: "/support/faq", icon: "HelpCircle", sort: 92 },
];

const roleAccess: Record<string, string[]> = {
  SUPER_ADMIN: menus.map((menu) => menu.key),

  LAB_ADMIN: [
    "dashboard.lab",
    "master.parameters",
    "master.coa_templates",
    "lab.receive_sample",
    "lab.distribute_parameter",
    "coa.preliminary",
    "coa.final",
  ],

  LAB_SUPERVISOR: [
    "dashboard.worker",
    "lab.review_results",
    "lab.verify_results",
    "lab.ask_retest",
    "audit.revisions",
  ],

  LAB_ANALYST: [
    "dashboard.worker",
    "lab.conduct_analysis",
    "lab.enter_results",
  ],

  LAB_MANAGER: [
    "dashboard.lab",
    "lab.validate_results",
    "lab.ask_retest",
    "audit.revisions",
    "coa.preliminary",
    "coa.final",
  ],

  CUSTOMER_ENGAGEMENT: [
    "dashboard.customer",
    "quotation.request",
    "coa.preliminary",
    "coa.final",
    "customer.invoices",
    "support.center",
  ],

  SALES_STAFF: [
    "dashboard.worker",
    "master.customers",
    "master.parameters",
    "master.coa_templates",
    "quotation.verify",
    "quotation.revise",
    "sales.ltr",
    "sales.monitoring",
    "sales.sampling_schedule",
    "audit.revisions",
  ],

  SALES_MANAGER_DIRECTOR: [
    "dashboard.worker",
    "quotation.approve",
    "sales.monitoring",
    "sales.sampling_schedule",
  ],

  FINANCE_STAFF: [
    "dashboard.finance",
    "finance.create_invoice",
    "finance.approve_invoice",
  ],

  TECHNICAL: [
    "dashboard.worker",
    "technical.coc",
    "technical.stps",
    "sales.sampling_schedule",
  ],

  CUSTOMER_SERVICE: [
    "dashboard.worker",
    "support.desk",
    "support.faq",
  ],
};

function getPermissionByRoleAndMenu(roleCode: string, menuKey: string, canView: boolean) {
  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  const base = {
    canView,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canApprove: false,
    canValidate: false,
    canExport: false,
  };

  if (isSuperAdmin) {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canApprove: true,
      canValidate: true,
      canExport: true,
    };
  }

  if (!canView) return base;

  if (menuKey === "audit.revisions") {
    return {
      ...base,
      canUpdate: [
        "SALES_STAFF",
        "LAB_SUPERVISOR",
        "LAB_MANAGER",
      ].includes(roleCode),
      canExport: true,
    };
  }

  if (menuKey.startsWith("dashboard.")) {
    return {
      ...base,
      canExport: true,
    };
  }

  if (roleCode === "CUSTOMER_ENGAGEMENT") {
    if (menuKey === "quotation.request") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey.startsWith("coa.")) {
      return {
        ...base,
        canExport: true,
      };
    }
    if (menuKey === "customer.invoices") {
  return {
    ...base,
    canExport: true,
  };
}

    if (menuKey === "support.center") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
      };
    }
  }

  if (roleCode === "CUSTOMER_SERVICE") {
    if (menuKey === "support.desk") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canApprove: true,
        canExport: true,
      };
    }

    if (menuKey === "support.faq") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "SALES_STAFF") {
    if (menuKey === "master.customers") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey === "master.parameters" || menuKey === "master.coa_templates") {
      return {
        ...base,
        canExport: true,
      };
    }

    if (menuKey === "quotation.verify") {
      return {
        ...base,
        canUpdate: true,
        canValidate: true,
        canExport: true,
      };
    }

    if (menuKey === "quotation.revise") {
      return {
        ...base,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey === "sales.ltr") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "SALES_MANAGER_DIRECTOR") {
    if (menuKey === "quotation.approve") {
      return {
        ...base,
        canApprove: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "TECHNICAL") {
    if (menuKey === "technical.coc" || menuKey === "technical.stps") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "LAB_ADMIN") {
    if (menuKey === "master.parameters" || menuKey === "master.coa_templates") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
        canExport: true,
      };
    }

    if (menuKey === "lab.receive_sample") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey === "lab.distribute_parameter") {
      return {
        ...base,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey.startsWith("coa.")) {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "LAB_SUPERVISOR") {
    if (menuKey === "lab.review_results") {
      return {
        ...base,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey === "lab.verify_results") {
      return {
        ...base,
        canUpdate: true,
        canValidate: true,
        canExport: true,
      };
    }

    if (menuKey === "lab.ask_retest") {
      return {
        ...base,
        canUpdate: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "LAB_ANALYST") {
    if (menuKey === "lab.conduct_analysis" || menuKey === "lab.enter_results") {
      return {
        ...base,
        canUpdate: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "LAB_MANAGER") {
    if (menuKey === "lab.validate_results") {
      return {
        ...base,
        canUpdate: true,
        canValidate: true,
        canExport: true,
      };
    }

    if (menuKey === "lab.ask_retest") {
      return {
        ...base,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey.startsWith("coa.")) {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canApprove: true,
        canExport: true,
      };
    }
  }

  if (roleCode === "FINANCE_STAFF") {
    if (menuKey === "finance.create_invoice") {
      return {
        ...base,
        canCreate: true,
        canUpdate: true,
        canExport: true,
      };
    }

    if (menuKey === "finance.approve_invoice") {
      return {
        ...base,
        canUpdate: true,
        canApprove: true,
        canExport: true,
      };
    }
  }

  return {
    ...base,
    canExport: true,
  };
}

async function upsertParameter(data: {
  name: string;
  unit?: string | null;
  method?: string | null;
  price?: number;
}) {
  const existing = await prisma.analysisParameter.findFirst({
    where: {
      name: data.name,
    },
  });

  if (existing) {
    return prisma.analysisParameter.update({
      where: {
        id: existing.id,
      },
      data: {
        unit: data.unit || null,
        method: data.method || null,
        price: data.price ?? existing.price,
        isActive: true,
      },
    });
  }

  return prisma.analysisParameter.create({
    data: {
      name: data.name,
      unit: data.unit || null,
      method: data.method || null,
      price: data.price ?? 0,
      isActive: true,
    },
  });
}

async function upsertCustomer(data: {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  npwp?: string | null;
  npwpAddress?: string | null;
}) {
  const existing = await prisma.customer.findFirst({
    where: {
      email: data.email,
    },
  });

  const payload = {
    name: data.name,
    company: data.company || null,
    email: data.email,
    phone: data.phone || null,
    contactPerson: data.contactPerson || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    province: data.province || null,
    npwp: data.npwp || null,
    npwpAddress: data.npwpAddress || null,

    billingCompany: data.company || null,
    billingAddressLine1: data.addressLine1 || null,
    billingAddressLine2: data.addressLine2 || null,
    billingContactPerson: data.contactPerson || null,
    billingEmail: data.email || null,
    billingPhone: data.phone || null,

    samplingCompany: data.company || null,
    samplingAddressLine1: data.addressLine1 || null,
    samplingAddressLine2: data.addressLine2 || null,
    samplingContactPerson: data.contactPerson || null,
    samplingPhone: data.phone || null,

    documentCompany: data.company || null,
    documentAddressLine1: data.addressLine1 || null,
    documentAddressLine2: data.addressLine2 || null,
    documentContactPerson: data.contactPerson || null,
    documentPhone: data.phone || null,

    recipientEmail1: data.email || null,
    recipientEmail2: null,
    recipientEmail3: null,
    recipientEmail4: null,
    isActive: true,
  };

  if (existing) {
    return prisma.customer.update({
      where: {
        id: existing.id,
      },
      data: payload,
    });
  }

  return prisma.customer.create({
    data: payload,
  });
}

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  roleCode: string;
  customerId?: string | null;
}) {
  const role = await prisma.role.findUnique({
    where: {
      code: data.roleCode,
    },
  });

  if (!role) {
    throw new Error(`Role ${data.roleCode} tidak ditemukan`);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.upsert({
    where: {
      email: data.email.toLowerCase(),
    },
    update: {
      name: data.name,
      password: hashedPassword,
      roleId: role.id,
      customerId: data.customerId || null,
      isActive: true,
    },
    create: {
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      roleId: role.id,
      customerId: data.customerId || null,
      isActive: true,
    },
  });
}

async function upsertCoaTemplate(data: {
  name: string;
  code: string;
  description?: string | null;
  parameters: Array<{
    parameterName: string;
    displayName?: string | null;
    unit?: string | null;
    method?: string | null;
    standard?: string | null;
    limitValue?: string | null;
    sort: number;
    isRequired?: boolean;
  }>;
}) {
  const template = await prisma.coaTemplate.upsert({
    where: {
      code: data.code,
    },
    update: {
      name: data.name,
      description: data.description || null,
      isActive: true,
    },
    create: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      isActive: true,
    },
  });

  await prisma.coaTemplateParameter.deleteMany({
    where: {
      templateId: template.id,
    },
  });

  for (const item of data.parameters) {
    const parameter = await prisma.analysisParameter.findFirst({
      where: {
        name: item.parameterName,
      },
    });

    if (!parameter) {
      throw new Error(`Parameter ${item.parameterName} tidak ditemukan`);
    }

    await prisma.coaTemplateParameter.create({
      data: {
        templateId: template.id,
        parameterId: parameter.id,
        displayName: item.displayName || parameter.name,
        unit: item.unit || parameter.unit || null,
        method: item.method || parameter.method || null,
        standard: item.standard || null,
        limitValue: item.limitValue || null,
        sort: item.sort,
        isRequired: item.isRequired ?? true,
        isActive: true,
      },
    });
  }

  return prisma.coaTemplate.findUnique({
    where: {
      id: template.id,
    },
    include: {
      parameters: {
        include: {
          parameter: true,
        },
        orderBy: {
          sort: "asc",
        },
      },
    },
  });
}

async function upsertFaqCategory(data: {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sort: number;
  items: Array<{
    question: string;
    answer: string;
    sort: number;
  }>;
}) {
  const category = await prisma.faqCategory.upsert({
    where: {
      slug: data.slug,
    },
    update: {
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      sort: data.sort,
      isActive: true,
    },
    create: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      icon: data.icon || null,
      sort: data.sort,
      isActive: true,
    },
  });

  await prisma.faqItem.deleteMany({
    where: {
      categoryId: category.id,
    },
  });

  for (const item of data.items) {
    await prisma.faqItem.create({
      data: {
        categoryId: category.id,
        question: item.question,
        answer: item.answer,
        sort: item.sort,
        isActive: true,
      },
    });
  }

  return category;
}

async function upsertCannedReply(data: {
  title: string;
  body: string;
  sort: number;
}) {
  const existing = await prisma.cannedReply.findFirst({
    where: {
      title: data.title,
    },
  });

  if (existing) {
    return prisma.cannedReply.update({
      where: {
        id: existing.id,
      },
      data: {
        body: data.body,
        sort: data.sort,
        isActive: true,
      },
    });
  }

  return prisma.cannedReply.create({
    data: {
      title: data.title,
      body: data.body,
      sort: data.sort,
      isActive: true,
    },
  });
}

async function main() {
  console.log("Seeding roles...");

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },
      update: {
        name: role.name,
      },
      create: role,
    });
  }

  console.log("Seeding menus...");

  for (const menu of menus) {
    await prisma.menu.upsert({
      where: {
        key: menu.key,
      },
      update: {
        ...menu,
        isActive: true,
      },
      create: menu,
    });
  }

  console.log("Seeding RBAC permissions...");

  const dbRoles = await prisma.role.findMany();
  const dbMenus = await prisma.menu.findMany();

  for (const role of dbRoles) {
    const allowedKeys = roleAccess[role.code] || [];

    for (const menu of dbMenus) {
      const canView = allowedKeys.includes(menu.key);
      const permission = getPermissionByRoleAndMenu(role.code, menu.key, canView);

      await prisma.roleMenu.upsert({
        where: {
          roleId_menuId: {
            roleId: role.id,
            menuId: menu.id,
          },
        },
        update: permission,
        create: {
          roleId: role.id,
          menuId: menu.id,
          ...permission,
        },
      });
    }
  }

  console.log("Seeding customers...");

  const customerMedialab = await upsertCustomer({
    name: "Customer Medialab",
    company: "PT Customer Demo Indonesia",
    email: "customer@medialab.test",
    phone: "08123456789",
    contactPerson: "Beni",
    addressLine1: "Jl. Kebagusan Pasar Minggu",
    addressLine2: "Jakarta Selatan",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    npwp: "69.731.704.8-646.000",
    npwpAddress: "Jl. Kebagusan Pasar Minggu, Jakarta Selatan",
  });

  const customerFactory = await upsertCustomer({
    name: "Customer Factory",
    company: "PT Factory Heat Stress Demo",
    email: "factory@medialab.test",
    phone: "081111222333",
    contactPerson: "Factory PIC",
    addressLine1: "Kawasan Industri Demo",
    addressLine2: "Bekasi",
    city: "Bekasi",
    province: "Jawa Barat",
    npwp: "00.000.000.0-000.000",
    npwpAddress: "Kawasan Industri Demo, Bekasi",
  });

  console.log("Seeding users...");

  await upsertUser({
    name: "Admin LIMS-Medialab",
    email: "admin@lims-medialab.test",
    password: "admin123",
    roleCode: "SUPER_ADMIN",
  });

  await upsertUser({
    name: "Lab Admin Demo",
    email: "labadmin@medialab.test",
    password: "password123",
    roleCode: "LAB_ADMIN",
  });

  await upsertUser({
    name: "Lab Supervisor Demo",
    email: "supervisor@medialab.test",
    password: "password123",
    roleCode: "LAB_SUPERVISOR",
  });

  await upsertUser({
    name: "Lab Analyst Demo",
    email: "analyst@medialab.test",
    password: "password123",
    roleCode: "LAB_ANALYST",
  });

  await upsertUser({
    name: "Lab Manager Demo",
    email: "labmanager@medialab.test",
    password: "password123",
    roleCode: "LAB_MANAGER",
  });

  await upsertUser({
    name: "Sales Staff Demo",
    email: "sales@medialab.test",
    password: "password123",
    roleCode: "SALES_STAFF",
  });

  await upsertUser({
    name: "Sales Manager Demo",
    email: "salesmanager@medialab.test",
    password: "password123",
    roleCode: "SALES_MANAGER_DIRECTOR",
  });

  await upsertUser({
    name: "Technical Demo",
    email: "technical@medialab.test",
    password: "password123",
    roleCode: "TECHNICAL",
  });

  await upsertUser({
    name: "Finance Demo",
    email: "finance@medialab.test",
    password: "password123",
    roleCode: "FINANCE_STAFF",
  });

  await upsertUser({
    name: "Customer Service Demo",
    email: "cs@medialab.test",
    password: "password123",
    roleCode: "CUSTOMER_SERVICE",
  });

  await upsertUser({
    name: "Customer Medialab",
    email: "customer@medialab.test",
    password: "customer123",
    roleCode: "CUSTOMER_ENGAGEMENT",
    customerId: customerMedialab.id,
  });

  await upsertUser({
    name: "Customer Factory",
    email: "factory@medialab.test",
    password: "customer123",
    roleCode: "CUSTOMER_ENGAGEMENT",
    customerId: customerFactory.id,
  });

  console.log("Seeding parameters...");

  await upsertParameter({
    name: "Sulfur Dioksida (SO2)",
    unit: "µg/m³",
    method: "Active Continuous / Manual",
    price: 150000,
  });

  await upsertParameter({
    name: "Karbon Monoksida (CO)",
    unit: "µg/m³",
    method: "Active Continuous",
    price: 150000,
  });

  await upsertParameter({
    name: "Nitrogen Dioksida (NO2)",
    unit: "µg/m³",
    method: "Active Continuous / Manual",
    price: 150000,
  });

  await upsertParameter({
    name: "Ozon (O3)",
    unit: "µg/m³",
    method: "Active Continuous / Manual",
    price: 150000,
  });

  await upsertParameter({
    name: "TSP",
    unit: "µg/m³",
    method: "Gravimetry",
    price: 175000,
  });

  await upsertParameter({
    name: "PM10",
    unit: "µg/m³",
    method: "Gravimetry / BAM",
    price: 175000,
  });

  await upsertParameter({
    name: "PM2.5",
    unit: "µg/m³",
    method: "Gravimetry / BAM",
    price: 175000,
  });

  await upsertParameter({
    name: "Timbal (Pb)",
    unit: "µg/m³",
    method: "AAS",
    price: 225000,
  });

  await upsertParameter({
    name: "Suhu Basah Alami",
    unit: "°C",
    method: "WBGT Meter",
    price: 75000,
  });

  await upsertParameter({
    name: "Suhu Bola",
    unit: "°C",
    method: "WBGT Meter",
    price: 75000,
  });

  await upsertParameter({
    name: "Suhu Kering",
    unit: "°C",
    method: "WBGT Meter",
    price: 75000,
  });

  await upsertParameter({
    name: "ISBB / WBGT",
    unit: "°C",
    method: "WBGT Calculation",
    price: 150000,
  });

  await upsertParameter({
    name: "Kelembaban Relatif",
    unit: "%RH",
    method: "Hygrometer",
    price: 50000,
  });

  await upsertParameter({
    name: "Kecepatan Angin",
    unit: "m/s",
    method: "Anemometer",
    price: 50000,
  });

  await upsertParameter({
    name: "Beban Kerja",
    unit: "Kategori",
    method: "Observasi Aktivitas Kerja",
    price: 50000,
  });

  console.log("Seeding COA templates...");

  await upsertCoaTemplate({
    name: "Air Ambient",
    code: "AIR_AMBIENT",
    description:
      "Template COA udara ambien. Contoh acuan: PP RI No. 22 Tahun 2021 Lampiran VII tentang Baku Mutu Udara Ambien.",
    parameters: [
      {
        parameterName: "Sulfur Dioksida (SO2)",
        displayName: "Sulfur Dioksida (SO₂)",
        unit: "µg/m³",
        method: "Active Continuous / Manual",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "150 µg/m³ (1 jam); 75 µg/m³ (24 jam); 45 µg/m³ (1 tahun)",
        sort: 1,
      },
      {
        parameterName: "Karbon Monoksida (CO)",
        displayName: "Karbon Monoksida (CO)",
        unit: "µg/m³",
        method: "Active Continuous",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "10000 µg/m³ (1 jam); 4000 µg/m³ (8 jam)",
        sort: 2,
      },
      {
        parameterName: "Nitrogen Dioksida (NO2)",
        displayName: "Nitrogen Dioksida (NO₂)",
        unit: "µg/m³",
        method: "Active Continuous / Manual",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "200 µg/m³ (1 jam); 65 µg/m³ (24 jam); 50 µg/m³ (1 tahun)",
        sort: 3,
      },
      {
        parameterName: "Ozon (O3)",
        displayName: "Oksidan Fotokimia sebagai Ozon (O₃)",
        unit: "µg/m³",
        method: "Active Continuous / Manual",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "150 µg/m³ (1 jam); 100 µg/m³ (8 jam); 35 µg/m³ (1 tahun)",
        sort: 4,
      },
      {
        parameterName: "TSP",
        displayName: "Partikulat Debu < 100 µm (TSP)",
        unit: "µg/m³",
        method: "Active Manual / Gravimetry",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "230 µg/m³ (24 jam)",
        sort: 5,
      },
      {
        parameterName: "PM10",
        displayName: "Partikulat Debu < 10 µm (PM10)",
        unit: "µg/m³",
        method: "Active Continuous / Manual",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "75 µg/m³ (24 jam); 40 µg/m³ (1 tahun)",
        sort: 6,
      },
      {
        parameterName: "PM2.5",
        displayName: "Partikulat Debu < 2,5 µm (PM2.5)",
        unit: "µg/m³",
        method: "Active Continuous / Manual",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "55 µg/m³ (24 jam); 15 µg/m³ (1 tahun)",
        sort: 7,
      },
      {
        parameterName: "Timbal (Pb)",
        displayName: "Timbal (Pb)",
        unit: "µg/m³",
        method: "Active Manual / AAS",
        standard: "PP RI No. 22 Tahun 2021 Lampiran VII",
        limitValue: "2 µg/m³ (24 jam)",
        sort: 8,
      },
    ],
  });

  await upsertCoaTemplate({
    name: "Heat Stress",
    code: "HEAT_STRESS",
    description:
      "Template COA pengukuran iklim kerja / heat stress. Contoh acuan: Permenaker No. 5 Tahun 2018 tentang K3 Lingkungan Kerja.",
    parameters: [
      {
        parameterName: "Suhu Basah Alami",
        displayName: "Suhu Basah Alami",
        unit: "°C",
        method: "WBGT Meter",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Parameter pengukuran",
        sort: 1,
      },
      {
        parameterName: "Suhu Bola",
        displayName: "Suhu Bola",
        unit: "°C",
        method: "WBGT Meter",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Parameter pengukuran",
        sort: 2,
      },
      {
        parameterName: "Suhu Kering",
        displayName: "Suhu Kering",
        unit: "°C",
        method: "WBGT Meter",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Parameter pengukuran",
        sort: 3,
      },
      {
        parameterName: "ISBB / WBGT",
        displayName: "Indeks Suhu Basah dan Bola (ISBB/WBGT)",
        unit: "°C",
        method: "WBGT Calculation",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Ringan ≤ 30,0°C; Sedang ≤ 28,0°C; Berat ≤ 26,0°C",
        sort: 4,
      },
      {
        parameterName: "Kelembaban Relatif",
        displayName: "Kelembaban Relatif",
        unit: "%RH",
        method: "Hygrometer",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Data pendukung",
        sort: 5,
      },
      {
        parameterName: "Kecepatan Angin",
        displayName: "Kecepatan Angin",
        unit: "m/s",
        method: "Anemometer",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Data pendukung",
        sort: 6,
      },
      {
        parameterName: "Beban Kerja",
        displayName: "Beban Kerja",
        unit: "Kategori",
        method: "Observasi Aktivitas Kerja",
        standard: "Permenaker No. 5 Tahun 2018",
        limitValue: "Ringan / Sedang / Berat",
        sort: 7,
      },
    ],
  });

  console.log("Seeding FAQ categories & items...");

  await upsertFaqCategory({
    name: "Quotation",
    slug: "quotation",
    description: "Pertanyaan seputar permintaan penawaran (quotation).",
    icon: "FilePlus",
    sort: 1,
    items: [
      {
        question: "Bagaimana cara mengajukan permintaan quotation?",
        answer:
          "Masuk ke menu Quotation → Request Quotation, pilih parameter analisa yang dibutuhkan, isi detail sampel, lalu kirim. Tim sales kami akan memverifikasi dan mengirimkan penawaran resmi.",
        sort: 1,
      },
      {
        question: "Berapa lama proses penerbitan quotation?",
        answer:
          "Umumnya 1–2 hari kerja setelah permintaan diverifikasi. Untuk permintaan URGENT, hubungi kami lewat Support Center agar diprioritaskan.",
        sort: 2,
      },
      {
        question: "Apakah quotation bisa direvisi?",
        answer:
          "Bisa. Selama status masih dalam tahap negosiasi/revisi, sampaikan perubahan yang diinginkan dan tim sales akan menerbitkan revisi quotation.",
        sort: 3,
      },
    ],
  });

  await upsertFaqCategory({
    name: "Sample & Pengiriman",
    slug: "sample-pengiriman",
    description: "Seputar pengiriman dan penerimaan sampel di laboratorium.",
    icon: "PackageCheck",
    sort: 2,
    items: [
      {
        question: "Bagaimana cara mengirim sampel ke laboratorium?",
        answer:
          "Setelah quotation disetujui dan LTR/COC terbit, sampel dapat dikirim langsung, diantar kurir, atau dijemput oleh tim sampling Medialab sesuai kesepakatan pada COC.",
        sort: 1,
      },
      {
        question: "Bagaimana kondisi sampel yang baik saat diterima?",
        answer:
          "Sampel harus sesuai wadah dan metode pengambilan yang disepakati, tidak bocor/rusak, dan disertai identitas sampel yang jelas. Kondisi abnormal akan dicatat saat penerimaan.",
        sort: 2,
      },
      {
        question: "Bagaimana saya tahu sampel sudah diterima?",
        answer:
          "Status sampel akan diperbarui menjadi RECEIVED. Anda dapat memantau progres dari dashboard, atau tanyakan ke tim kami lewat Support Center.",
        sort: 3,
      },
    ],
  });

  await upsertFaqCategory({
    name: "COA / Hasil",
    slug: "coa-hasil",
    description: "Seputar hasil uji dan sertifikat analisa (COA).",
    icon: "FileBadge",
    sort: 3,
    items: [
      {
        question: "Apa beda Preliminary COA dan Final COA?",
        answer:
          "Preliminary COA adalah hasil awal untuk dikonfirmasi customer sebelum diterbitkan resmi. Final COA adalah sertifikat resmi yang sudah divalidasi dan disahkan.",
        sort: 1,
      },
      {
        question: "Bagaimana cara mengunduh COA saya?",
        answer:
          "COA dapat diunduh dari menu terkait di area customer setelah statusnya terbit. Jika tombol unduh belum muncul, hasil kemungkinan masih dalam proses validasi.",
        sort: 2,
      },
      {
        question: "Hasil uji melebihi baku mutu, apa yang harus saya lakukan?",
        answer:
          "COA mencantumkan acuan baku mutu yang berlaku. Untuk interpretasi lebih lanjut atau permintaan uji ulang (retest), silakan buka tiket di Support Center.",
        sort: 3,
      },
    ],
  });

  await upsertFaqCategory({
    name: "Invoice & Pembayaran",
    slug: "invoice-pembayaran",
    description: "Seputar tagihan dan pembayaran.",
    icon: "Receipt",
    sort: 4,
    items: [
      {
        question: "Kapan invoice diterbitkan?",
        answer:
          "Invoice diterbitkan oleh tim finance setelah Final COA terbit. Anda dapat melihatnya di menu My Invoices.",
        sort: 1,
      },
      {
        question: "Bagaimana cara membayar dan mengunggah bukti pembayaran?",
        answer:
          "Buka menu My Invoices, pilih invoice terkait, lalu unggah bukti transfer. Tim finance akan memverifikasi dan memperbarui status menjadi PAID.",
        sort: 2,
      },
      {
        question: "Berapa lama verifikasi pembayaran?",
        answer:
          "Umumnya 1 hari kerja setelah bukti pembayaran diunggah. Jika lebih lama, hubungi kami lewat Support Center.",
        sort: 3,
      },
    ],
  });

  await upsertFaqCategory({
    name: "Akun",
    slug: "akun",
    description: "Seputar akun dan akses portal customer.",
    icon: "UserCog",
    sort: 5,
    items: [
      {
        question: "Saya lupa password, bagaimana cara meresetnya?",
        answer:
          "Silakan hubungi tim kami lewat Support Center dengan menyebutkan email akun Anda, dan kami akan membantu proses reset password.",
        sort: 1,
      },
      {
        question: "Bagaimana cara memperbarui data perusahaan/kontak?",
        answer:
          "Ajukan perubahan data melalui Support Center. Tim kami akan memperbarui master data customer Anda.",
        sort: 2,
      },
    ],
  });

  await upsertFaqCategory({
    name: "Lainnya",
    slug: "lainnya",
    description: "Pertanyaan umum lainnya.",
    icon: "HelpCircle",
    sort: 6,
    items: [
      {
        question: "Jam operasional layanan Customer Service?",
        answer:
          "Senin–Jumat, 08.00–17.00 WIB. Tiket yang masuk di luar jam kerja akan ditanggapi pada hari kerja berikutnya.",
        sort: 1,
      },
      {
        question: "Pertanyaan saya tidak ada di FAQ, apa yang harus saya lakukan?",
        answer:
          "Pilih topik yang paling mendekati lalu klik 'Masih butuh bantuan? Chat CS' untuk membuka tiket. Tim Customer Service kami akan membantu Anda.",
        sort: 2,
      },
    ],
  });

  console.log("Seeding canned replies...");

  await upsertCannedReply({
    title: "Salam pembuka",
    body:
      "Halo, terima kasih telah menghubungi Customer Service Medialab. Perkenalkan saya akan membantu Anda. Mohon menunggu sebentar ya.",
    sort: 1,
  });

  await upsertCannedReply({
    title: "Minta detail",
    body:
      "Untuk membantu menelusuri, boleh dibantu informasikan nomor quotation / sample / invoice yang terkait?",
    sort: 2,
  });

  await upsertCannedReply({
    title: "Sedang diperiksa",
    body:
      "Mohon menunggu sebentar, kami sedang memeriksa hal ini ke tim terkait. Terima kasih atas kesabarannya.",
    sort: 3,
  });

  await upsertCannedReply({
    title: "Penutup",
    body:
      "Apakah ada hal lain yang bisa kami bantu? Jika sudah cukup, tiket ini akan kami tandai selesai. Terima kasih telah menghubungi kami.",
    sort: 4,
  });

  console.log("\nSeed selesai bro.");
  console.log("\nAkun login demo:");
  console.log("SUPER_ADMIN            : admin@lims-medialab.test / admin123");
  console.log("CUSTOMER_ENGAGEMENT   : customer@medialab.test / customer123");
  console.log("CUSTOMER_ENGAGEMENT 2 : factory@medialab.test / customer123");
  console.log("SALES_STAFF           : sales@medialab.test / password123");
  console.log("SALES_MANAGER         : salesmanager@medialab.test / password123");
  console.log("TECHNICAL             : technical@medialab.test / password123");
  console.log("LAB_ADMIN             : labadmin@medialab.test / password123");
  console.log("LAB_ANALYST           : analyst@medialab.test / password123");
  console.log("LAB_SUPERVISOR        : supervisor@medialab.test / password123");
  console.log("LAB_MANAGER           : labmanager@medialab.test / password123");
  console.log("FINANCE               : finance@medialab.test / password123");
  console.log("CUSTOMER_SERVICE      : cs@medialab.test / password123");
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
