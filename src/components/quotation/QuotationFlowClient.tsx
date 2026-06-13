"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Edit3,
  FilePlus,
  RefreshCcw,
  Save,
  Upload,
  X,
} from "lucide-react";

type FlowMode = "request" | "verify" | "revise" | "approve" | "ltr" | "coc";

type CustomerOption = {
  id: string;
  name: string;
  company?: string | null;
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
  parameter: ParameterOption;
};

type Quotation = {
  id: string;
  quotationNo: string;
  status: string;
  note?: string | null;
  totalAmount: number;
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
};

type QuotationForm = {
  id?: string;
  customerId: string;
  coaTemplateId: string;
  note: string;
  items: FormItem[];
};

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
      "Customer membuat quotation, meminta revisi, ACC quotation, dan upload PO setelah quotation approved.",
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
      "Staff merevisi harga atau parameter berdasarkan permintaan revisi customer.",
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

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    REQUESTED: "bg-sky-100 text-sky-600",
    REVISION: "bg-amber-100 text-amber-600",
    NEGOTIATION: "bg-orange-100 text-orange-600",
    CONFIRMED: "bg-green-100 text-green-600",
    VERIFIED: "bg-sky-100 text-sky-600",
    APPROVED: "bg-emerald-100 text-emerald-600",
    PO_UPLOADED: "bg-purple-400/15 text-purple-300",
    LTR_CREATED: "bg-sky-100 text-sky-600",
    COC_CREATED: "bg-pink-400/15 text-pink-300",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

function getStepIndex(status: string) {
  const index = flowSteps.indexOf(status);
  return index === -1 ? 0 : index;
}

export default function QuotationFlowClient({
  mode,
  customers,
  parameters,
  coaTemplates,
  initialQuotations,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function buildItemsFromTemplate(templateId: string): FormItem[] {
    const template = coaTemplates.find((item) => item.id === templateId);
    const templateParameters = template?.parameters || [];

    if (templateParameters.length > 0) {
      return templateParameters.map((item) => ({
        parameterId: item.parameterId,
        qty: 1,
        customPrice: item.parameter.price,
      }));
    }

    return [
      {
        parameterId: parameters[0]?.id || "",
        qty: 1,
        customPrice: parameters[0]?.price || 0,
      },
    ];
  }

  const defaultTemplateId = coaTemplates[0]?.id || "";

  const [form, setForm] = useState<QuotationForm>({
    customerId: customers[0]?.id || "",
    coaTemplateId: defaultTemplateId,
    note: "",
    items: buildItemsFromTemplate(defaultTemplateId),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (openForm) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [openForm]);

  const config = modeConfig[mode];

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
    if (mode === "request") return quotations;

    if (mode === "verify") {
      return quotations.filter((quotation) => quotation.status === "CONFIRMED");
    }

    if (mode === "revise") {
      return quotations.filter((quotation) => quotation.status === "REVISION");
    }

    if (mode === "approve") {
      return quotations.filter((quotation) => quotation.status === "VERIFIED");
    }

    if (mode === "ltr") {
      return quotations.filter(
        (quotation) => quotation.status === "PO_UPLOADED"
      );
    }

    if (mode === "coc") {
      return quotations.filter(
        (quotation) => quotation.status === "LTR_CREATED"
      );
    }

    return quotations;
  }, [mode, quotations]);

  const totalFormAmount = useMemo(() => {
    return form.items.reduce((total, item) => {
      const parameter = parameterMap.get(item.parameterId);
      const price = item.customPrice ?? parameter?.price ?? 0;

      return total + price * item.qty;
    }, 0);
  }, [form.items, parameterMap]);

  function resetForm() {
    const templateId = coaTemplates[0]?.id || "";

    setForm({
      customerId: customers[0]?.id || "",
      coaTemplateId: templateId,
      note: "",
      items: buildItemsFromTemplate(templateId),
    });
  }

  function handleCreate() {
    resetForm();
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
      items: quotation.items.map((item) => ({
        parameterId: item.parameter.id,
        qty: item.qty,
        customPrice: item.price,
      })),
    });

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

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              parameterId,
              customPrice: parameter?.price || 0,
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
      body: JSON.stringify({
        customerId: form.customerId,
        coaTemplateId: form.coaTemplateId,
        note: form.note,
        items: form.items,
      }),
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
                className="rounded-xl border border-amber-300 px-3 py-2 text-xs text-amber-600 hover:bg-yellow-400/10"
              >
                Minta Revisi
              </button>

              <button
                onClick={() =>
                  runAction(`/api/quotations/${quotation.id}/confirm`, "PATCH")
                }
                className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                ACC Quotation
              </button>
            </>
          )}

          {quotation.status === "APPROVED" && (
            <button
              onClick={() => uploadPo(quotation)}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              <Upload size={13} />
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
          className="inline-flex items-center gap-1 rounded-xl border border-amber-300 px-3 py-2 text-xs text-amber-600 hover:bg-yellow-400/10"
        >
          <Edit3 size={13} />
          Revisi Harga & Kirim
        </button>
      );
    }

    if (mode === "verify") {
      return (
        <button
          onClick={() =>
            runAction(`/api/quotations/${quotation.id}/verify`, "PATCH")
          }
          className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
        >
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
          className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
        >
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
          className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
        >
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
          className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
        >
          Create COC
        </button>
      );
    }

    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <form
        onSubmit={submitQuotation}
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {form.id ? "Revisi Quotation" : "Buat Quotation"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {form.id
                ? "Ubah harga / parameter lalu kirim kembali ke customer sebagai quotation revisi."
                : "Pilih customer, template COA, dan parameter analisis."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenForm(false)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {message && (
            <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </p>
          )}

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Customer
                </label>

                <select
                  value={form.customerId}
                  onChange={(event) =>
                    setForm({ ...form, customerId: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company ? ` - ${customer.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Template COA
                </label>

                <select
                  value={form.coaTemplateId}
                  onChange={(event) => changeTemplate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                >
                  {coaTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Catatan
                </label>

                <input
                  value={form.note}
                  onChange={(event) =>
                    setForm({ ...form, note: event.target.value })
                  }
                  placeholder="Catatan quotation"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            <div className="max-h-[48vh] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 z-10 bg-white text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Parameter</th>
                    <th className="w-[95px] px-4 py-3">Qty</th>
                    <th className="w-[150px] px-4 py-3">Harga</th>
                    <th className="w-[165px] px-4 py-3">Subtotal</th>
                    <th className="w-[110px] px-4 py-3 text-center">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {form.items.map((item, index) => {
                    const parameter = parameterMap.get(item.parameterId);
                    const activePrice = item.customPrice ?? parameter?.price ?? 0;
                    const canEditPrice = Boolean(form.id);

                    return (
                      <tr
                        key={`${item.parameterId}-${index}`}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-3">
                          <select
                            value={item.parameterId}
                            onChange={(event) =>
                              changeParameter(index, event.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
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
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
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
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">
                            {formatRupiah(activePrice * item.qty)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={form.items.length === 1}
                            className="rounded-2xl border border-red-200 px-4 py-3 text-sm text-red-600 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
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

        <div className="flex shrink-0 flex-col gap-4 border-t border-slate-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={addItem}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Tambah Parameter
          </button>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <p className="text-sm text-slate-400">
              Total:{" "}
              <span className="text-lg font-bold text-slate-900">
                {formatRupiah(totalFormAmount)}
              </span>
            </p>

            <button
              disabled={
                loading ||
                customers.length === 0 ||
                parameters.length === 0 ||
                coaTemplates.length === 0 ||
                form.items.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />
              {loading
                ? "Menyimpan..."
                : form.id
                  ? "Kirim Revisi"
                  : "Simpan Quotation"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{config.title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {config.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {mode === "request" && (
              <button
                onClick={handleCreate}
                disabled={
                  customers.length === 0 ||
                  parameters.length === 0 ||
                  coaTemplates.length === 0
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FilePlus size={17} />
                Buat Quotation
              </button>
            )}

            <button
              onClick={refreshData}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <RefreshCcw size={17} />
              Refresh
            </button>
          </div>
        </div>

        {message && !openForm && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {visibleQuotations.map((quotation) => {
          const currentStep = getStepIndex(quotation.status);

          return (
            <div
              key={quotation.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:bg-slate-100"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {quotation.quotationNo}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        getStatusStyle(quotation.status),
                      ].join(" ")}
                    >
                      {quotation.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    Customer:{" "}
                    <span className="font-medium text-slate-900">
                      {quotation.customer?.name}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Template COA: {quotation.coaTemplate?.name || "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Total: {formatRupiah(quotation.totalAmount)}
                  </p>

                  {quotation.note && (
                    <p className="mt-2 text-sm text-slate-500">
                      Note: {quotation.note}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quotation.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                      >
                        {item.parameter.name} x {item.qty} ·{" "}
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
                              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                              : "border-slate-200 bg-slate-50 text-slate-500",
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

                  <div className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                    <p>PO: {quotation.purchaseOrder?.poNumber || "-"}</p>
                    <p>LTR: {quotation.ltr?.ltrNo || "-"}</p>
                    <p>COC: {quotation.coc?.cocNo || "-"}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  {renderActionButtons(quotation)}
                </div>
              </div>
            </div>
          );
        })}

        {visibleQuotations.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
            {config.empty}
          </div>
        )}
      </div>

      {mounted && openForm ? createPortal(modal, document.body) : null}
    </div>
  );
}