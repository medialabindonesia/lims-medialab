"use client";

import type { ElementType, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { fadeUpItem, staggerContainer, EASE_OUT } from "@/lib/motion";
import ExportButtons from "@/components/exports/ExportButtons";
import Select, { type SelectOption } from "@/components/ui/Select";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  FlaskConical,
  Mail,
  MapPin,
  Pencil,
  RefreshCcw,
  Save,
  Search,
  Send,
  Truck,
  UserRound,
  X,
} from "lucide-react";

type Mode = "coc" | "stps";

type Customer = {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  samplingCompany?: string | null;
  samplingAddressLine1?: string | null;
  samplingAddressLine2?: string | null;
  recipientEmail1?: string | null;
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
  parameter: {
    id: string;
    name: string;
    unit?: string | null;
    method?: string | null;
  };
};

type Quotation = {
  id: string;
  quotationNo: string;
  status: string;
  tatRequested?: string | null;
  customer: Customer;
  coaTemplate?: {
    id: string;
    name: string;
    code: string;
  } | null;
  items: QuotationItem[];
  ltr?: {
    id: string;
    ltrNo: string;
  } | null;
  ltrs?: Array<{
    id: string;
    ltrNo: string;
    sequence: number;
    groupLabel?: string | null;
    items?: Array<{ quotationItemId: string }>;
  }>;
  coc?: {
    id: string;
    cocNo: string;
    sequence?: number;
    groupLabel?: string | null;
    ltrId?: string | null;
    items?: Array<{ quotationItemId: string }>;
    customerEmailCoa?: string | null;
    customerCode?: string | null;
    samplerName?: string | null;
    samplingLocation?: string | null;
    tatRequested?: string | null;
    plannedSamplingStart?: string | null;
    plannedSamplingEnd?: string | null;
    estimatedCoaDate?: string | null;
    sampleConditionSamplingInfo?: string | null;
    sampleConditionMethod?: string | null;
    sampleConditionReceived?: string | null;
    abnormalCondition?: string | null;
    specialInstruction?: string | null;
    deliveryMethod?: string | null;
    sample?: {
      id: string;
      sampleNo: string;
      status: string;
    } | null;
  } | null;
  cocs?: Array<NonNullable<Quotation["coc"]>>;
  stps?: Array<{
    id: string;
    stpsNo: string;
    status: string;
    technicalManagerName?: string | null;
    technicalManagerPosition?: string | null;
    issuedDate?: string | null;
    sampler1Name?: string | null;
    sampler1Position?: string | null;
    sampler2Name?: string | null;
    sampler2Position?: string | null;
    sampler3Name?: string | null;
    sampler3Position?: string | null;
    sampler4Name?: string | null;
    sampler4Position?: string | null;
  }>;
  samples?: Array<{
    id: string;
    sampleNo: string;
    status: string;
  }>;
};

type CocItemForm = {
  id: string;
  customerSampleId: string;
  samplingLocation: string;
  regulationMatrix: string;
  durationSampling: string;
  method: string;
};

type CocForm = {
  cocId: string;
  ltrId: string;
  groupLabel: string;
  customerEmailCoa: string;
  customerCode: string;
  samplerName: string;
  samplingLocation: string;
  tatRequested: "NORMAL" | "URGENT" | "TOP_URGENT";
  plannedSamplingStart: string;
  plannedSamplingEnd: string;
  estimatedCoaDate: string;
  sampleConditionSamplingInfo: string;
  sampleConditionMethod: string;
  sampleConditionReceived: string;
  abnormalCondition: string;
  specialInstruction: string;
  deliveryMethod:
    | "MEDIALAB_SAMPLING"
    | "CUSTOMER_DELIVERY"
    | "COURIER"
    | "OTHER";
  items: CocItemForm[];
};

type StpsForm = {
  technicalManagerName: string;
  technicalManagerPosition: string;
  issuedDate: string;
  sampler1Name: string;
  sampler1Position: string;
  sampler2Name: string;
  sampler2Position: string;
  sampler3Name: string;
  sampler3Position: string;
  sampler4Name: string;
  sampler4Position: string;
};

type Props = {
  mode: Mode;
  initialQuotations: Quotation[];
};

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function toInputDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function safeReadJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
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
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ElementType;
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
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
        placeholder={placeholder}
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

export default function TechnicalDocumentClient({
  mode,
  initialQuotations,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [search, setSearch] = useState("");
  const [selectedQuotation, setSelectedQuotation] =
    useState<Quotation | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [cocForm, setCocForm] = useState<CocForm>({
    cocId: "",
    ltrId: "",
    groupLabel: "Bagian 1",
    customerEmailCoa: "",
    customerCode: "",
    samplerName: "",
    samplingLocation: "",
    tatRequested: "NORMAL",
    plannedSamplingStart: "",
    plannedSamplingEnd: "",
    estimatedCoaDate: "",
    sampleConditionSamplingInfo: "",
    sampleConditionMethod: "",
    sampleConditionReceived: "",
    abnormalCondition: "",
    specialInstruction: "",
    deliveryMethod: "MEDIALAB_SAMPLING",
    items: [],
  });

  const [stpsForm, setStpsForm] = useState<StpsForm>({
    technicalManagerName: "",
    technicalManagerPosition: "Technical Manager",
    issuedDate: getTodayInputDate(),
    sampler1Name: "",
    sampler1Position: "Sampler",
    sampler2Name: "",
    sampler2Position: "",
    sampler3Name: "",
    sampler3Position: "",
    sampler4Name: "",
    sampler4Position: "",
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

  const visibleQuotations = useMemo(() => {
    const keyword = search.toLowerCase();

    return quotations.filter((quotation) => {
      return (
        quotation.quotationNo.toLowerCase().includes(keyword) ||
        quotation.customer.name.toLowerCase().includes(keyword) ||
        (quotation.customer.company || "").toLowerCase().includes(keyword) ||
        (quotation.ltr?.ltrNo || "").toLowerCase().includes(keyword) ||
        (quotation.ltrs || []).some((ltr) =>
          ltr.ltrNo.toLowerCase().includes(keyword)
        ) ||
        (quotation.coc?.cocNo || "").toLowerCase().includes(keyword) ||
        (quotation.cocs || []).some((coc) =>
          coc.cocNo.toLowerCase().includes(keyword)
        ) ||
        (quotation.coc?.samplingLocation || "").toLowerCase().includes(keyword) ||
        (quotation.stps?.[0]?.stpsNo || "").toLowerCase().includes(keyword)
      );
    });
  }, [quotations, search]);

  async function refreshData() {
    const response = await fetch(
      mode === "coc" ? "/api/technical/coc" : "/api/technical/stps"
    );

    const data = await safeReadJson(response);

    if (response.ok) {
      setQuotations(data.quotations || []);
    } else {
      setMessage(data.message || "Gagal mengambil data terbaru");
    }
  }

  function openCocForm(
    quotation: Quotation,
    targetCoc?: NonNullable<Quotation["coc"]> | null
  ) {
    setSelectedQuotation(quotation);
    setMessage("");

    const fallbackSamplingLocation =
      targetCoc?.samplingLocation ||
      [
        quotation.customer.samplingAddressLine1,
        quotation.customer.samplingAddressLine2,
      ]
        .filter(Boolean)
        .join(", ") ||
      "";

    const usedByOtherCocs = new Set(
      (quotation.cocs || [])
        .filter((coc) => coc.id !== targetCoc?.id)
        .flatMap((coc) => coc.items?.map((item) => item.quotationItemId) || [])
    );
    const targetItemIds = new Set(
      targetCoc?.items?.map((item) => item.quotationItemId) || []
    );
    const selectedItems = quotation.items.filter((item) =>
      targetCoc ? targetItemIds.has(item.id) : !usedByOtherCocs.has(item.id)
    );
    if (selectedItems.length === 0) {
      setMessage("Semua titik uji quotation ini sudah masuk ke COC lain.");
      return;
    }

    setCocForm({
      cocId: targetCoc?.id || "",
      ltrId: targetCoc?.ltrId || "",
      groupLabel:
        targetCoc?.groupLabel || `Bagian ${(quotation.cocs?.length || 0) + 1}`,
      customerEmailCoa:
        targetCoc?.customerEmailCoa ||
        quotation.customer.recipientEmail1 ||
        quotation.customer.email ||
        "",
      customerCode: targetCoc?.customerCode || quotation.customer.id,
      samplerName: targetCoc?.samplerName || "",
      samplingLocation: fallbackSamplingLocation,
      tatRequested:
        (targetCoc?.tatRequested as CocForm["tatRequested"]) ||
        (quotation.tatRequested as CocForm["tatRequested"]) ||
        "NORMAL",
      plannedSamplingStart: toInputDateTime(
        targetCoc?.plannedSamplingStart
      ),
      plannedSamplingEnd: toInputDateTime(targetCoc?.plannedSamplingEnd),
      estimatedCoaDate: toInputDate(targetCoc?.estimatedCoaDate),
      sampleConditionSamplingInfo:
        targetCoc?.sampleConditionSamplingInfo ||
        "Sample diterima sesuai informasi sampling.",
      sampleConditionMethod:
        targetCoc?.sampleConditionMethod || "Sesuai metode pengujian.",
      sampleConditionReceived:
        targetCoc?.sampleConditionReceived || "Baik",
      abnormalCondition: targetCoc?.abnormalCondition || "",
      specialInstruction: targetCoc?.specialInstruction || "",
      deliveryMethod:
        (targetCoc?.deliveryMethod as CocForm["deliveryMethod"]) ||
        "MEDIALAB_SAMPLING",
      items: selectedItems.map((item) => ({
        id: item.id,
        customerSampleId: item.customerSampleId || "",
        samplingLocation: item.samplingLocation || fallbackSamplingLocation,
        regulationMatrix: item.regulationMatrix || "",
        durationSampling: item.durationSampling || "",
        method: item.method || item.parameter.method || "",
      })),
    });

    setOpenForm(true);
  }

  function openStpsForm(quotation: Quotation) {
    const stps = quotation.stps?.[0];

    setSelectedQuotation(quotation);
    setMessage("");

    setStpsForm({
      technicalManagerName: stps?.technicalManagerName || "",
      technicalManagerPosition:
        stps?.technicalManagerPosition || "Technical Manager",
      issuedDate: toInputDate(stps?.issuedDate) || getTodayInputDate(),
      sampler1Name: stps?.sampler1Name || quotation.coc?.samplerName || "",
      sampler1Position: stps?.sampler1Position || "Sampler",
      sampler2Name: stps?.sampler2Name || "",
      sampler2Position: stps?.sampler2Position || "",
      sampler3Name: stps?.sampler3Name || "",
      sampler3Position: stps?.sampler3Position || "",
      sampler4Name: stps?.sampler4Name || "",
      sampler4Position: stps?.sampler4Position || "",
    });

    setOpenForm(true);
  }

  function updateCocItem(
    itemId: string,
    key: keyof Omit<CocItemForm, "id">,
    value: string
  ) {
    setCocForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }));
  }

  function toggleCocItem(item: QuotationItem) {
    if (!selectedQuotation) return;
    const usedByOther = (selectedQuotation.cocs || []).some(
      (coc) =>
        coc.id !== cocForm.cocId &&
        coc.items?.some((link) => link.quotationItemId === item.id)
    );
    if (usedByOther) return;

    setCocForm((prev) => {
      const selected = prev.items.some((candidate) => candidate.id === item.id);
      return {
        ...prev,
        items: selected
          ? prev.items.filter((candidate) => candidate.id !== item.id)
          : [
              ...prev.items,
              {
                id: item.id,
                customerSampleId: item.customerSampleId || "",
                samplingLocation:
                  item.samplingLocation || prev.samplingLocation || "",
                regulationMatrix: item.regulationMatrix || "",
                durationSampling: item.durationSampling || "",
                method: item.method || item.parameter.method || "",
              },
            ],
      };
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuotation) return;

    setLoading(true);
    setMessage("");

    const endpoint =
      mode === "coc"
        ? `/api/technical/coc/${selectedQuotation.id}`
        : `/api/technical/stps/${selectedQuotation.id}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mode === "coc" ? cocForm : stpsForm),
    });

    const data = await safeReadJson(response);

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menyimpan data");
      return;
    }

    setMessage(data.message || "Data berhasil disimpan");
    setOpenForm(false);
    await refreshData();
  }

  const modal = selectedQuotation ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md">
      <motion.form
        onSubmit={submitForm}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Technical Document
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {mode === "coc" ? "Create / Edit COC" : "Create / Edit STPS"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedQuotation.quotationNo} ·{" "}
              {selectedQuotation.customer.company ||
                selectedQuotation.customer.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenForm(false)}
            className="rounded-2xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {message && (
            <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </p>
          )}

          {mode === "coc" ? (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-black text-slate-900">Customer Detail</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedQuotation.customer.company ||
                      selectedQuotation.customer.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedQuotation.customer.contactPerson || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedQuotation.customer.email || "-"}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-black text-slate-900">LTR</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedQuotation.ltr?.ltrNo || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Template: {selectedQuotation.coaTemplate?.name || "-"}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-black text-slate-900">Sample</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedQuotation.coc?.sample?.sampleNo ||
                      selectedQuotation.samples?.[0]?.sampleNo ||
                      "Akan dibuat otomatis saat COC disimpan"}
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-3">
                  <Field
                    label="Nama kelompok COC"
                    value={cocForm.groupLabel}
                    onChange={(value) =>
                      setCocForm((prev) => ({ ...prev, groupLabel: value }))
                    }
                    placeholder="Contoh: Area Produksi A"
                    icon={ClipboardCheck}
                  />

                  <SelectField
                    label="Referensi LTR (opsional)"
                    value={cocForm.ltrId}
                    onChange={(value) =>
                      setCocForm((prev) => ({ ...prev, ltrId: value }))
                    }
                    options={[
                      { value: "", label: "Tanpa LTR — COC langsung" },
                      ...(selectedQuotation.ltrs || []).map((ltr) => ({
                        value: ltr.id,
                        label: `${ltr.ltrNo} · ${ltr.groupLabel || `Bagian ${ltr.sequence}`}`,
                      })),
                    ]}
                  />

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                    <strong>Dokumen non-komersial</strong>
                    <p className="mt-1 text-xs">COC tidak menampilkan harga dan dapat dibuat tanpa LTR.</p>
                  </div>

                  <Field
                    label="Customer Email COA"
                    value={cocForm.customerEmailCoa}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        customerEmailCoa: value,
                      }))
                    }
                    placeholder="email coa"
                    type="email"
                    icon={Mail}
                  />

                  <Field
                    label="Customer Code"
                    value={cocForm.customerCode}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        customerCode: value,
                      }))
                    }
                    placeholder="Customer ID / Code"
                    icon={FileSignature}
                  />

                  <Field
                    label="Sampler Name"
                    value={cocForm.samplerName}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        samplerName: value,
                      }))
                    }
                    placeholder="Nama petugas sampling"
                    icon={UserRound}
                  />

                  <div className="lg:col-span-3">
                    <Field
                      label="Default Sampling Location"
                      value={cocForm.samplingLocation}
                      onChange={(value) =>
                        setCocForm((prev) => ({
                          ...prev,
                          samplingLocation: value,
                          items: prev.items.map((item) => ({
                            ...item,
                            samplingLocation:
                              item.samplingLocation || value,
                          })),
                        }))
                      }
                      placeholder="Lokasi default jika area sampling per parameter kosong"
                      icon={MapPin}
                    />
                  </div>

                  <SelectField
                    label="TAT Requested"
                    value={cocForm.tatRequested}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        tatRequested: value as CocForm["tatRequested"],
                      }))
                    }
                    options={[
                      { value: "NORMAL", label: "Normal" },
                      { value: "URGENT", label: "Urgent" },
                      { value: "TOP_URGENT", label: "Top Urgent" },
                    ]}
                  />

                  <DatePickerField
                    label="Planned Sampling Start"
                    value={cocForm.plannedSamplingStart}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        plannedSamplingStart: value,
                      }))
                    }
                    includeTime
                  />

                  <DatePickerField
                    label="Planned Sampling End"
                    value={cocForm.plannedSamplingEnd}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        plannedSamplingEnd: value,
                      }))
                    }
                    includeTime
                    min={cocForm.plannedSamplingStart}
                  />

                  <DatePickerField
                    label="Estimated COA Date"
                    value={cocForm.estimatedCoaDate}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        estimatedCoaDate: value,
                      }))
                    }
                    min={cocForm.plannedSamplingEnd || cocForm.plannedSamplingStart}
                  />

                  <SelectField
                    label="Delivery Method"
                    value={cocForm.deliveryMethod}
                    onChange={(value) =>
                      setCocForm((prev) => ({
                        ...prev,
                        deliveryMethod: value as CocForm["deliveryMethod"],
                      }))
                    }
                    options={[
                      { value: "MEDIALAB_SAMPLING", label: "Medialab Sampling" },
                      { value: "CUSTOMER_DELIVERY", label: "Customer Delivery" },
                      { value: "COURIER", label: "Courier" },
                      { value: "OTHER", label: "Other" },
                    ]}
                  />

                  <div className="lg:col-span-3">
                    <TextAreaField
                      label="Sample Condition - Sampling Info"
                      value={cocForm.sampleConditionSamplingInfo}
                      onChange={(value) =>
                        setCocForm((prev) => ({
                          ...prev,
                          sampleConditionSamplingInfo: value,
                        }))
                      }
                      placeholder="Informasi kondisi sample saat sampling"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <TextAreaField
                      label="Sample Condition - Method"
                      value={cocForm.sampleConditionMethod}
                      onChange={(value) =>
                        setCocForm((prev) => ({
                          ...prev,
                          sampleConditionMethod: value,
                        }))
                      }
                      placeholder="Metode/keterangan kondisi sample"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <TextAreaField
                      label="Sample Condition - Received"
                      value={cocForm.sampleConditionReceived}
                      onChange={(value) =>
                        setCocForm((prev) => ({
                          ...prev,
                          sampleConditionReceived: value,
                        }))
                      }
                      placeholder="Kondisi sample saat diterima"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <TextAreaField
                      label="Abnormal Condition"
                      value={cocForm.abnormalCondition}
                      onChange={(value) =>
                        setCocForm((prev) => ({
                          ...prev,
                          abnormalCondition: value,
                        }))
                      }
                      placeholder="Kondisi abnormal jika ada"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <TextAreaField
                      label="Special Instruction"
                      value={cocForm.specialInstruction}
                      onChange={(value) =>
                        setCocForm((prev) => ({
                          ...prev,
                          specialInstruction: value,
                        }))
                      }
                      placeholder="Instruksi khusus"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="font-black text-slate-900">
                    COC Parameter Matrix
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Isi area sampling per parameter sesuai format COC Excel.
                  </p>
                </div>

                <div className="overflow-auto">
                  <table className="w-full min-w-[1300px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="w-[76px] px-4 py-3">Pilih</th>
                        <th className="w-[56px] px-4 py-3">No</th>
                        <th className="px-4 py-3">No. Lab / Sample ID</th>
                        <th className="px-4 py-3">Area Sampling</th>
                        <th className="px-4 py-3">Regulasi / Matrix</th>
                        <th className="px-4 py-3">Parameter Uji</th>
                        <th className="px-4 py-3">Metode</th>
                        <th className="px-4 py-3">Durasi Sampling</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedQuotation.items.map((item, index) => {
                        const formItem = cocForm.items.find(
                          (formItem) => formItem.id === item.id
                        );
                        const usedByOther = (selectedQuotation.cocs || []).find(
                          (coc) =>
                            coc.id !== cocForm.cocId &&
                            coc.items?.some(
                              (link) => link.quotationItemId === item.id
                            )
                        );
                        const selected = Boolean(formItem);

                        return (
                          <tr
                            key={item.id}
                            className={`border-t border-slate-200 align-top ${
                              usedByOther
                                ? "bg-slate-100 opacity-60"
                                : selected
                                  ? "bg-blue-50/40"
                                  : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={Boolean(usedByOther)}
                                onChange={() => toggleCocItem(item)}
                                aria-label={`Pilih ${item.description || item.parameter.name}`}
                                className="h-5 w-5 accent-blue-600"
                              />
                              {usedByOther && (
                                <span className="mt-1 block text-[10px] font-bold text-amber-700">
                                  COC {usedByOther.sequence}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3">
                              <input
                                disabled={!selected}
                                value={formItem?.customerSampleId || ""}
                                onChange={(event) =>
                                  updateCocItem(
                                    item.id,
                                    "customerSampleId",
                                    event.target.value
                                  )
                                }
                                placeholder="No. Lab / Sample ID"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <textarea
                                disabled={!selected}
                                value={formItem?.samplingLocation || ""}
                                onChange={(event) =>
                                  updateCocItem(
                                    item.id,
                                    "samplingLocation",
                                    event.target.value
                                  )
                                }
                                placeholder="Area sampling parameter ini"
                                rows={2}
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                disabled={!selected}
                                value={formItem?.regulationMatrix || ""}
                                onChange={(event) =>
                                  updateCocItem(
                                    item.id,
                                    "regulationMatrix",
                                    event.target.value
                                  )
                                }
                                placeholder="Regulasi / Matrix"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {item.description || item.parameter.name}
                            </td>

                            <td className="px-4 py-3">
                              <input
                                disabled={!selected}
                                value={formItem?.method || ""}
                                onChange={(event) =>
                                  updateCocItem(
                                    item.id,
                                    "method",
                                    event.target.value
                                  )
                                }
                                placeholder="Metode"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                disabled={!selected}
                                value={formItem?.durationSampling || ""}
                                onChange={(event) =>
                                  updateCocItem(
                                    item.id,
                                    "durationSampling",
                                    event.target.value
                                  )
                                }
                                placeholder="Durasi"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-black text-slate-900">COC</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedQuotation.coc?.cocNo || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Sample:{" "}
                    {selectedQuotation.coc?.sample?.sampleNo ||
                      selectedQuotation.samples?.[0]?.sampleNo ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-black text-slate-900">Customer</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedQuotation.customer.company ||
                      selectedQuotation.customer.name}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-black text-slate-900">Existing STPS</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedQuotation.stps?.[0]?.stpsNo ||
                      "Belum ada STPS"}
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field
                    label="Technical Manager Name"
                    value={stpsForm.technicalManagerName}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        technicalManagerName: value,
                      }))
                    }
                    placeholder="Nama manager teknik"
                    icon={UserRound}
                  />

                  <Field
                    label="Technical Manager Position"
                    value={stpsForm.technicalManagerPosition}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        technicalManagerPosition: value,
                      }))
                    }
                    placeholder="Jabatan"
                    icon={FileSignature}
                  />

                  <DatePickerField
                    label="Issued Date"
                    value={stpsForm.issuedDate}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        issuedDate: value,
                      }))
                    }
                  />

                  <div />

                  <Field
                    label="Sampler 1 Name"
                    value={stpsForm.sampler1Name}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler1Name: value,
                      }))
                    }
                    placeholder="Nama petugas 1"
                    icon={UserRound}
                  />

                  <Field
                    label="Sampler 1 Position"
                    value={stpsForm.sampler1Position}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler1Position: value,
                      }))
                    }
                    placeholder="Jabatan petugas 1"
                  />

                  <Field
                    label="Sampler 2 Name"
                    value={stpsForm.sampler2Name}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler2Name: value,
                      }))
                    }
                    placeholder="Nama petugas 2"
                    icon={UserRound}
                  />

                  <Field
                    label="Sampler 2 Position"
                    value={stpsForm.sampler2Position}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler2Position: value,
                      }))
                    }
                    placeholder="Jabatan petugas 2"
                  />

                  <Field
                    label="Sampler 3 Name"
                    value={stpsForm.sampler3Name}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler3Name: value,
                      }))
                    }
                    placeholder="Nama petugas 3"
                    icon={UserRound}
                  />

                  <Field
                    label="Sampler 3 Position"
                    value={stpsForm.sampler3Position}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler3Position: value,
                      }))
                    }
                    placeholder="Jabatan petugas 3"
                  />

                  <Field
                    label="Sampler 4 Name"
                    value={stpsForm.sampler4Name}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler4Name: value,
                      }))
                    }
                    placeholder="Nama petugas 4"
                    icon={UserRound}
                  />

                  <Field
                    label="Sampler 4 Position"
                    value={stpsForm.sampler4Position}
                    onChange={(value) =>
                      setStpsForm((prev) => ({
                        ...prev,
                        sampler4Position: value,
                      }))
                    }
                    placeholder="Jabatan petugas 4"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="font-black text-slate-900">
                    COC Parameter Matrix
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Data parameter dari COC.
                  </p>
                </div>

                <div className="overflow-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">No</th>
                        <th className="px-4 py-3">No. Lab</th>
                        <th className="px-4 py-3">Area Sampling</th>
                        <th className="px-4 py-3">Regulasi / Matrix</th>
                        <th className="px-4 py-3">Parameter Uji</th>
                        <th className="px-4 py-3">Metode</th>
                        <th className="px-4 py-3">Durasi Sampling</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedQuotation.items.map((item, index) => (
                        <tr
                          key={item.id}
                          className="border-t border-slate-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 text-slate-600">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.customerSampleId || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.samplingLocation ||
                              selectedQuotation.coc?.samplingLocation ||
                              "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.regulationMatrix || "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {item.description || item.parameter.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.method || item.parameter.method || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.durationSampling || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            {mode === "coc"
              ? "Saat COC disimpan, sample dan parameter sample akan otomatis dibuat."
              : "STPS dibuat berdasarkan COC yang sudah terbit."}
          </p>

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
                (mode === "coc" &&
                  (cocForm.items.length === 0 ||
                    cocForm.groupLabel.trim().length < 3))
              }
              whileHover={loading ? undefined : { scale: 1.02 }}
              whileTap={loading ? undefined : { scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />
              {loading
                ? "Menyimpan..."
                : mode === "coc"
                  ? "Simpan COC"
                  : "Simpan STPS"}
            </motion.button>
          </div>
        </div>
      </motion.form>
    </div>
  ) : null;

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div
        variants={fadeUpItem}
        className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Technical Flow
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {mode === "coc" ? "Create COC" : "Create STPS"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {mode === "coc"
                ? "Pisahkan titik uji menjadi beberapa COC. COC dapat dibuat langsung setelah approval, tanpa harga dan tanpa LTR."
                : "Buat Surat Tugas Pengambilan Sampel berdasarkan COC yang sudah dibuat."}
            </p>
          </div>

          <button
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        <div className="relative mt-5 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari quotation, customer, LTR, COC, STPS..."
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
          const stps = quotation.stps?.[0];

          return (
            <motion.div
              key={quotation.id}
              whileHover={{ y: -3 }}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-slate-900">
                      {quotation.quotationNo}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {quotation.status}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                    <p className="flex items-center gap-2">
                      <UserRound size={15} />
                      {quotation.customer.company || quotation.customer.name}
                    </p>

                    <p className="flex items-center gap-2">
                      <FileSignature size={15} />
                      LTR: {quotation.ltrs?.length || (quotation.ltr ? 1 : 0)} dokumen
                    </p>

                    <p className="flex items-center gap-2">
                      <ClipboardCheck size={15} />
                      COC: {quotation.cocs?.length || (quotation.coc ? 1 : 0)} dokumen
                    </p>

                    <p className="flex items-center gap-2">
                      <FileSignature size={15} />
                      STPS: {stps?.stpsNo || "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <FlaskConical size={15} />
                      Sample:{" "}
                      {quotation.coc?.sample?.sampleNo ||
                        quotation.samples?.[0]?.sampleNo ||
                        "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <CalendarDays size={15} />
                      Sampling:{" "}
                      {formatDateTime(quotation.coc?.plannedSamplingStart)}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin size={15} />
                      {quotation.coc?.samplingLocation ||
                        quotation.items.find((item) => item.samplingLocation)
                          ?.samplingLocation ||
                        quotation.customer.samplingCompany ||
                        "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Truck size={15} />
                      Delivery: {quotation.coc?.deliveryMethod || "-"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quotation.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                      >
                        {item.description || item.parameter.name} ·{" "}
                        {item.customerSampleId || "-"} ·{" "}
                        {item.samplingLocation || "Area belum diisi"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {(quotation.ltrs?.length
                    ? quotation.ltrs
                    : quotation.ltr
                      ? [{ ...quotation.ltr, sequence: 1, groupLabel: "Dokumen utama" }]
                      : []
                  ).map((ltr) => (
                    <div key={ltr.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      <p className="mb-2 text-right text-[11px] font-bold text-slate-500">
                        LTR {ltr.sequence} · {ltr.groupLabel || "Tanpa label"}
                      </p>
                      <ExportButtons compact pdfUrl={`/api/exports/ltr/${ltr.id}/pdf`} excelUrl={`/api/exports/ltr/${ltr.id}/excel`} />
                    </div>
                  ))}

                  {mode === "coc" ? (
                    <>
                      <button
                        onClick={() => openCocForm(quotation, null)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
                      >
                        <Send size={16} />
                        Buat COC baru
                      </button>

                      {(quotation.cocs?.length
                        ? quotation.cocs
                        : quotation.coc
                          ? [quotation.coc]
                          : []
                      ).map((coc) => (
                        <div key={coc.id} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-slate-500">
                              COC {coc.sequence || 1} · {coc.groupLabel || "Dokumen utama"}
                            </p>
                            <button
                              type="button"
                              onClick={() => openCocForm(quotation, coc)}
                              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-blue-700"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </div>
                          <ExportButtons compact pdfUrl={`/api/exports/coc/${coc.id}/pdf`} excelUrl={`/api/exports/coc/${coc.id}/excel`} />
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openStpsForm(quotation)}
                        disabled={!quotation.coc}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {stps ? (
                          <Pencil size={16} />
                        ) : (
                          <FileSignature size={16} />
                        )}
                        {stps ? "Edit STPS" : "Create STPS"}
                      </button>

                      {stps && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                          <p className="mb-2 text-right text-[11px] font-bold text-slate-500">
                            STPS
                          </p>
                          <ExportButtons
                            compact
                            pdfUrl={`/api/exports/stps/${stps.id}/pdf`}
                            excelUrl={`/api/exports/stps/${stps.id}/excel`}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {visibleQuotations.length === 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Data belum tersedia.
          </div>
        )}
      </motion.div>

      {mounted && openForm ? createPortal(modal, document.body) : null}
    </motion.div>
  );
}
