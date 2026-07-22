"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { fadeUp } from "@/lib/motion";

type AdminItem = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  sort: number;
  isActive: boolean;
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort: number;
  isActive: boolean;
  items: AdminItem[];
};

type AdminCanned = {
  id: string;
  title: string;
  body: string;
  sort: number;
  isActive: boolean;
};

type CategoryForm = {
  name: string;
  description: string;
  icon: string;
  sort: number;
  isActive: boolean;
};

type ItemForm = {
  question: string;
  answer: string;
  sort: number;
  isActive: boolean;
};

type CannedForm = {
  title: string;
  body: string;
  sort: number;
  isActive: boolean;
};

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="mt-10 w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400";
const labelClass = "mb-1.5 block text-sm font-bold text-slate-700";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60";

export default function FaqAdminClient({
  initialCategories,
  initialCannedReplies,
}: {
  initialCategories: AdminCategory[];
  initialCannedReplies: AdminCanned[];
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"faq" | "canned">("faq");
  const [categories, setCategories] = useState(initialCategories);
  const [canned, setCanned] = useState(initialCannedReplies);
  const [expanded, setExpanded] = useState<string | null>(
    initialCategories[0]?.id ?? null
  );
  const [busy, setBusy] = useState(false);

  // Modal states
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    id?: string;
    form: CategoryForm;
  } | null>(null);
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    categoryId: string;
    id?: string;
    form: ItemForm;
  } | null>(null);
  const [cannedModal, setCannedModal] = useState<{
    open: boolean;
    id?: string;
    form: CannedForm;
  } | null>(null);

  async function refreshCategories() {
    const res = await fetch("/api/support/faq/categories", {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
  }

  async function refreshCanned() {
    const res = await fetch("/api/support/canned-replies", {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setCanned(data.replies ?? []);
    }
  }

  // ---- Category ----
  async function saveCategory() {
    if (!categoryModal) return;
    setBusy(true);
    try {
      const url = categoryModal.id
        ? `/api/support/faq/categories/${categoryModal.id}`
        : "/api/support/faq/categories";
      const res = await fetch(url, {
        method: categoryModal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryModal.form),
      });
      if (res.ok) {
        await refreshCategories();
        setCategoryModal(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Hapus kategori ini beserta seluruh FAQ di dalamnya?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/faq/categories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await refreshCategories();
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategoryActive(cat: AdminCategory) {
    await fetch(`/api/support/faq/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    await refreshCategories();
  }

  // ---- Item ----
  async function saveItem() {
    if (!itemModal) return;
    setBusy(true);
    try {
      const url = itemModal.id
        ? `/api/support/faq/items/${itemModal.id}`
        : "/api/support/faq/items";
      const res = await fetch(url, {
        method: itemModal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          itemModal.id
            ? itemModal.form
            : { ...itemModal.form, categoryId: itemModal.categoryId }
        ),
      });
      if (res.ok) {
        await refreshCategories();
        setItemModal(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Hapus FAQ ini?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/faq/items/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await refreshCategories();
    } finally {
      setBusy(false);
    }
  }

  // ---- Canned ----
  async function saveCanned() {
    if (!cannedModal) return;
    setBusy(true);
    try {
      const url = cannedModal.id
        ? `/api/support/canned-replies/${cannedModal.id}`
        : "/api/support/canned-replies";
      const res = await fetch(url, {
        method: cannedModal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cannedModal.form),
      });
      if (res.ok) {
        await refreshCanned();
        setCannedModal(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteCanned(id: string) {
    if (!confirm("Hapus balasan cepat ini?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/canned-replies/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await refreshCanned();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-screen">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-semibold text-emerald-600">Support</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          FAQ Management
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Kelola topik FAQ, pertanyaan, dan balasan cepat (canned replies) untuk
          tim Customer Service.
        </p>

        <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTab("faq")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${
              tab === "faq"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <HelpCircle size={15} /> FAQ
          </button>
          <button
            type="button"
            onClick={() => setTab("canned")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${
              tab === "canned"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <MessageSquareText size={15} /> Balasan Cepat
          </button>
        </div>
      </motion.div>

      {tab === "faq" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setCategoryModal({
                  open: true,
                  form: {
                    name: "",
                    description: "",
                    icon: "",
                    sort: categories.length,
                    isActive: true,
                  },
                })
              }
              className={primaryBtn}
            >
              <Plus size={16} /> Tambah Kategori
            </button>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => (prev === cat.id ? null : cat.id))
                  }
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform ${
                      expanded === cat.id ? "rotate-180" : ""
                    }`}
                  />
                  <div>
                    <p className="font-bold text-slate-800">
                      {cat.name}
                      {!cat.isActive && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          Nonaktif
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {cat.items.length} pertanyaan · sort {cat.sort}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  title={cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                  onClick={() => toggleCategoryActive(cat)}
                  className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100"
                >
                  {cat.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCategoryModal({
                      open: true,
                      id: cat.id,
                      form: {
                        name: cat.name,
                        description: cat.description ?? "",
                        icon: cat.icon ?? "",
                        sort: cat.sort,
                        isActive: cat.isActive,
                      },
                    })
                  }
                  className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id)}
                  className="rounded-lg p-2.5 text-red-400 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {expanded === cat.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">
                            {item.question}
                            {!item.isActive && (
                              <span className="ml-2 text-[10px] font-bold text-slate-400">
                                (nonaktif)
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {item.answer}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setItemModal({
                                open: true,
                                categoryId: cat.id,
                                id: item.id,
                                form: {
                                  question: item.question,
                                  answer: item.answer,
                                  sort: item.sort,
                                  isActive: item.isActive,
                                },
                              })
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setItemModal({
                        open: true,
                        categoryId: cat.id,
                        form: {
                          question: "",
                          answer: "",
                          sort: cat.items.length,
                          isActive: true,
                        },
                      })
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-bold text-slate-500 hover:bg-white"
                  >
                    <Plus size={15} /> Tambah FAQ
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setCannedModal({
                  open: true,
                  form: {
                    title: "",
                    body: "",
                    sort: canned.length,
                    isActive: true,
                  },
                })
              }
              className={primaryBtn}
            >
              <Plus size={16} /> Tambah Balasan
            </button>
          </div>

          {canned.map((reply) => (
            <div
              key={reply.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{reply.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                  {reply.body}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCannedModal({
                      open: true,
                      id: reply.id,
                      form: {
                        title: reply.title,
                        body: reply.body,
                        sort: reply.sort,
                        isActive: reply.isActive,
                      },
                    })
                  }
                  className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCanned(reply.id)}
                  className="rounded-lg p-2.5 text-red-400 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {canned.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              Belum ada balasan cepat.
            </p>
          )}
        </div>
      )}

      {/* Category modal */}
      {categoryModal?.open && (
        <Modal
          title={categoryModal.id ? "Edit Kategori" : "Tambah Kategori"}
          onClose={() => setCategoryModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nama</label>
              <input
                className={inputClass}
                value={categoryModal.form.name}
                onChange={(e) =>
                  setCategoryModal({
                    ...categoryModal,
                    form: { ...categoryModal.form, name: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Deskripsi</label>
              <input
                className={inputClass}
                value={categoryModal.form.description}
                onChange={(e) =>
                  setCategoryModal({
                    ...categoryModal,
                    form: {
                      ...categoryModal.form,
                      description: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Ikon (lucide)</label>
                <input
                  className={inputClass}
                  placeholder="FilePlus"
                  value={categoryModal.form.icon}
                  onChange={(e) =>
                    setCategoryModal({
                      ...categoryModal,
                      form: { ...categoryModal.form, icon: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Urutan</label>
                <input
                  type="number"
                  className={inputClass}
                  value={categoryModal.form.sort}
                  onChange={(e) =>
                    setCategoryModal({
                      ...categoryModal,
                      form: {
                        ...categoryModal.form,
                        sort: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={categoryModal.form.isActive}
                onChange={(e) =>
                  setCategoryModal({
                    ...categoryModal,
                    form: {
                      ...categoryModal.form,
                      isActive: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded accent-emerald-500"
              />
              Aktif
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={saveCategory}
              className={`${primaryBtn} w-full justify-center`}
            >
              Simpan
            </button>
          </div>
        </Modal>
      )}

      {/* Item modal */}
      {itemModal?.open && (
        <Modal
          title={itemModal.id ? "Edit FAQ" : "Tambah FAQ"}
          onClose={() => setItemModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Pertanyaan</label>
              <input
                className={inputClass}
                value={itemModal.form.question}
                onChange={(e) =>
                  setItemModal({
                    ...itemModal,
                    form: { ...itemModal.form, question: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Jawaban</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={5}
                value={itemModal.form.answer}
                onChange={(e) =>
                  setItemModal({
                    ...itemModal,
                    form: { ...itemModal.form, answer: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Urutan</label>
                <input
                  type="number"
                  className={inputClass}
                  value={itemModal.form.sort}
                  onChange={(e) =>
                    setItemModal({
                      ...itemModal,
                      form: { ...itemModal.form, sort: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 sm:mt-7">
                <input
                  type="checkbox"
                  checked={itemModal.form.isActive}
                  onChange={(e) =>
                    setItemModal({
                      ...itemModal,
                      form: { ...itemModal.form, isActive: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                Aktif
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={saveItem}
              className={`${primaryBtn} w-full justify-center`}
            >
              Simpan
            </button>
          </div>
        </Modal>
      )}

      {/* Canned modal */}
      {cannedModal?.open && (
        <Modal
          title={cannedModal.id ? "Edit Balasan" : "Tambah Balasan"}
          onClose={() => setCannedModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Judul</label>
              <input
                className={inputClass}
                value={cannedModal.form.title}
                onChange={(e) =>
                  setCannedModal({
                    ...cannedModal,
                    form: { ...cannedModal.form, title: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Isi</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={4}
                value={cannedModal.form.body}
                onChange={(e) =>
                  setCannedModal({
                    ...cannedModal,
                    form: { ...cannedModal.form, body: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Urutan</label>
              <input
                type="number"
                className={inputClass}
                value={cannedModal.form.sort}
                onChange={(e) =>
                  setCannedModal({
                    ...cannedModal,
                    form: { ...cannedModal.form, sort: Number(e.target.value) },
                  })
                }
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={saveCanned}
              className={`${primaryBtn} w-full justify-center`}
            >
              Simpan
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
