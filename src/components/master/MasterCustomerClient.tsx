"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUpItem, staggerContainer, EASE_OUT } from "@/lib/motion";
import {
  Building2,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";

type CustomerUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type CustomerRow = {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;

  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  npwp?: string | null;
  npwpAddress?: string | null;

  billingCompany?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingContactPerson?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;

  samplingCompany?: string | null;
  samplingAddressLine1?: string | null;
  samplingAddressLine2?: string | null;
  samplingContactPerson?: string | null;
  samplingPhone?: string | null;

  documentCompany?: string | null;
  documentAddressLine1?: string | null;
  documentAddressLine2?: string | null;
  documentContactPerson?: string | null;
  documentPhone?: string | null;

  recipientEmail1?: string | null;
  recipientEmail2?: string | null;
  recipientEmail3?: string | null;
  recipientEmail4?: string | null;

  users?: CustomerUser[];

  createdAt?: string;
  updatedAt?: string;
};

type Props = {
  initialCustomers: CustomerRow[];
};

type CustomerForm = Omit<
  CustomerRow,
  "id" | "createdAt" | "updatedAt" | "users"
> & {
  id?: string;
  createLoginAccount: boolean;
  loginEmail: string;
  loginPassword: string;
  resetPassword: string;
};

type TabKey =
  | "basic"
  | "billing"
  | "sampling"
  | "document"
  | "recipient"
  | "account";

const emptyForm: CustomerForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  isActive: true,

  contactPerson: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  npwp: "",
  npwpAddress: "",

  billingCompany: "",
  billingAddressLine1: "",
  billingAddressLine2: "",
  billingContactPerson: "",
  billingEmail: "",
  billingPhone: "",

  samplingCompany: "",
  samplingAddressLine1: "",
  samplingAddressLine2: "",
  samplingContactPerson: "",
  samplingPhone: "",

  documentCompany: "",
  documentAddressLine1: "",
  documentAddressLine2: "",
  documentContactPerson: "",
  documentPhone: "",

  recipientEmail1: "",
  recipientEmail2: "",
  recipientEmail3: "",
  recipientEmail4: "",

  createLoginAccount: true,
  loginEmail: "",
  loginPassword: "",
  resetPassword: "",
};

const tabs: Array<{
  key: TabKey;
  label: string;
  icon: React.ElementType;
}> = [
  { key: "basic", label: "Customer Info", icon: Building2 },
  { key: "billing", label: "Billing", icon: FileText },
  { key: "sampling", label: "Sampling", icon: Truck },
  { key: "document", label: "Document", icon: Send },
  { key: "recipient", label: "Recipient Email", icon: Mail },
  { key: "account", label: "Login Account", icon: KeyRound },
];

function getCustomerLoginUser(customer: CustomerRow) {
  return (
    customer.users?.find((user) => user.role?.code === "CUSTOMER_ENGAGEMENT") ||
    customer.users?.[0] ||
    null
  );
}

function cleanForm(customer: CustomerRow): CustomerForm {
  const loginUser = getCustomerLoginUser(customer);

  return {
    id: customer.id,
    name: customer.name || "",
    company: customer.company || "",
    email: customer.email || "",
    phone: customer.phone || "",
    isActive: customer.isActive,

    contactPerson: customer.contactPerson || "",
    addressLine1: customer.addressLine1 || "",
    addressLine2: customer.addressLine2 || "",
    city: customer.city || "",
    province: customer.province || "",
    npwp: customer.npwp || "",
    npwpAddress: customer.npwpAddress || "",

    billingCompany: customer.billingCompany || "",
    billingAddressLine1: customer.billingAddressLine1 || "",
    billingAddressLine2: customer.billingAddressLine2 || "",
    billingContactPerson: customer.billingContactPerson || "",
    billingEmail: customer.billingEmail || "",
    billingPhone: customer.billingPhone || "",

    samplingCompany: customer.samplingCompany || "",
    samplingAddressLine1: customer.samplingAddressLine1 || "",
    samplingAddressLine2: customer.samplingAddressLine2 || "",
    samplingContactPerson: customer.samplingContactPerson || "",
    samplingPhone: customer.samplingPhone || "",

    documentCompany: customer.documentCompany || "",
    documentAddressLine1: customer.documentAddressLine1 || "",
    documentAddressLine2: customer.documentAddressLine2 || "",
    documentContactPerson: customer.documentContactPerson || "",
    documentPhone: customer.documentPhone || "",

    recipientEmail1: customer.recipientEmail1 || "",
    recipientEmail2: customer.recipientEmail2 || "",
    recipientEmail3: customer.recipientEmail3 || "",
    recipientEmail4: customer.recipientEmail4 || "",

    createLoginAccount: Boolean(loginUser),
    loginEmail: loginUser?.email || customer.email || "",
    loginPassword: "",
    resetPassword: "",
  };
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
  value: string | null | undefined;
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
          value={value || ""}
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

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
      />
    </div>
  );
}

export default function MasterCustomerClient({ initialCustomers }: Props) {
  const reduce = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!openForm) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [openForm]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.toLowerCase();

    return customers.filter((customer) => {
      const loginUser = getCustomerLoginUser(customer);

      return (
        customer.name.toLowerCase().includes(keyword) ||
        (customer.company || "").toLowerCase().includes(keyword) ||
        (customer.email || "").toLowerCase().includes(keyword) ||
        (customer.phone || "").toLowerCase().includes(keyword) ||
        (customer.contactPerson || "").toLowerCase().includes(keyword) ||
        (loginUser?.email || "").toLowerCase().includes(keyword)
      );
    });
  }, [customers, search]);

  const activeCustomers = customers.filter((item) => item.isActive).length;
  const inactiveCustomers = customers.length - activeCustomers;
  const customersWithAccount = customers.filter((item) =>
    Boolean(getCustomerLoginUser(item))
  ).length;

  function updateForm<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleCreate() {
    setForm(emptyForm);
    setActiveTab("basic");
    setMessage("");
    setOpenForm(true);
  }

  function handleEdit(customer: CustomerRow) {
    setForm(cleanForm(customer));
    setActiveTab("basic");
    setMessage("");
    setOpenForm(true);
  }

  async function refreshData() {
    const response = await fetch("/api/master/customers");
    const data = await response.json();

    if (response.ok) {
      setCustomers(data.customers);
    }
  }

  function copyMainToBilling() {
    setForm((prev) => ({
      ...prev,
      billingCompany: prev.company || prev.name,
      billingAddressLine1: prev.addressLine1,
      billingAddressLine2: prev.addressLine2,
      billingContactPerson: prev.contactPerson,
      billingEmail: prev.email,
      billingPhone: prev.phone,
    }));
  }

  function copyMainToSampling() {
    setForm((prev) => ({
      ...prev,
      samplingCompany: prev.company || prev.name,
      samplingAddressLine1: prev.addressLine1,
      samplingAddressLine2: prev.addressLine2,
      samplingContactPerson: prev.contactPerson,
      samplingPhone: prev.phone,
    }));
  }

  function copyMainToDocument() {
    setForm((prev) => ({
      ...prev,
      documentCompany: prev.company || prev.name,
      documentAddressLine1: prev.addressLine1,
      documentAddressLine2: prev.addressLine2,
      documentContactPerson: prev.contactPerson,
      documentPhone: prev.phone,
      recipientEmail1: prev.email || prev.recipientEmail1,
    }));
  }

  function syncEmailToLogin(value: string) {
    setForm((prev) => ({
      ...prev,
      email: value,
      loginEmail: prev.loginEmail || value,
      recipientEmail1: prev.recipientEmail1 || value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const url = form.id
      ? `/api/master/customers/${form.id}`
      : "/api/master/customers";

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
      setMessage(data.message || "Gagal menyimpan customer");
      return;
    }

    setMessage(data.message || "Customer berhasil disimpan");
    setOpenForm(false);
    await refreshData();
  }

  async function handleDeactivate(customer: CustomerRow) {
    const confirmDelete = window.confirm(
      `Nonaktifkan customer ${customer.name}? Akun login customer juga akan dinonaktifkan.`
    );

    if (!confirmDelete) return;

    const response = await fetch(`/api/master/customers/${customer.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Gagal menonaktifkan customer");
      return;
    }

    await refreshData();
  }

  function renderTabContent() {
    if (activeTab === "basic") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Nama Customer"
            value={form.name}
            onChange={(value) => updateForm("name", value)}
            placeholder="Contoh: Customer Medialab"
            icon={UserRound}
          />

          <Field
            label="Nama Perusahaan"
            value={form.company}
            onChange={(value) => updateForm("company", value)}
            placeholder="PT Customer Demo Indonesia"
            icon={Building2}
          />

          <Field
            label="Contact Person"
            value={form.contactPerson}
            onChange={(value) => updateForm("contactPerson", value)}
            placeholder="Nama PIC"
            icon={UserRound}
          />

          <Field
            label="Phone"
            value={form.phone}
            onChange={(value) => updateForm("phone", value)}
            placeholder="08123456789"
            icon={Phone}
          />

          <Field
            label="Email"
            value={form.email}
            onChange={syncEmailToLogin}
            placeholder="customer@email.com"
            type="email"
            icon={Mail}
          />

          <Field
            label="City"
            value={form.city}
            onChange={(value) => updateForm("city", value)}
            placeholder="Jakarta Selatan"
            icon={MapPin}
          />

          <Field
            label="Province"
            value={form.province}
            onChange={(value) => updateForm("province", value)}
            placeholder="DKI Jakarta"
            icon={MapPin}
          />

          <Field
            label="NPWP"
            value={form.npwp}
            onChange={(value) => updateForm("npwp", value)}
            placeholder="00.000.000.0-000.000"
            icon={FileText}
          />

          <div className="lg:col-span-2">
            <TextAreaField
              label="Address Line 1"
              value={form.addressLine1}
              onChange={(value) => updateForm("addressLine1", value)}
              placeholder="Alamat utama customer"
            />
          </div>

          <div className="lg:col-span-2">
            <TextAreaField
              label="Address Line 2"
              value={form.addressLine2}
              onChange={(value) => updateForm("addressLine2", value)}
              placeholder="Alamat tambahan"
            />
          </div>

          <div className="lg:col-span-2">
            <TextAreaField
              label="NPWP Address"
              value={form.npwpAddress}
              onChange={(value) => updateForm("npwpAddress", value)}
              placeholder="Alamat sesuai NPWP"
            />
          </div>
        </div>
      );
    }

    if (activeTab === "billing") {
      return (
        <div className="space-y-5">
          <div className="flex justify-end">
            <motion.button
              type="button"
              whileTap={reduce ? undefined : { scale: 0.98 }}
              onClick={copyMainToBilling}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Copy size={16} />
              Copy dari Customer Info
            </motion.button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Billing Company" value={form.billingCompany} onChange={(v) => updateForm("billingCompany", v)} placeholder="Nama perusahaan penagihan" icon={Building2} />
            <Field label="Billing Contact Person" value={form.billingContactPerson} onChange={(v) => updateForm("billingContactPerson", v)} placeholder="PIC penagihan" icon={UserRound} />
            <Field label="Billing Email" value={form.billingEmail} onChange={(v) => updateForm("billingEmail", v)} placeholder="billing@email.com" type="email" icon={Mail} />
            <Field label="Billing Phone" value={form.billingPhone} onChange={(v) => updateForm("billingPhone", v)} placeholder="Nomor telepon billing" icon={Phone} />

            <div className="lg:col-span-2">
              <TextAreaField label="Billing Address Line 1" value={form.billingAddressLine1} onChange={(v) => updateForm("billingAddressLine1", v)} placeholder="Alamat penagihan utama" />
            </div>

            <div className="lg:col-span-2">
              <TextAreaField label="Billing Address Line 2" value={form.billingAddressLine2} onChange={(v) => updateForm("billingAddressLine2", v)} placeholder="Alamat penagihan tambahan" />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "sampling") {
      return (
        <div className="space-y-5">
          <div className="flex justify-end">
            <motion.button
              type="button"
              whileTap={reduce ? undefined : { scale: 0.98 }}
              onClick={copyMainToSampling}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
            >
              <Copy size={16} />
              Copy dari Customer Info
            </motion.button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Sampling Company" value={form.samplingCompany} onChange={(v) => updateForm("samplingCompany", v)} placeholder="Nama perusahaan/lokasi sampling" icon={Building2} />
            <Field label="Sampling Contact Person" value={form.samplingContactPerson} onChange={(v) => updateForm("samplingContactPerson", v)} placeholder="PIC lokasi sampling" icon={UserRound} />
            <Field label="Sampling Phone" value={form.samplingPhone} onChange={(v) => updateForm("samplingPhone", v)} placeholder="Nomor telepon lokasi sampling" icon={Phone} />

            <div className="lg:col-span-2">
              <TextAreaField label="Sampling Address Line 1" value={form.samplingAddressLine1} onChange={(v) => updateForm("samplingAddressLine1", v)} placeholder="Alamat lokasi sampling utama" />
            </div>

            <div className="lg:col-span-2">
              <TextAreaField label="Sampling Address Line 2" value={form.samplingAddressLine2} onChange={(v) => updateForm("samplingAddressLine2", v)} placeholder="Alamat lokasi sampling tambahan" />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "document") {
      return (
        <div className="space-y-5">
          <div className="flex justify-end">
            <motion.button
              type="button"
              whileTap={reduce ? undefined : { scale: 0.98 }}
              onClick={copyMainToDocument}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Copy size={16} />
              Copy dari Customer Info
            </motion.button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Document Company" value={form.documentCompany} onChange={(v) => updateForm("documentCompany", v)} placeholder="Nama penerima dokumen" icon={Building2} />
            <Field label="Document Contact Person" value={form.documentContactPerson} onChange={(v) => updateForm("documentContactPerson", v)} placeholder="PIC penerima dokumen" icon={UserRound} />
            <Field label="Document Phone" value={form.documentPhone} onChange={(v) => updateForm("documentPhone", v)} placeholder="Nomor telepon penerima dokumen" icon={Phone} />

            <div className="lg:col-span-2">
              <TextAreaField label="Document Address Line 1" value={form.documentAddressLine1} onChange={(v) => updateForm("documentAddressLine1", v)} placeholder="Alamat pengiriman dokumen utama" />
            </div>

            <div className="lg:col-span-2">
              <TextAreaField label="Document Address Line 2" value={form.documentAddressLine2} onChange={(v) => updateForm("documentAddressLine2", v)} placeholder="Alamat pengiriman dokumen tambahan" />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "recipient") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Recipient Email 1" value={form.recipientEmail1} onChange={(v) => updateForm("recipientEmail1", v)} placeholder="coa.receiver1@email.com" type="email" icon={Mail} />
          <Field label="Recipient Email 2" value={form.recipientEmail2} onChange={(v) => updateForm("recipientEmail2", v)} placeholder="coa.receiver2@email.com" type="email" icon={Mail} />
          <Field label="Recipient Email 3" value={form.recipientEmail3} onChange={(v) => updateForm("recipientEmail3", v)} placeholder="coa.receiver3@email.com" type="email" icon={Mail} />
          <Field label="Recipient Email 4" value={form.recipientEmail4} onChange={(v) => updateForm("recipientEmail4", v)} placeholder="coa.receiver4@email.com" type="email" icon={Mail} />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500 p-3 text-white">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h3 className="font-black text-slate-900">
                Akun Login Customer
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Akun ini dipakai customer untuk login, membuat quotation,
                konfirmasi COA, dan melihat dokumen.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.createLoginAccount}
            onChange={(event) =>
              updateForm("createLoginAccount", event.target.checked)
            }
            className="h-4 w-4 accent-emerald-500"
          />
          {form.id
            ? "Hubungkan / aktifkan akun login customer"
            : "Buat akun login customer"}
        </label>

        {form.createLoginAccount && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="Email Login"
              value={form.loginEmail}
              onChange={(value) => updateForm("loginEmail", value)}
              placeholder="customer@email.com"
              type="email"
              icon={Mail}
            />

            {!form.id && (
              <Field
                label="Password Login"
                value={form.loginPassword}
                onChange={(value) => updateForm("loginPassword", value)}
                placeholder="Minimal 6 karakter"
                type="password"
                icon={LockKeyhole}
              />
            )}

            {form.id && (
              <Field
                label="Reset Password"
                value={form.resetPassword}
                onChange={(value) => updateForm("resetPassword", value)}
                placeholder="Kosongkan jika tidak diganti"
                type="password"
                icon={LockKeyhole}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  const modal = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md">
      <motion.form
        onSubmit={handleSubmit}
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Customer Master
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {form.id ? "Edit Customer" : "Tambah Customer"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Lengkapi data customer dari format Excel dan akun login customer.
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

        <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
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

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            {renderTabContent()}
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                updateForm("isActive", event.target.checked)
              }
              className="h-4 w-4 accent-emerald-500"
            />
            Customer aktif
          </label>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Customer login akan otomatis memakai role CUSTOMER_ENGAGEMENT.
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
              disabled={loading}
              whileHover={reduce || loading ? undefined : { scale: 1.02 }}
              whileTap={reduce || loading ? undefined : { scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />
              {loading ? "Menyimpan..." : "Simpan Customer"}
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
      <motion.div variants={fadeUpItem} className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
            <Building2 size={22} />
          </div>
          <p className="text-sm text-slate-500">Total Customer</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {customers.length}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-600">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-sm text-slate-500">Active Customer</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {activeCustomers}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-indigo-100 p-3 text-indigo-600">
            <KeyRound size={22} />
          </div>
          <p className="text-sm text-slate-500">Login Account</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {customersWithAccount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-slate-100 p-3 text-slate-600">
            <Power size={22} />
          </div>
          <p className="text-sm text-slate-500">Inactive Customer</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {inactiveCustomers}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUpItem}
        className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari customer, company, email, akun login..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <motion.button
              whileTap={reduce ? undefined : { scale: 0.98 }}
              onClick={refreshData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <RefreshCcw size={17} />
              Refresh
            </motion.button>

            <motion.button
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              onClick={handleCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              <Plus size={17} />
              Tambah Customer
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUpItem} className="grid gap-4">
        {filteredCustomers.map((customer) => {
          const loginUser = getCustomerLoginUser(customer);

          return (
            <motion.div
              key={customer.id}
              whileHover={reduce ? undefined : { y: -3 }}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      {customer.name}
                    </h3>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        customer.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {customer.isActive ? "Active" : "Inactive"}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        loginUser
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {loginUser ? "Login Ready" : "No Login"}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-600">
                    {customer.company || "-"}
                  </p>

                  <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-5">
                    <p className="flex items-center gap-2">
                      <UserRound size={15} />
                      {customer.contactPerson || "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Mail size={15} />
                      {customer.email || "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Phone size={15} />
                      {customer.phone || "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin size={15} />
                      {customer.city || "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <KeyRound size={15} />
                      {loginUser?.email || "-"}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-500 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-bold text-slate-700">Billing</p>
                      <p className="mt-1">{customer.billingCompany || "-"}</p>
                      <p>{customer.billingEmail || "-"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-bold text-slate-700">Sampling</p>
                      <p className="mt-1">{customer.samplingCompany || "-"}</p>
                      <p>{customer.samplingContactPerson || "-"}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-bold text-slate-700">Document</p>
                      <p className="mt-1">{customer.documentCompany || "-"}</p>
                      <p>{customer.recipientEmail1 || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeactivate(customer)}
                    disabled={!customer.isActive}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Power size={16} />
                    Nonaktifkan
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Customer belum ada.
          </div>
        )}
      </motion.div>

      {mounted && openForm ? createPortal(modal, document.body) : null}
    </motion.div>
  );
}