"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUpItem, staggerContainer, EASE_OUT } from "@/lib/motion";
import ExportButtons from "@/components/exports/ExportButtons";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  FileCheck,
  FilePenLine,
  FilePlus,
  FileText,
  FlaskConical,
  MapPin,
  PackageCheck,
  Percent,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  Upload,
  Wallet,
  X,
} from "lucide-react";

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
  coc?: {
    id: string;
    cocNo: string;
  } | null;
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

const flowSteps = [
  "REQUESTED",
  "REVISION",
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
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
      >
        {children}
      </select>
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
}: Props) {
  const reduce = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [openForm, setOpenForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("detail");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    if (!openForm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openForm]);

  const config = modeConfig[mode];

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
            ? quotations.filter((quotation) => quotation.status === "REVISION")
            : mode === "approve"
              ? quotations.filter((quotation) => quotation.status === "VERIFIED")
              : mode === "ltr"
                ? quotations.filter(
                    (quotation) => quotation.status === "PO_UPLOADED"
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
      return;
    }

    setMessage(data.message || "Action berhasil");
    await refreshData();
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
        <button
          onClick={() =>
            runAction(`/api/quotations/${quotation.id}/approve`, "PATCH")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <BadgeCheck size={16} />
          Approve
        </button>
      );
    }

    if (mode === "ltr") {
      return (
        <button
          onClick={() =>
            runAction(`/api/quotations/${quotation.id}/ltr`, "POST")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <FileText size={16} />
          Create LTR
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
        className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Quotation Flow
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {form.id ? "Revisi Quotation" : "Buat Quotation"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Format mengikuti dokumen quotation: customer, template COA,
              sampling detail, parameter, biaya, VAT, dan terms.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenForm(false)}
            className="rounded-2xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={22} />
          </button>
        </div>

        <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex min-w-max gap-2">
            {[
              { key: "detail", label: "Quotation Detail", icon: FilePlus },
              { key: "items", label: "Parameter & Pricing", icon: FlaskConical },
              { key: "terms", label: "Terms & Summary", icon: Wallet },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as ModalTab)}
                  className={[
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
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
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.company ? ` - ${customer.company}` : ""}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Template COA"
                    value={form.coaTemplateId}
                    onChange={changeTemplate}
                  >
                    {coaTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.code}
                      </option>
                    ))}
                  </SelectField>

                  <Field
                    label="Quotation Date"
                    value={form.quotationDate}
                    type="date"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, quotationDate: value }))
                    }
                    icon={CalendarDays}
                  />

                  <Field
                    label="Valid Until"
                    value={form.validUntil}
                    type="date"
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, validUntil: value }))
                    }
                    icon={CalendarDays}
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
                  >
                    <option value="MEDIALAB">Medialab</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="THIRD_PARTY">Third Party</option>
                  </SelectField>

                  <SelectField
                    label="TAT Requested"
                    value={form.tatRequested}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        tatRequested: value as QuotationForm["tatRequested"],
                      }))
                    }
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="TOP_URGENT">Top Urgent</option>
                  </SelectField>

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
                    >
                      <option value="ROUTINE_MONITORING">
                        Routine Monitoring
                      </option>
                      <option value="SUPERVISION">Supervision</option>
                      <option value="CASE_PROOF">Case Proof</option>
                      <option value="RESEARCH">Research</option>
                      <option value="OTHER">Other</option>
                    </SelectField>
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
                              <select
                                value={item.parameterId}
                                onChange={(event) =>
                                  changeParameter(index, event.target.value)
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
                              >
                                {selectedTemplateParameters.map(
                                  (templateParameter) => (
                                    <option
                                      key={templateParameter.parameterId}
                                      value={templateParameter.parameterId}
                                    >
                                      {templateParameter.displayName ||
                                        templateParameter.parameter.name}
                                    </option>
                                  )
                                )}
                              </select>

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

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            Total:{" "}
            <span className="font-black text-slate-900">
              {formatRupiah(totalFormAmount)}
            </span>{" "}
            · Grand Total:{" "}
            <span className="font-black text-emerald-600">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpenForm(false)}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Batal
            </button>

            <motion.button
              disabled={
                loading ||
                customers.length === 0 ||
                parameters.length === 0 ||
                coaTemplates.length === 0 ||
                form.items.length === 0
              }
              whileHover={reduce || loading ? undefined : { scale: 1.02 }}
              whileTap={reduce || loading ? undefined : { scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />
              {loading
                ? "Menyimpan..."
                : form.id
                  ? "Kirim Revisi"
                  : "Simpan Quotation"}
            </motion.button>
          </div>
        </div>
      </motion.form>
    </div>
  );

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial={reduce ? false : "hidden"}
      animate="visible"
      className="space-y-6"
    >
      <motion.div
        variants={fadeUpItem}
        className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {config.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {config.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FilePlus size={17} />
                Buat Quotation
              </motion.button>
            )}

            <button
              onClick={refreshData}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <RefreshCcw size={17} />
              Refresh
            </button>
          </div>
        </div>

        <div className="relative mt-5 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari quotation, customer, template..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-emerald-500"
          />
        </div>

        {message && !openForm && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </motion.div>

      <motion.div variants={fadeUpItem} className="grid gap-4">
        {visibleQuotations.map((quotation) => {
          const currentStep = getStepIndex(quotation.status);
          const stpsNo = quotation.stps?.[0]?.stpsNo || "-";

          return (
            <motion.div
              key={quotation.id}
              whileHover={reduce ? undefined : { y: -3 }}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-slate-900">
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

                  <div className="grid gap-3 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                    <p>
                      Customer:{" "}
                      <span className="font-semibold text-slate-900">
                        {quotation.customer?.name}
                      </span>
                    </p>
                    <p>Template: {quotation.coaTemplate?.name || "-"}</p>
                    <p>Date: {formatDate(quotation.quotationDate)}</p>
                    <p>Valid Until: {formatDate(quotation.validUntil)}</p>
                    <p>Sampling By: {samplingByLabel(quotation.samplingBy)}</p>
                    <p>TAT: {tatLabel(quotation.tatRequested)}</p>
                    <p>
                      Objective:{" "}
                      {testingObjectiveLabel(quotation.testingObjective)}
                    </p>
                    <p>
                      Grand Total:{" "}
                      <span className="font-black text-emerald-600">
                        {formatRupiah(
                          quotation.grandTotal || quotation.totalAmount
                        )}
                      </span>
                    </p>
                  </div>

                  {quotation.note && (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Note: {quotation.note}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quotation.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                      >
                        {item.description || item.parameter.name} x {item.qty} ·{" "}
                        {formatRupiah(item.price)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {flowSteps.map((step, index) => {
                      const done = index <= currentStep;

                      return (
                        <div
                          key={step}
                          className={[
                            "rounded-2xl border px-3 py-2 text-xs",
                            done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-400",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-1">
                            {done && <CheckCircle2 size={12} />}
                            <span>{step}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-4">
                    <p>PO: {quotation.purchaseOrder?.poNumber || "-"}</p>
                    <p>LTR: {quotation.ltr?.ltrNo || "-"}</p>
                    <p>COC: {quotation.coc?.cocNo || "-"}</p>
                    <p>STPS: {stpsNo}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
  {renderActionButtons(quotation)}

  <ExportButtons
    compact
    pdfUrl={`/api/exports/quotation/${quotation.id}/pdf`}
    excelUrl={`/api/exports/quotation/${quotation.id}/excel`}
  />

  {quotation.ltr && (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <p className="mb-2 text-right text-[11px] font-bold text-slate-500">
        LTR
      </p>
      <ExportButtons
        compact
        pdfUrl={`/api/exports/ltr/${quotation.ltr.id}/pdf`}
        excelUrl={`/api/exports/ltr/${quotation.ltr.id}/excel`}
      />
    </div>
  )}
</div>
</div>
            </motion.div>
          );
        })}

        {visibleQuotations.length === 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            {config.empty}
          </div>
        )}
      </motion.div>

      {mounted && openForm ? createPortal(modal, document.body) : null}
    </motion.div>
  );
}