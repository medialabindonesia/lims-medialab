"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUpItem, staggerContainer, EASE_OUT } from "@/lib/motion";
import ExportButtons from "@/components/exports/ExportButtons";
import Select, { type SelectOption } from "@/components/ui/Select";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  FileCheck,
  FilePenLine,
  FilePlus,
  FileText,
  Lock,
  Percent,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Disclosure from "@/components/ui/Disclosure";
import DocumentCode from "@/components/ui/DocumentCode";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatShortDate,
  humanOrderTitle,
  parseDocumentNumber,
  quotationStatusMeta,
} from "@/lib/customer-labels";

type FlowMode = "request" | "verify" | "revise" | "approve" | "ltr" | "coc";

type CustomerOption = {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  billingCompany?: string | null;
  billingEmail?: string | null;
  samplingCompany?: string | null;
  samplingAddressLine1?: string | null;
  samplingAddressLine2?: string | null;
  documentCompany?: string | null;
  recipientEmail1?: string | null;
};

type ParameterOption = {
  id: string;
  name: string;
  unit?: string | null;
  method?: string | null;
  price: number;
};

type TemplateParameterOption = {
  id: string;
  parameterId: string;
  displayName?: string | null;
  unit?: string | null;
  method?: string | null;
  standard?: string | null;
  limitValue?: string | null;
  sort: number;
  isActive: boolean;
  parameter: ParameterOption;
};

type CoaTemplateOption = {
  id: string;
  name: string;
  code: string;
  parameters: TemplateParameterOption[];
};

type QuotationItem = {
  id: string;
  qty: number;
  price: number;
  description?: string | null;
  customerSampleId?: string | null;
  samplingLocation?: string | null;
  regulationMatrix?: string | null;
  durationSampling?: string | null;
  method?: string | null;
  parameter: ParameterOption;
};

type Quotation = {
  id: string;
  quotationNo: string;
  status: string;
  note?: string | null;
  revisionReason?: string | null;
  rejectionReason?: string | null;
  postApprovalEditReason?: string | null;
  totalAmount: number;
  samplingCost: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  quotationDate?: string | null;
  validUntil?: string | null;
  samplingBy?: string | null;
  testingObjective?: string | null;
  tatRequested?: string | null;
  paymentTerm?: string | null;
  termsNote?: string | null;
  createdAt: string;
  customer: CustomerOption;
  coaTemplate?: {
    id: string;
    name: string;
    code: string;
  } | null;
  items: QuotationItem[];
  purchaseOrder?: {
    id: string;
    poNumber: string;
    fileUrl?: string | null;
  } | null;
  ltr?: {
    id: string;
    ltrNo: string;
  } | null;
  ltrs?: Array<{
    id: string;
    ltrNo: string;
    sequence: number;
    groupLabel?: string | null;
    items: Array<{ quotationItemId: string }>;
  }>;
  coc?: {
    id: string;
    cocNo: string;
  } | null;
  cocs?: Array<{
    id: string;
    cocNo: string;
    sequence: number;
    groupLabel?: string | null;
    items: Array<{ quotationItemId: string }>;
  }>;
  requestedBy?: { id: string; name: string; email: string } | null;
  revisions?: Array<{
    id: string;
    revisionNo: number;
    action: string;
    changeSummary?: string | null;
    reason?: string | null;
    actorNameSnapshot?: string | null;
    createdAt: string;
  }>;
  stps?: Array<{
    id: string;
    stpsNo: string;
    status: string;
  }>;
};

type Props = {
  mode: FlowMode;
  customers: CustomerOption[];
  parameters: ParameterOption[];
  coaTemplates: CoaTemplateOption[];
  initialQuotations: Quotation[];
  /** Role pemakai halaman — menentukan apakah istilah internal diterjemahkan. */
  viewerRole?: string;
};

type FormItem = {
  parameterId: string;
  qty: number;
  customPrice?: number;
  description: string;
  customerSampleId: string;
  samplingLocation: string;
  regulationMatrix: string;
  durationSampling: string;
  method: string;
};

type QuotationForm = {
  id?: string;
  editReason: string;
  customerId: string;
  coaTemplateId: string;
  note: string;

  quotationDate: string;
  validUntil: string;

  samplingBy: "MEDIALAB" | "CUSTOMER" | "THIRD_PARTY";
  testingObjective:
    | "ROUTINE_MONITORING"
    | "SUPERVISION"
    | "CASE_PROOF"
    | "RESEARCH"
    | "OTHER";
  tatRequested: "NORMAL" | "URGENT" | "TOP_URGENT";

  samplingCost: number;
  vatPercent: number;

  paymentTerm: string;
  termsNote: string;

  items: FormItem[];
};

type ModalTab = "detail" | "items" | "terms";

/**
 * Langkah pembuatan quotation, dikerjakan berurutan. Sebelumnya ketiganya
 * berupa tab bebas-lompat sehingga user gampang menyimpan data setengah jadi
 * dan, di layar mobile, kehilangan konteks "sudah sampai mana".
 */
const WIZARD_STEPS = [
  { key: "detail", label: "Detail", title: "Quotation Detail" },
  { key: "items", label: "Parameter", title: "Parameter & Pricing" },
  { key: "terms", label: "Ringkasan", title: "Terms & Summary" },
] as const;

/**
 * Syarat kelengkapan tiap langkah. Dipakai untuk mengunci tombol "Lanjut"
 * sekaligus menampilkan alasan kenapa belum bisa lanjut.
 */
function getStepIssues(step: ModalTab, form: QuotationForm): string[] {
  const issues: string[] = [];

  if (step === "detail") {
    if (!form.customerId) issues.push("Pilih customer terlebih dahulu.");
    if (!form.coaTemplateId) issues.push("Pilih template COA terlebih dahulu.");
    if (!form.quotationDate) issues.push("Tanggal quotation wajib diisi.");
    if (!form.validUntil) issues.push("Tanggal valid until wajib diisi.");
    if (
      form.quotationDate &&
      form.validUntil &&
      form.validUntil < form.quotationDate
    ) {
      issues.push("Valid until tidak boleh mendahului tanggal quotation.");
    }
  }

  if (step === "items") {
    if (form.items.length === 0) {
      issues.push("Tambahkan minimal satu parameter.");
    }
    if (form.items.some((item) => !item.parameterId)) {
      issues.push("Masih ada baris parameter yang belum dipilih.");
    }
    if (form.items.some((item) => !item.qty || Number(item.qty) < 1)) {
      issues.push("Qty setiap parameter minimal 1.");
    }
  }

  if (step === "terms") {
    if (!form.paymentTerm.trim()) issues.push("Payment term wajib diisi.");
    if (form.id && form.editReason.trim().length < 8) {
      issues.push("Alasan revisi minimal 8 karakter.");
    }
  }

  return issues;
}

const flowSteps = [
  "REQUESTED",
  "REVISION",
  "REJECTED",
  "NEGOTIATION",
  "CONFIRMED",
  "VERIFIED",
  "APPROVED",
  "PO_UPLOADED",
  "LTR_CREATED",
  "COC_CREATED",
];

const modeConfig: Record<
  FlowMode,
  {
    title: string;
    description: string;
    empty: string;
  }
> = {
  request: {
    title: "Request Quotation",
    description:
      "Customer membuat quotation sesuai template dokumen, meminta revisi, ACC quotation, dan upload PO.",
    empty: "Belum ada quotation.",
  },
  verify: {
    title: "Verify Quotation",
    description: "Staff melakukan verifikasi setelah customer ACC quotation.",
    empty: "Tidak ada quotation yang sudah di-ACC customer.",
  },
  revise: {
    title: "Revise Quotation",
    description:
      "Staff merevisi harga, parameter, dan detail quotation berdasarkan permintaan customer.",
    empty: "Tidak ada quotation yang diminta revisi customer.",
  },
  approve: {
    title: "Approve Quotation",
    description: "Manager approve quotation yang sudah diverifikasi staff.",
    empty: "Tidak ada quotation yang menunggu approval.",
  },
  ltr: {
    title: "Create LTR",
    description: "Buat LTR setelah quotation approved dan PO sudah diupload.",
    empty: "Tidak ada quotation yang siap dibuat LTR.",
  },
  coc: {
    title: "Create COC",
    description: "Buat COC setelah LTR selesai dibuat.",
    empty: "Tidak ada quotation yang siap dibuat COC.",
  },
};

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysInputDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    REQUESTED: "bg-blue-50 text-blue-700",
    REVISION: "bg-yellow-50 text-yellow-700",
    REJECTED: "bg-red-50 text-red-700",
    NEGOTIATION: "bg-orange-50 text-orange-700",
    CONFIRMED: "bg-green-50 text-green-700",
    VERIFIED: "bg-cyan-50 text-cyan-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    PO_UPLOADED: "bg-purple-50 text-purple-700",
    LTR_CREATED: "bg-indigo-50 text-indigo-700",
    COC_CREATED: "bg-pink-50 text-pink-700",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

function getStepIndex(status: string) {
  const index = flowSteps.indexOf(status);
  return index === -1 ? 0 : index;
}

function samplingByLabel(value?: string | null) {
  const labels: Record<string, string> = {
    MEDIALAB: "Medialab",
    CUSTOMER: "Customer",
    THIRD_PARTY: "Third Party",
  };

  return value ? labels[value] || value : "-";
}

function testingObjectiveLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ROUTINE_MONITORING: "Routine Monitoring",
    SUPERVISION: "Supervision",
    CASE_PROOF: "Case Proof",
    RESEARCH: "Research",
    OTHER: "Other",
  };

  return value ? labels[value] || value : "-";
}

function tatLabel(value?: string | null) {
  const labels: Record<string, string> = {
    NORMAL: "Normal",
    URGENT: "Urgent",
    TOP_URGENT: "Top Urgent",
  };

  return value ? labels[value] || value : "-";
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={[
            "w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 text-slate-900 outline-none transition focus:border-emerald-500",
            Icon ? "pl-11" : "pl-4",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <Select
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={label}
        buttonClassName="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 outline-none transition hover:border-blue-300"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
      />
    </div>
  );
}

export default function QuotationFlowClient({
  mode,
  customers,
  parameters,
  coaTemplates,
  initialQuotations,
  viewerRole,
}: Props) {
  const reduce = useReducedMotion();
  const isCustomerView = viewerRole === "CUSTOMER_ENGAGEMENT";

  const [mounted, setMounted] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [openForm, setOpenForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("detail");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [documentQuotation, setDocumentQuotation] = useState<Quotation | null>(null);
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentItemIds, setDocumentItemIds] = useState<string[]>([]);

  function buildItemsFromTemplate(templateId: string): FormItem[] {
    const template = coaTemplates.find((item) => item.id === templateId);
    const templateParameters = template?.parameters || [];

    if (templateParameters.length > 0) {
      return templateParameters.map((item, index) => ({
        parameterId: item.parameterId,
        qty: 1,
        customPrice: item.parameter.price,
        description: item.displayName || item.parameter.name,
        customerSampleId: `SAMPLE-${index + 1}`,
        samplingLocation: "",
        regulationMatrix: item.standard || "",
        durationSampling: "",
        method: item.method || item.parameter.method || "",
      }));
    }

    return [
      {
        parameterId: parameters[0]?.id || "",
        qty: 1,
        customPrice: parameters[0]?.price || 0,
        description: parameters[0]?.name || "",
        customerSampleId: "SAMPLE-1",
        samplingLocation: "",
        regulationMatrix: "",
        durationSampling: "",
        method: parameters[0]?.method || "",
      },
    ];
  }

  const defaultTemplateId = coaTemplates[0]?.id || "";

  const [form, setForm] = useState<QuotationForm>({
    editReason: "",
    customerId: customers[0]?.id || "",
    coaTemplateId: defaultTemplateId,
    note: "",

    quotationDate: getTodayInputDate(),
    validUntil: addDaysInputDate(30),

    samplingBy: "MEDIALAB",
    testingObjective: "ROUTINE_MONITORING",
    tatRequested: "NORMAL",

    samplingCost: 0,
    vatPercent: 11,

    paymentTerm: "Pembayaran dilakukan setelah invoice diterima.",
    termsNote:
      "Harga belum termasuk biaya tambahan di luar lingkup pekerjaan yang disepakati.",

    items: buildItemsFromTemplate(defaultTemplateId),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!openForm && !documentQuotation) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openForm, documentQuotation]);

  const config = modeConfig[mode];

  // Customer memakai bahasa sehari-hari; staf internal tetap memakai istilah
  // dokumen resmi supaya rujukan antar tim tidak berubah.
  const headerCopy =
    isCustomerView && mode === "request"
      ? {
          title: "Penawaran Saya",
          description:
            "Ajukan permintaan penawaran, pantau persetujuannya, lalu unggah PO setelah penawaran disetujui.",
          empty: "Belum ada penawaran. Mulai dengan mengajukan penawaran baru.",
        }
      : config;

  // --- Wizard form ---------------------------------------------------------
  // Buat baru: langkah dikunci berurutan supaya data tidak setengah jadi.
  // Revisi: semua langkah sudah pernah terisi, jadi user bebas melompat ke
  // bagian yang ingin diubah dan bisa menyimpan kapan saja.
  const isEditing = Boolean(form.id);
  const stepIndex = Math.max(
    0,
    WIZARD_STEPS.findIndex((step) => step.key === activeTab)
  );
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const currentStepIssues = getStepIssues(activeTab, form);
  const allStepIssues = WIZARD_STEPS.flatMap((step) =>
    getStepIssues(step.key, form)
  );

  function isStepUnlocked(index: number) {
    if (isEditing || index <= stepIndex) return true;

    return WIZARD_STEPS.slice(0, index).every(
      (step) => getStepIssues(step.key, form).length === 0
    );
  }

  function goToStep(index: number) {
    const target = WIZARD_STEPS[index];

    if (!target || !isStepUnlocked(index)) return;

    setActiveTab(target.key);
    setMessage("");
  }

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === form.customerId);
  }, [customers, form.customerId]);

  const selectedTemplate = useMemo(() => {
    return coaTemplates.find((template) => template.id === form.coaTemplateId);
  }, [coaTemplates, form.coaTemplateId]);

  const selectedTemplateParameters = useMemo(() => {
    return selectedTemplate?.parameters || [];
  }, [selectedTemplate]);

  const parameterMap = useMemo(() => {
    return new Map(parameters.map((parameter) => [parameter.id, parameter]));
  }, [parameters]);

  const visibleQuotations = useMemo(() => {
    const keyword = search.toLowerCase();

    const byMode =
      mode === "request"
        ? quotations
        : mode === "verify"
          ? quotations.filter((quotation) => quotation.status === "CONFIRMED")
            : mode === "revise"
            ? quotations.filter((quotation) =>
                ["REVISION", "REJECTED", "APPROVED", "PO_UPLOADED"].includes(
                  quotation.status
                )
              )
            : mode === "approve"
              ? quotations.filter((quotation) => quotation.status === "VERIFIED")
              : mode === "ltr"
                ? quotations.filter(
                    (quotation) =>
                      ["PO_UPLOADED", "LTR_CREATED", "COC_CREATED"].includes(
                        quotation.status
                      )
                  )
                : mode === "coc"
                  ? quotations.filter(
                      (quotation) => quotation.status === "LTR_CREATED"
                    )
                  : quotations;

    return byMode.filter((quotation) => {
      return (
        quotation.quotationNo.toLowerCase().includes(keyword) ||
        quotation.customer?.name?.toLowerCase().includes(keyword) ||
        quotation.customer?.company?.toLowerCase().includes(keyword) ||
        quotation.coaTemplate?.name?.toLowerCase().includes(keyword)
      );
    });
  }, [mode, quotations, search]);

  const totalFormAmount = useMemo(() => {
    return form.items.reduce((total, item) => {
      const parameter = parameterMap.get(item.parameterId);
      const price = item.customPrice ?? parameter?.price ?? 0;

      return total + price * item.qty;
    }, 0);
  }, [form.items, parameterMap]);

  const taxableAmount = totalFormAmount + Number(form.samplingCost || 0);
  const vatAmount = taxableAmount * (Number(form.vatPercent || 0) / 100);
  const grandTotal = taxableAmount + vatAmount;

  function resetForm() {
    const templateId = coaTemplates[0]?.id || "";

    setForm({
      editReason: "",
      customerId: customers[0]?.id || "",
      coaTemplateId: templateId,
      note: "",

      quotationDate: getTodayInputDate(),
      validUntil: addDaysInputDate(30),

      samplingBy: "MEDIALAB",
      testingObjective: "ROUTINE_MONITORING",
      tatRequested: "NORMAL",

      samplingCost: 0,
      vatPercent: 11,

      paymentTerm: "Pembayaran dilakukan setelah invoice diterima.",
      termsNote:
        "Harga belum termasuk biaya tambahan di luar lingkup pekerjaan yang disepakati.",

      items: buildItemsFromTemplate(templateId),
    });
  }

  function handleCreate() {
    resetForm();
    setActiveTab("detail");
    setMessage("");
    setOpenForm(true);
  }

  function handleEdit(quotation: Quotation) {
    const templateId = quotation.coaTemplate?.id || coaTemplates[0]?.id || "";

    setForm({
      id: quotation.id,
      editReason: "",
      customerId: quotation.customer.id,
      coaTemplateId: templateId,
      note: quotation.note || "",

      quotationDate: toInputDate(quotation.quotationDate) || getTodayInputDate(),
      validUntil: toInputDate(quotation.validUntil) || addDaysInputDate(30),

      samplingBy: (quotation.samplingBy as QuotationForm["samplingBy"]) || "MEDIALAB",
      testingObjective:
        (quotation.testingObjective as QuotationForm["testingObjective"]) ||
        "ROUTINE_MONITORING",
      tatRequested:
        (quotation.tatRequested as QuotationForm["tatRequested"]) || "NORMAL",

      samplingCost: quotation.samplingCost || 0,
      vatPercent: quotation.vatPercent ?? 11,

      paymentTerm:
        quotation.paymentTerm || "Pembayaran dilakukan setelah invoice diterima.",
      termsNote:
        quotation.termsNote ||
        "Harga belum termasuk biaya tambahan di luar lingkup pekerjaan yang disepakati.",

      items: quotation.items.map((item, index) => ({
        parameterId: item.parameter.id,
        qty: item.qty,
        customPrice: item.price,
        description: item.description || item.parameter.name,
        customerSampleId: item.customerSampleId || `SAMPLE-${index + 1}`,
        samplingLocation: item.samplingLocation || "",
        regulationMatrix: item.regulationMatrix || "",
        durationSampling: item.durationSampling || "",
        method: item.method || item.parameter.method || "",
      })),
    });

    setActiveTab("detail");
    setMessage("");
    setOpenForm(true);
  }

  function changeTemplate(templateId: string) {
    setForm((prev) => ({
      ...prev,
      coaTemplateId: templateId,
      items: buildItemsFromTemplate(templateId),
    }));
  }

  function updateItem(
    index: number,
    key: keyof FormItem,
    value: string | number
  ) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }));
  }

  function changeParameter(index: number, parameterId: string) {
    const parameter = parameterMap.get(parameterId);
    const templateParameter = selectedTemplateParameters.find(
      (item) => item.parameterId === parameterId
    );

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              parameterId,
              customPrice: parameter?.price || 0,
              description: templateParameter?.displayName || parameter?.name || "",
              regulationMatrix: templateParameter?.standard || "",
              method: templateParameter?.method || parameter?.method || "",
            }
          : item
      ),
    }));
  }

  function addItem() {
    const available = selectedTemplateParameters.find(
      (templateParameter) =>
        !form.items.some(
          (formItem) => formItem.parameterId === templateParameter.parameterId
        )
    );

    if (!available) {
      alert("Semua parameter dari template ini sudah ditambahkan.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          parameterId: available.parameterId,
          qty: 1,
          customPrice: available.parameter.price,
          description: available.displayName || available.parameter.name,
          customerSampleId: `SAMPLE-${prev.items.length + 1}`,
          samplingLocation: "",
          regulationMatrix: available.standard || "",
          durationSampling: "",
          method: available.method || available.parameter.method || "",
        },
      ],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function copySamplingAddressToAllItems() {
    const address = [
      selectedCustomer?.samplingAddressLine1,
      selectedCustomer?.samplingAddressLine2,
    ]
      .filter(Boolean)
      .join(", ");

    if (!address) {
      alert("Customer belum punya alamat sampling.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        samplingLocation: item.samplingLocation || address,
      })),
    }));
  }

  async function refreshData() {
    const response = await fetch("/api/quotations");
    const data = await response.json();

    if (response.ok) {
      setQuotations(data.quotations);
    }
  }

  async function submitQuotation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Jaga-jaga bila form ter-submit lewat tombol Enter dari langkah awal:
    // wizard tidak boleh menyimpan data yang belum lengkap.
    const blockingIssues = WIZARD_STEPS.flatMap((step) =>
      getStepIssues(step.key, form)
    );

    if (blockingIssues.length > 0) {
      setMessage(blockingIssues[0]);
      return;
    }

    setLoading(true);
    setMessage("");

    const url = form.id ? `/api/quotations/${form.id}` : "/api/quotations";
    const method = form.id ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menyimpan quotation");
      return;
    }

    setMessage(data.message || "Quotation berhasil disimpan");
    setOpenForm(false);
    resetForm();
    await refreshData();
  }

  async function runAction(
    endpoint: string,
    method: "POST" | "PATCH" = "PATCH",
    body?: Record<string, unknown>
  ) {
    setLoading(true);
    setMessage("");

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Action gagal");
      return false;
    }

    setMessage(data.message || "Action berhasil");
    await refreshData();
    return true;
  }

  async function uploadPo(quotation: Quotation) {
    const poNumber = window.prompt(
      `Masukkan nomor PO untuk ${quotation.quotationNo}`
    );

    if (!poNumber) return;

    const fileUrl = window.prompt(
      "Masukkan link file PO. Boleh kosong dulu kalau belum ada."
    );

    await runAction(`/api/quotations/${quotation.id}/po`, "POST", {
      poNumber,
      fileUrl: fileUrl || "",
    });
  }

  async function requestRevision(quotation: Quotation) {
    const revisionNote = window.prompt(
      `Catatan revisi untuk ${quotation.quotationNo}`
    );

    if (!revisionNote) return;

    await runAction(`/api/quotations/${quotation.id}/revision`, "PATCH", {
      note: revisionNote,
    });
  }

  async function rejectQuotation(quotation: Quotation) {
    const reason = window.prompt(
      `Catatan penolakan untuk sales staff (${quotation.quotationNo}), minimal 8 karakter:`
    );
    if (!reason) return;
    await runAction(`/api/quotations/${quotation.id}/reject`, "PATCH", { reason });
  }

  function openLtrGrouping(quotation: Quotation) {
    const usedIds = new Set(
      (quotation.ltrs || []).flatMap((ltr) =>
        ltr.items.map((item) => item.quotationItemId)
      )
    );
    const availableIds = quotation.items
      .map((item) => item.id)
      .filter((itemId) => !usedIds.has(itemId));
    if (availableIds.length === 0) {
      setMessage("Semua titik uji quotation ini sudah masuk ke LTR.");
      return;
    }
    const nextSequence = (quotation.ltrs?.length || 0) + 1;
    setDocumentQuotation(quotation);
    setDocumentLabel(`Bagian ${nextSequence}`);
    setDocumentItemIds(availableIds);
  }

  async function createGroupedLtr() {
    if (!documentQuotation || documentItemIds.length === 0) return;
    const success = await runAction(
      `/api/quotations/${documentQuotation.id}/ltr`,
      "POST",
      { groupLabel: documentLabel, itemIds: documentItemIds }
    );
    if (success) setDocumentQuotation(null);
  }

  async function restoreQuotationRevision(
    quotation: Quotation,
    revision: NonNullable<Quotation["revisions"]>[number]
  ) {
    const reason = window.prompt(
      `Kembalikan ${quotation.quotationNo} ke revisi ${revision.revisionNo}. Jelaskan alasannya (minimal 8 karakter):`
    );
    if (!reason) return;
    await runAction(`/api/audit/revisions/${revision.id}/restore`, "POST", {
      reason,
    });
  }

  function renderActionButtons(quotation: Quotation) {
    if (mode === "request") {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          {(quotation.status === "REQUESTED" ||
            quotation.status === "NEGOTIATION") && (
            <>
              <button
                onClick={() => requestRevision(quotation)}
                className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-100"
              >
                Minta Revisi
              </button>

              <button
                onClick={() =>
                  runAction(`/api/quotations/${quotation.id}/confirm`, "PATCH")
                }
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
              >
                ACC Quotation
              </button>
            </>
          )}

          {quotation.status === "APPROVED" && (
            <button
              onClick={() => uploadPo(quotation)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              <Upload size={16} />
              Upload PO
            </button>
          )}
        </div>
      );
    }

    if (mode === "revise") {
      return (
        <button
          onClick={() => handleEdit(quotation)}
          className="inline-flex items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-100"
        >
          <Edit3 size={16} />
          Revisi & Kirim
        </button>
      );
    }

    if (mode === "verify") {
      return (
        <button
          onClick={() =>
            runAction(`/api/quotations/${quotation.id}/verify`, "PATCH")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <FileCheck size={16} />
          Verify
        </button>
      );
    }

    if (mode === "approve") {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => rejectQuotation(quotation)}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            <X size={16} />
            Tolak & Beri Catatan
          </button>
          <button
            onClick={() =>
              runAction(`/api/quotations/${quotation.id}/approve`, "PATCH")
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
          >
            <BadgeCheck size={16} />
            Approve
          </button>
        </div>
      );
    }

    if (mode === "ltr") {
      return (
        <button
          onClick={() => openLtrGrouping(quotation)}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <FileText size={16} />
          Buat Kelompok LTR
        </button>
      );
    }

    if (mode === "coc") {
      return (
        <button
          onClick={() =>
            runAction(`/api/quotations/${quotation.id}/coc`, "POST")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <ClipboardCheck size={16} />
          Create COC
        </button>
      );
    }

    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md">
      <motion.form
        onSubmit={submitQuotation}
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="flex h-[94dvh] w-full max-w-7xl flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 shadow-2xl sm:h-[92vh] sm:rounded-[2rem]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-emerald-600 sm:text-sm">
              Quotation Flow
            </p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-slate-900 sm:mt-1 sm:text-2xl">
              {isEditing ? "Revisi Quotation" : "Buat Quotation"}
            </h2>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              {isEditing
                ? "Ubah bagian yang perlu diperbaiki, lalu simpan revisinya."
                : `Langkah ${stepIndex + 1} dari ${WIZARD_STEPS.length} — ${WIZARD_STEPS[stepIndex].title}.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenForm(false)}
            aria-label="Tutup form quotation"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:rounded-2xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Indikator langkah. Saat membuat baru, langkah berikutnya terkunci
            sampai langkah sekarang lengkap; saat revisi semuanya terbuka. */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            {WIZARD_STEPS.map((step, index) => {
              const active = activeTab === step.key;
              const done = index < stepIndex && !getStepIssues(step.key, form).length;
              const unlocked = isStepUnlocked(index);

              return (
                <li key={step.key} className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    disabled={!unlocked}
                    aria-current={active ? "step" : undefined}
                    className={[
                      "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-bold transition-colors sm:justify-start sm:px-3 sm:text-sm",
                      active
                        ? "bg-emerald-500 text-white shadow-sm"
                        : unlocked
                          ? "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          : "border border-slate-100 bg-slate-50 text-slate-300",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                        active
                          ? "bg-white/25 text-white"
                          : done
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-500",
                      ].join(" ")}
                    >
                      {done ? <Check size={11} /> : index + 1}
                    </span>
                    <span className="truncate">{step.label}</span>
                    {!unlocked && <Lock size={11} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${((stepIndex + 1) / WIZARD_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {message && (
            <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </p>
          )}

          {activeTab === "detail" && (
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-3">
                  <SelectField
                    label="Customer"
                    value={form.customerId}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, customerId: value }))
                    }
                    options={customers.map((customer) => ({
                      value: customer.id,
                      label: `${customer.name}${customer.company ? ` - ${customer.company}` : ""}`,
                    }))}
                  />

                  <SelectField
                    label="Template COA"
                    value={form.coaTemplateId}
                    onChange={changeTemplate}
                    options={coaTemplates.map((template) => ({
                      value: template.id,
                      label: `${template.name} - ${template.code}`,
                    }))}
                  />

                  <DatePickerField
                    label="Quotation Date"
                    value={form.quotationDate}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, quotationDate: value }))
                    }
                  />

                  <DatePickerField
                    label="Valid Until"
                    value={form.validUntil}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, validUntil: value }))
                    }
                    min={form.quotationDate}
                  />

                  <SelectField
                    label="Sampling By"
                    value={form.samplingBy}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        samplingBy: value as QuotationForm["samplingBy"],
                      }))
                    }
                    options={[
                      { value: "MEDIALAB", label: "Medialab" },
                      { value: "CUSTOMER", label: "Customer" },
                      { value: "THIRD_PARTY", label: "Third Party" },
                    ]}
                  />

                  <SelectField
                    label="TAT Requested"
                    value={form.tatRequested}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        tatRequested: value as QuotationForm["tatRequested"],
                      }))
                    }
                    options={[
                      { value: "NORMAL", label: "Normal" },
                      { value: "URGENT", label: "Urgent" },
                      { value: "TOP_URGENT", label: "Top Urgent" },
                    ]}
                  />

                  <div className="lg:col-span-3">
                    <SelectField
                      label="Testing Objective"
                      value={form.testingObjective}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          testingObjective:
                            value as QuotationForm["testingObjective"],
                        }))
                      }
                      options={[
                        { value: "ROUTINE_MONITORING", label: "Routine Monitoring" },
                        { value: "SUPERVISION", label: "Supervision" },
                        { value: "CASE_PROOF", label: "Case Proof" },
                        { value: "RESEARCH", label: "Research" },
                        { value: "OTHER", label: "Other" },
                      ]}
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <TextAreaField
                      label="Note"
                      value={form.note}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, note: value }))
                      }
                      placeholder="Catatan quotation"
                    />
                  </div>

                  {form.id && (
                    <div className="lg:col-span-3">
                      <TextAreaField
                        label="Alasan perubahan (wajib, minimal 8 karakter)"
                        value={form.editReason}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, editReason: value }))
                        }
                        placeholder="Contoh: pengurangan dua titik uji sesuai konfirmasi customer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {selectedCustomer && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-black text-slate-900">
                      Customer Information
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedCustomer.company || selectedCustomer.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCustomer.contactPerson || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCustomer.email || "-"}
                    </p>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-black text-slate-900">
                      Sampling Location
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedCustomer.samplingCompany || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCustomer.samplingAddressLine1 || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCustomer.samplingAddressLine2 || ""}
                    </p>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-black text-slate-900">
                      Document Receiver
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedCustomer.documentCompany || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCustomer.recipientEmail1 || "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "items" && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Parameter & Pricing
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Parameter otomatis mengikuti template COA, tetapi detail
                    lokasi, matrix, durasi, dan method tetap bisa disesuaikan.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copySamplingAddressToAllItems}
                    className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                  >
                    <Copy size={16} />
                    Copy Lokasi Sampling
                  </button>

                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
                  >
                    <Plus size={16} />
                    Tambah Parameter
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="max-h-[56vh] overflow-auto">
                  <table className="w-full min-w-[1500px] text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="w-[95px] px-4 py-3">Qty</th>
                        <th className="w-[150px] px-4 py-3">Harga</th>
                        <th className="w-[160px] px-4 py-3">Subtotal</th>
                        <th className="w-[180px] px-4 py-3">Sample ID</th>
                        <th className="w-[260px] px-4 py-3">Lokasi Sampling</th>
                        <th className="w-[230px] px-4 py-3">Regulasi / Matrix</th>
                        <th className="w-[180px] px-4 py-3">Durasi</th>
                        <th className="w-[230px] px-4 py-3">Method</th>
                        <th className="w-[110px] px-4 py-3 text-center">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {form.items.map((item, index) => {
                        const parameter = parameterMap.get(item.parameterId);
                        const activePrice =
                          item.customPrice ?? parameter?.price ?? 0;
                        const canEditPrice = Boolean(form.id);

                        return (
                          <tr
                            key={`${item.parameterId}-${index}`}
                            className="border-t border-slate-200 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3">
                              <Select
                                value={item.parameterId}
                                onChange={(value) => changeParameter(index, value)}
                                options={selectedTemplateParameters.map(
                                  (templateParameter) => ({
                                    value: templateParameter.parameterId,
                                    label:
                                      templateParameter.displayName ||
                                      templateParameter.parameter.name,
                                  })
                                )}
                                ariaLabel={`Parameter baris ${index + 1}`}
                                buttonClassName="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 outline-none transition hover:border-blue-300"
                              />

                              <input
                                value={item.description}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "description",
                                    event.target.value
                                  )
                                }
                                placeholder="Description"
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "qty",
                                    Number(event.target.value || 1)
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                value={activePrice}
                                disabled={!canEditPrice}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "customPrice",
                                    Number(event.target.value || 0)
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900">
                                {formatRupiah(activePrice * item.qty)}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <input
                                value={item.customerSampleId}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "customerSampleId",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                                placeholder="Sample ID"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                value={item.samplingLocation}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "samplingLocation",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                                placeholder="Lokasi sampling"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                value={item.regulationMatrix}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "regulationMatrix",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                                placeholder="Regulasi / matrix"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                value={item.durationSampling}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "durationSampling",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                                placeholder="Contoh: 24 jam"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                value={item.method}
                                onChange={(event) =>
                                  updateItem(index, "method", event.target.value)
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                                placeholder="Method"
                              />
                            </td>

                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                disabled={form.items.length === 1}
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Sampling Cost"
                      value={form.samplingCost}
                      type="number"
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          samplingCost: Number(value || 0),
                        }))
                      }
                      icon={Wallet}
                    />

                    <Field
                      label="VAT Percent"
                      value={form.vatPercent}
                      type="number"
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          vatPercent: Number(value || 0),
                        }))
                      }
                      icon={Percent}
                    />

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Payment Term"
                        value={form.paymentTerm}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            paymentTerm: value,
                          }))
                        }
                        placeholder="Syarat pembayaran"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Terms Note"
                        value={form.termsNote}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            termsNote: value,
                          }))
                        }
                        placeholder="Syarat dan ketentuan"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-black text-slate-900">
                  Summary
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Parameter Total</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(totalFormAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Sampling Cost</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(Number(form.samplingCost || 0))}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      VAT {form.vatPercent}%
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(vatAmount)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between gap-4">
                      <span className="font-black text-slate-900">
                        Grand Total
                      </span>
                      <span className="text-xl font-black text-emerald-600">
                        {formatRupiah(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  Grand total ini akan disimpan ke quotation dan nanti dipakai
                  untuk invoice final.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          {/* Alasan kenapa langkah ini belum bisa dilanjutkan. */}
          {currentStepIssues.length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-4 text-amber-800 sm:text-xs">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{currentStepIssues[0]}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 sm:text-sm">
            <span className="min-w-0 truncate">
              Grand Total:{" "}
              <span className="font-black text-emerald-600">
                {formatRupiah(grandTotal)}
              </span>
            </span>
            <span className="hidden shrink-0 sm:inline">
              Total parameter:{" "}
              <span className="font-black text-slate-900">
                {formatRupiah(totalFormAmount)}
              </span>
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                stepIndex === 0 ? setOpenForm(false) : goToStep(stepIndex - 1)
              }
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:rounded-2xl sm:text-sm"
            >
              {stepIndex === 0 ? (
                "Batal"
              ) : (
                <>
                  <ArrowLeft size={15} />
                  Kembali
                </>
              )}
            </button>

            {/* Buat baru: Simpan hanya muncul di langkah terakhir.
                Revisi: Simpan selalu tersedia di langkah mana pun. */}
            {!isLastStep && (
              <motion.button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                disabled={currentStepIssues.length > 0}
                whileHover={reduce ? undefined : { scale: 1.01 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:text-sm"
              >
                Lanjut
                <ArrowRight size={15} />
              </motion.button>
            )}

            {(isLastStep || isEditing) && (
              <motion.button
                disabled={
                  loading ||
                  customers.length === 0 ||
                  parameters.length === 0 ||
                  coaTemplates.length === 0 ||
                  allStepIssues.length > 0
                }
                whileHover={reduce || loading ? undefined : { scale: 1.01 }}
                whileTap={reduce || loading ? undefined : { scale: 0.98 }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:text-sm"
              >
                <Save size={16} />
                {loading
                  ? "Menyimpan..."
                  : isEditing
                    ? "Kirim Revisi"
                    : "Simpan Quotation"}
              </motion.button>
            )}
          </div>
        </div>
      </motion.form>
    </div>
  );

  const ltrModal = documentQuotation ? (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) setDocumentQuotation(null);
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Buat kelompok LTR"
        initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-blue-100 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
              Pemisahan dokumen
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900">
              Buat LTR dari {documentQuotation.quotationNo}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Pilih rentang/titik uji yang menjadi bagian LTR ini. Titik yang
              sudah dipakai LTR lain otomatis dikunci.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDocumentQuotation(null)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Field
            label="Nama kelompok dokumen"
            value={documentLabel}
            onChange={setDocumentLabel}
            placeholder="Contoh: Area Produksi A"
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-700">
              {documentItemIds.length} titik dipilih
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const usedIds = new Set(
                    (documentQuotation.ltrs || []).flatMap((ltr) =>
                      ltr.items.map((item) => item.quotationItemId)
                    )
                  );
                  setDocumentItemIds(
                    documentQuotation.items
                      .map((item) => item.id)
                      .filter((itemId) => !usedIds.has(itemId))
                  );
                }}
                className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
              >
                Pilih semua tersisa
              </button>
              <button
                type="button"
                onClick={() => setDocumentItemIds([])}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {documentQuotation.items.map((item, index) => {
              const owner = (documentQuotation.ltrs || []).find((ltr) =>
                ltr.items.some((link) => link.quotationItemId === item.id)
              );
              const checked = documentItemIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex min-h-14 items-start gap-3 rounded-2xl border p-3 transition ${
                    owner
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                      : checked
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={Boolean(owner)}
                    onChange={(event) =>
                      setDocumentItemIds((current) =>
                        event.target.checked
                          ? [...current, item.id]
                          : current.filter((id) => id !== item.id)
                      )
                    }
                    className="mt-1 h-5 w-5 accent-blue-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-900">
                      #{index + 1} {item.description || item.parameter.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.customerSampleId || "Tanpa sample ID"} · {item.samplingLocation || "Lokasi belum diisi"}
                    </span>
                    {owner && (
                      <span className="mt-1 block text-xs font-bold text-amber-700">
                        Sudah masuk {owner.ltrNo} ({owner.groupLabel})
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 border-t border-blue-100 p-5">
          <button
            type="button"
            onClick={() => setDocumentQuotation(null)}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={createGroupedLtr}
            disabled={
              loading ||
              documentItemIds.length === 0 ||
              documentLabel.trim().length < 3
            }
            className="flex-[1.4] rounded-2xl bg-brand-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Membuat…" : "Buat LTR kelompok ini"}
          </button>
        </div>
      </motion.div>
    </div>
  ) : null;

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial={reduce ? false : "hidden"}
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        className="mb-0"
        eyebrow="Quotation Flow"
        title={headerCopy.title}
        subtitle={headerCopy.description}
        actions={
          <>
            {mode === "request" && (
              <motion.button
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                onClick={handleCreate}
                disabled={
                  customers.length === 0 ||
                  parameters.length === 0 ||
                  coaTemplates.length === 0
                }
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:rounded-2xl sm:text-sm"
              >
                <FilePlus size={16} />
                {isCustomerView ? "Ajukan Penawaran" : "Buat Quotation"}
              </motion.button>
            )}

            <button
              onClick={refreshData}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:rounded-2xl sm:text-sm"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </>
        }
      >
        <div className="relative max-w-md">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isCustomerView
                ? "Cari penawaran, jenis uji, nomor…"
                : "Cari quotation, customer, template..."
            }
            aria-label="Cari quotation"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 sm:rounded-2xl"
          />
        </div>

        {message && !openForm && (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600 sm:rounded-2xl sm:text-sm">
            {message}
          </p>
        )}
      </PageHeader>

      <motion.div variants={fadeUpItem} className="grid gap-3 sm:gap-4">
        {visibleQuotations.map((quotation) => {
          const currentStep = getStepIndex(quotation.status);
          const stpsNo = quotation.stps?.[0]?.stpsNo || "-";
          const doc = parseDocumentNumber(quotation.quotationNo);
          const statusMeta = quotationStatusMeta(quotation.status);
          const itemCount = quotation.items.length;

          return (
            <motion.div
              key={quotation.id}
              whileHover={reduce ? undefined : { y: -3 }}
              className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 sm:rounded-[2rem] sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Identitas. Customer mengenali pesanan dari jenis ujinya,
                      staf internal tetap dari nomor dokumen. */}
                  {isCustomerView ? (
                    <>
                      <h3 className="text-[15px] font-black leading-snug text-slate-900 sm:text-lg">
                        {humanOrderTitle(quotation.coaTemplate?.name)}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-400 sm:text-xs">
                        <span className="font-mono text-slate-500">
                          {doc.short}
                        </span>
                        {doc.revision !== null && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            Revisi {doc.revision}
                          </span>
                        )}
                        <span>{formatShortDate(quotation.quotationDate)}</span>
                      </div>
                      <div className="mt-2">
                        <StatusBadge
                          label={statusMeta.label}
                          tone={statusMeta.tone}
                        />
                        <p className="mt-1.5 text-[13px] leading-5 text-slate-500 sm:text-sm">
                          {statusMeta.description}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-slate-900 sm:text-lg">
                        {quotation.quotationNo}
                      </span>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          getStatusStyle(quotation.status),
                        ].join(" ")}
                      >
                        {quotation.status}
                      </span>
                    </div>
                  )}

                  {/* Ringkasan utama — dua kolom di mobile supaya tidak
                      memanjang ke bawah seperti daftar sebelumnya. */}
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] sm:text-sm xl:grid-cols-4">
                    {!isCustomerView && (
                      <div className="min-w-0">
                        <dt className="text-slate-400">Customer</dt>
                        <dd className="truncate font-semibold text-slate-900">
                          {quotation.customer?.name}
                        </dd>
                      </div>
                    )}

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomerView ? "Jenis uji" : "Template"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {quotation.coaTemplate?.name || "-"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">Berlaku sampai</dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {formatDate(quotation.validUntil)}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomerView ? "Pengambilan sample" : "Sampling By"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {samplingByLabel(quotation.samplingBy)}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomerView ? "Total biaya" : "Grand Total"}
                      </dt>
                      <dd className="truncate font-black text-emerald-600">
                        {formatRupiah(
                          quotation.grandTotal || quotation.totalAmount
                        )}
                      </dd>
                    </div>
                  </dl>

                  {quotation.note && (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-500 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                      Catatan: {quotation.note}
                    </p>
                  )}

                  {quotation.rejectionReason && (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-wide text-red-700">
                        Catatan penolakan manager
                      </p>
                      <p className="mt-1 text-sm font-semibold text-red-800">
                        {quotation.rejectionReason}
                      </p>
                    </div>
                  )}

                  {quotation.postApprovalEditReason && (
                    <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Alasan edit setelah approval: {quotation.postApprovalEditReason}
                    </p>
                  )}

                  {/* Parameter & riwayat status disembunyikan di balik
                      disclosure: keduanya panjang dan hanya dibutuhkan saat
                      customer benar-benar ingin memeriksa rinciannya. */}
                  <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                    <Disclosure
                      label={
                        isCustomerView ? "Parameter & harga" : "Parameter"
                      }
                      count={itemCount}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {quotation.items.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 sm:text-xs"
                          >
                            {item.description || item.parameter.name} ×{" "}
                            {item.qty} · {formatRupiah(item.price)}
                          </span>
                        ))}
                      </div>
                    </Disclosure>

                    <Disclosure
                      label={isCustomerView ? "Riwayat status" : "Alur status"}
                      count={`${currentStep + 1}/${flowSteps.length}`}
                    >
                      <ol className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        {flowSteps.map((step, index) => {
                          const done = index <= currentStep;
                          const stepLabel = isCustomerView
                            ? quotationStatusMeta(step).label
                            : step;

                          return (
                            <li
                              key={step}
                              className={[
                                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] sm:text-xs",
                                done
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-400",
                              ].join(" ")}
                            >
                              {done && <CheckCircle2 size={12} className="shrink-0" />}
                              <span className="truncate">{stepLabel}</span>
                            </li>
                          );
                        })}
                      </ol>

                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:text-xs md:grid-cols-4">
                        <div className="min-w-0">
                          <dt className="text-slate-400">
                            {isCustomerView ? "Kecepatan" : "TAT"}
                          </dt>
                          <dd className="truncate font-semibold">
                            {tatLabel(quotation.tatRequested)}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-slate-400">
                            {isCustomerView ? "Tujuan uji" : "Objective"}
                          </dt>
                          <dd className="truncate font-semibold">
                            {testingObjectiveLabel(quotation.testingObjective)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">PO</dt>
                          <dd className="truncate font-semibold">
                            {quotation.purchaseOrder?.poNumber || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">LTR</dt>
                          <dd className="font-semibold">
                            {quotation.ltrs?.length || (quotation.ltr ? 1 : 0)}{" "}
                            dokumen
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">COC</dt>
                          <dd className="font-semibold">
                            {quotation.cocs?.length || (quotation.coc ? 1 : 0)}{" "}
                            dokumen
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">STPS</dt>
                          <dd className="truncate font-semibold">{stpsNo}</dd>
                        </div>
                      </dl>

                      {isCustomerView && (
                        <DocumentCode
                          code={quotation.quotationNo}
                          label="Kode penawaran"
                          className="mt-3"
                        />
                      )}
                    </Disclosure>
                  </div>

                  <details className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:rounded-2xl">
                    <summary className="flex min-h-11 items-center justify-between gap-3 px-3 py-2.5 text-[13px] font-black text-slate-800 sm:px-4 sm:py-3 sm:text-sm">
                      {isCustomerView
                        ? "Rincian lengkap & histori"
                        : "Detail quotation, ruang lingkup & histori"}
                      <span className="shrink-0 text-[11px] font-semibold text-blue-600 sm:text-xs">
                        Buka
                      </span>
                    </summary>
                    <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <p><span className="text-slate-400">Dibuat oleh</span><br /><strong>{quotation.requestedBy?.name || "-"}</strong></p>
                        <p><span className="text-slate-400">Email akun</span><br /><strong>{quotation.requestedBy?.email || "-"}</strong></p>
                        <p><span className="text-slate-400">Payment term</span><br /><strong>{quotation.paymentTerm || "-"}</strong></p>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <thead><tr><th className="px-3 py-2">No.</th><th className="px-3 py-2">Titik/parameter</th><th className="px-3 py-2">Sample ID</th><th className="px-3 py-2">Lokasi</th><th className="px-3 py-2">Metode</th><th className="px-3 py-2">Qty</th></tr></thead>
                          <tbody>
                            {quotation.items.map((item, index) => (
                              <tr key={item.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-bold">{index + 1}</td>
                                <td className="px-3 py-2">{item.description || item.parameter.name}</td>
                                <td className="px-3 py-2">{item.customerSampleId || "-"}</td>
                                <td className="px-3 py-2">{item.samplingLocation || "-"}</td>
                                <td className="px-3 py-2">{item.method || item.parameter.method || "-"}</td>
                                <td className="px-3 py-2">{item.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {(quotation.revisions?.length || 0) > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Riwayat versi</p>
                          <div className="mt-2 grid gap-2">
                            {quotation.revisions?.map((revision, index) => (
                              <div key={revision.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-black text-slate-800">Rev {revision.revisionNo} · {revision.action}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{revision.changeSummary || "Perubahan quotation"} · {revision.actorNameSnapshot || "Sistem"} · {formatDate(revision.createdAt)}</p>
                                  {revision.reason && <p className="mt-1 text-xs text-amber-700">Alasan: {revision.reason}</p>}
                                </div>
                                {mode === "revise" && index > 0 && (quotation.ltrs?.length || 0) === 0 && (quotation.cocs?.length || 0) === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => restoreQuotationRevision(quotation, revision)}
                                    className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                                  >
                                    Kembali ke versi ini
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
  {renderActionButtons(quotation)}

  <ExportButtons
    compact
    pdfUrl={`/api/exports/quotation/${quotation.id}/pdf`}
    excelUrl={`/api/exports/quotation/${quotation.id}/excel`}
  />

  {(quotation.ltrs?.length ? quotation.ltrs : quotation.ltr ? [{ ...quotation.ltr, sequence: 1, groupLabel: "Dokumen utama", items: [] }] : []).map((ltr) => (
    <div key={ltr.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <p className="mb-2 text-right text-[11px] font-bold text-slate-500">
        LTR {ltr.sequence} · {ltr.groupLabel || "Tanpa label"}
      </p>
      <ExportButtons
        compact
        pdfUrl={`/api/exports/ltr/${ltr.id}/pdf`}
        excelUrl={`/api/exports/ltr/${ltr.id}/excel`}
      />
    </div>
  ))}
</div>
</div>
            </motion.div>
          );
        })}

        {visibleQuotations.length === 0 && (
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500 shadow-sm sm:rounded-[2rem] sm:p-10 sm:text-base">
            {headerCopy.empty}
          </div>
        )}
      </motion.div>

      {mounted && openForm ? createPortal(modal, document.body) : null}
      {mounted && documentQuotation ? createPortal(ltrModal, document.body) : null}
    </motion.div>
  );
}
