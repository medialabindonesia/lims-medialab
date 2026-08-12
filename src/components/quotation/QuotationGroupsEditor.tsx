"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/cn";

/**
 * Step 2 form quotation: penyusunan paket pekerjaan berbasis GRUP.
 *
 * Satu grup setara satu baris pada surat penawaran resmi Medialab — satu
 * matriks, satu regulasi, sejumlah titik sampling, dan sekumpulan parameter
 * uji. Sebelumnya satu baris = satu parameter, sehingga sales harus mengetik
 * ulang regulasi, lokasi, dan durasi sebanyak jumlah parameter.
 *
 * Alur: pilih matriks bertingkat -> pilih regulasi -> seluruh parameter muncul
 * dalam keadaan tercentang -> sales tinggal meng-untick yang tidak diperlukan.
 * Metode terisi otomatis mengikuti parameter, dan durasi hanya menawarkan
 * pilihan yang punya baku mutu untuk parameter tersebut.
 */

type MatrixNode = {
  id: string;
  code: string;
  name: string;
  note: string | null;
  regulations: Array<{
    id: string;
    code: string;
    name: string;
    shortName: string | null;
    note: string | null;
    parameterCount: number;
  }>;
  children: MatrixNode[];
};

function regulationLabelInTree(
  nodes: MatrixNode[],
  regulationId: string
): string {
  for (const node of nodes) {
    const regulation = node.regulations.find((item) => item.id === regulationId);
    if (regulation) return regulation.shortName || regulation.name;
    const nested = regulationLabelInTree(node.children, regulationId);
    if (nested) return nested;
  }
  return "Regulasi";
}

type DurationOption = {
  id: string;
  code: string;
  label: string;
  limitValue: string | null;
  isDefault: boolean;
};

export type GroupParamDraft = {
  regulationParameterId: string | null;
  regulationId: string;
  regulationLabel: string;
  parameterId: string;
  name: string;
  unit: string | null;
  method: string | null;
  limitValue: string | null;
  basePrice: number | null;
  isAccredited: boolean;
  durations: DurationOption[];
  selected: boolean;
  durationId: string;
  /** Kosong berarti harga belum ditetapkan — berbeda dari "0". */
  price: string;
};

/**
 * Pilihan tersimpan yang menunggu daftar parameter selesai dimuat.
 *
 * Saat quotation lama dibuka untuk direvisi, yang tersimpan hanyalah parameter
 * yang dulu dicentang — daftar lengkap regulasinya tidak ikut. Daftar penuh
 * dimuat ulang dari master, lalu pilihan lama ditempelkan di atasnya.
 */
type PendingSelection = {
  parameterKeys: string[];
  knownRegulationIds: string[];
  prices: Record<string, string>;
  durationIds: Record<string, string>;
};

export type GroupDraft = {
  key: string;
  description: string;
  /** Id matriks per tingkat cascade, dari akar ke daun. */
  matrixPath: string[];
  regulationId: string;
  regulationIds: string[];
  regulationLabel: string;
  locations: Array<{ key: string; label: string; customerSampleId: string }>;
  qty: string;
  /** Harga satu paket, bukan harga masing-masing parameter. */
  unitPrice: string;
  note: string;
  params: GroupParamDraft[];
  loadingParams: boolean;
  paramsError: string | null;
  /**
   * Regulasi yang daftar parameternya sudah pernah dimuat. Menjaga agar
   * regulasi tanpa parameter tidak dimuat berulang tanpa henti.
   */
  paramsLoadedFor: string | null;
  pendingSelection?: PendingSelection | null;
};

/**
 * Perubahan dikirim sebagai fungsi, bukan array jadi, agar hasil pemuatan
 * parameter yang asinkron tidak menimpa editan yang terjadi selama menunggu.
 */
type GroupsUpdater = (groups: GroupDraft[]) => GroupDraft[];

type Props = {
  groups: GroupDraft[];
  onChange: (updater: GroupsUpdater) => void;
  disabled?: boolean;
};

let matrixTreeCache: MatrixNode[] | null = null;

function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

export function createEmptyGroup(): GroupDraft {
  return {
    key: newKey(),
    description: "",
    matrixPath: [],
    regulationId: "",
    regulationIds: [],
    regulationLabel: "",
    locations: [{ key: newKey(), label: "", customerSampleId: "" }],
    qty: "1",
    unitPrice: "",
    note: "",
    params: [],
    loadingParams: false,
    paramsError: null,
    paramsLoadedFor: null,
  };
}

/** "1500000" -> "1.500.000". String kosong tetap kosong (belum ditetapkan). */
function formatPriceInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parsePriceInput(formatted: string): number | null {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

/** Total satu grup. null bila harga paket belum ditetapkan. */
export function groupSubtotal(group: GroupDraft): number | null {
  const selected = group.params.filter((param) => param.selected);
  if (selected.length === 0) return 0;

  const qty = Number(group.qty) || 1;
  const unitPrice = parsePriceInput(group.unitPrice);
  return unitPrice === null ? null : unitPrice * qty;
}

export function groupsTotal(groups: GroupDraft[]) {
  let total = 0;
  let hasUnpriced = false;

  for (const group of groups) {
    const subtotal = groupSubtotal(group);
    if (subtotal === null) {
      hasUnpriced = true;
      continue;
    }
    total += subtotal;
  }

  return { total, hasUnpriced };
}

export function countUnpricedParams(groups: GroupDraft[]) {
  return groups.filter(
    (group) =>
      group.params.some((param) => param.selected) &&
      parsePriceInput(group.unitPrice) === null
  ).length;
}

/** Bentuk payload yang dikirim ke POST/PATCH /api/quotations. */
export function toApiGroups(groups: GroupDraft[]) {
  return groups.map((group) => ({
    description: group.description || null,
    matrixId: group.matrixPath[group.matrixPath.length - 1] || null,
    regulationId: group.regulationId || null,
    regulationIds: group.regulationIds,
    qty: Number(group.qty) || 1,
    unitPrice: parsePriceInput(group.unitPrice),
    note: group.note || null,
    locations: group.locations
      .filter((location) => location.label.trim())
      .map((location) => ({
        label: location.label.trim(),
        customerSampleId: location.customerSampleId.trim() || null,
      })),
    items: group.params
      .filter((param) => param.selected)
      .map((param) => ({
        regulationParameterId: param.regulationParameterId,
        parameterId: param.parameterId,
        durationId: param.durationId || null,
        // Harga komersial disimpan sekali pada grup. Harga dasar parameter
        // tetap di-resolve server sebagai snapshot teknis, bukan dijumlahkan.
        method: param.method,
      })),
  }));
}

/** Bentuk grup sebagaimana dikembalikan GET /api/quotations. */
export type SavedQuotationGroup = {
  id: string;
  description: string | null;
  matrixId: string | null;
  regulationId: string | null;
  unitPrice: number | null;
  qty: number;
  note: string | null;
  regulation?: { name: string; shortName: string | null } | null;
  regulationLinks?: Array<{
    regulationId: string;
    regulation: { name: string; shortName: string | null };
  }>;
  locations?: Array<{ label: string; customerSampleId: string | null }>;
  items?: Array<{
    parameterId: string;
    regulationParameterId?: string | null;
    durationId: string | null;
    price: number | null;
  }>;
};

/**
 * Menyusun draft editor dari quotation tersimpan.
 *
 * Hanya parameter yang dulu dicentang yang tersimpan, jadi daftar penuh
 * regulasinya dimuat ulang oleh editor dan pilihan lama ditempelkan lewat
 * `pendingSelection`.
 */
export function buildGroupsFromQuotation(
  savedGroups: SavedQuotationGroup[]
): GroupDraft[] {
  return savedGroups.map((group) => {
    const prices: Record<string, string> = {};
    const durationIds: Record<string, string> = {};
    const parameterKeys: string[] = [];

    for (const item of group.items ?? []) {
      const parameterKey = item.regulationParameterId || item.parameterId;
      parameterKeys.push(parameterKey);
      prices[parameterKey] =
        item.price === null ? "" : formatPriceInput(String(item.price));
      if (item.durationId) durationIds[parameterKey] = item.durationId;
    }

    const locations = (group.locations ?? []).map((location) => ({
      key: newKey(),
      label: location.label,
      customerSampleId: location.customerSampleId ?? "",
    }));

    const regulationIds = group.regulationLinks?.length
      ? group.regulationLinks.map((link) => link.regulationId)
      : group.regulationId
        ? [group.regulationId]
        : [];
    const regulationLabel = group.regulationLinks?.length
      ? group.regulationLinks
          .map(
            (link) => link.regulation.shortName || link.regulation.name
          )
          .join("; ")
      : group.regulation?.shortName || group.regulation?.name || "";

    return {
      key: newKey(),
      description: group.description ?? "",
      // Cascade diisi seadanya dari matriks daun; dropdown tingkat atas akan
      // tampil kosong sampai sales menyentuhnya, tanpa mengubah data tersimpan.
      matrixPath: group.matrixId ? [group.matrixId] : [],
      regulationId: group.regulationId ?? "",
      regulationIds,
      regulationLabel,
      locations: locations.length
        ? locations
        : [{ key: newKey(), label: "", customerSampleId: "" }],
      qty: String(group.qty || 1),
      unitPrice:
        group.unitPrice === null
          ? ""
          : formatPriceInput(String(group.unitPrice)),
      note: group.note ?? "",
      params: [],
      loadingParams: false,
      paramsError: null,
      paramsLoadedFor: null,
      pendingSelection: {
        parameterKeys,
        knownRegulationIds: regulationIds,
        prices,
        durationIds,
      },
    };
  });
}

export function validateGroups(groups: GroupDraft[]): string[] {
  const issues: string[] = [];

  if (groups.length === 0) {
    issues.push("Tambahkan minimal 1 grup pekerjaan.");
    return issues;
  }

  groups.forEach((group, index) => {
    const label = group.description || `Grup ${index + 1}`;

    if (group.regulationIds.length === 0) {
      issues.push(`${label}: minimal satu regulasi belum dipilih.`);
    }

    if (!group.params.some((param) => param.selected)) {
      issues.push(`${label}: belum ada parameter yang dipilih.`);
    }

    if (!group.locations.some((location) => location.label.trim())) {
      issues.push(`${label}: minimal isi 1 titik sampling.`);
    }
  });

  return issues;
}

export default function QuotationGroupsEditor({
  groups,
  onChange,
  disabled,
}: Props) {
  const [tree, setTree] = useState<MatrixNode[]>(matrixTreeCache ?? []);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [loadingTree, setLoadingTree] = useState(!matrixTreeCache);
  const [expandedKey, setExpandedKey] = useState<string | null>(
    groups[0]?.key ?? null
  );

  useEffect(() => {
    if (matrixTreeCache) return;

    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/master/matrices");
        if (!response.ok) throw new Error("Gagal memuat daftar matriks.");

        const data = await response.json();
        matrixTreeCache = data.matrices ?? [];

        if (!active) return;
        setTree(matrixTreeCache ?? []);
      } catch (error) {
        if (!active) return;
        setTreeError((error as Error).message);
      } finally {
        if (active) setLoadingTree(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const patchGroupWith = useCallback(
    (key: string, transform: (group: GroupDraft) => GroupDraft) => {
      onChange((current) =>
        current.map((group) => (group.key === key ? transform(group) : group))
      );
    },
    [onChange]
  );

  const patchGroup = useCallback(
    (key: string, patch: Partial<GroupDraft>) => {
      patchGroupWith(key, (group) => ({ ...group, ...patch }));
    },
    [patchGroupWith]
  );

  const patchParam = useCallback(
    (
      groupKey: string,
      parameterKey: string,
      patch: Partial<GroupParamDraft>
    ) => {
      patchGroupWith(groupKey, (group) => ({
        ...group,
        params: group.params.map((param) =>
          (param.regulationParameterId ?? param.parameterId) === parameterKey
            ? { ...param, ...patch }
            : param
        ),
      }));
    },
    [patchGroupWith]
  );

  const loadParameters = useCallback(
    async (
      key: string,
      regulationIds: string[],
      /** Saat memuat ulang untuk revisi, pilihan lama dipertahankan. */
      keepPending = false
    ) => {
      const loadedKey = [...regulationIds].sort().join(",");
      patchGroupWith(key, (group) => ({
        ...group,
        loadingParams: true,
        paramsError: null,
        params: [],
        pendingSelection: keepPending ? group.pendingSelection : null,
      }));

      try {
        const payloads = await Promise.all(
          regulationIds.map(async (regulationId) => {
            const response = await fetch(
              `/api/master/regulations/${regulationId}/parameters`
            );
            if (!response.ok) {
              throw new Error("Gagal memuat parameter regulasi.");
            }
            return {
              regulationId,
              regulationLabel: regulationLabelInTree(tree, regulationId),
              data: await response.json(),
            };
          })
        );

        const params: GroupParamDraft[] = payloads.flatMap(
          ({ regulationId, regulationLabel, data }) =>
            (data.parameters ?? []).map((row: {
            regulationParameterId: string;
            parameterId: string;
            name: string;
            unit: string | null;
            method: string | null;
            limitValue: string | null;
            basePrice: number | null;
            isAccredited: boolean;
            defaultSelected: boolean;
            durations: DurationOption[];
          }) => {
            const defaultDuration =
              row.durations.find((duration) => duration.isDefault) ??
              row.durations[0];

            return {
              regulationParameterId: row.regulationParameterId,
              regulationId,
              regulationLabel,
              parameterId: row.parameterId,
              name: row.name,
              unit: row.unit,
              method: row.method,
              limitValue: row.limitValue,
              basePrice: row.basePrice,
              isAccredited: row.isAccredited,
              durations: row.durations,
              // Mulai tercentang semua; sales tinggal meng-untick.
              selected: row.defaultSelected,
              durationId: defaultDuration?.id ?? "",
              // Harga dasar jadi titik awal, tetap bebas diubah. Kosong bila
              // master belum punya harga.
              price:
                row.basePrice === null
                  ? ""
                  : formatPriceInput(String(row.basePrice)),
            };
          })
        );

        patchGroupWith(key, (group) => {
          const pending = group.pendingSelection;

          if (!pending) {
            return {
              ...group,
              params,
              loadingParams: false,
              paramsLoadedFor: loadedKey,
            };
          }

          const chosen = new Set(pending.parameterKeys);

          return {
            ...group,
            loadingParams: false,
            paramsLoadedFor: loadedKey,
            pendingSelection: null,
            params: params.map((param) => {
              const parameterKey =
                param.regulationParameterId ?? param.parameterId;
              if (!pending.knownRegulationIds.includes(param.regulationId)) {
                return param;
              }
              if (
                !chosen.has(parameterKey) &&
                !chosen.has(param.parameterId)
              ) {
                return { ...param, selected: false };
              }

              return {
                ...param,
                selected: true,
                price: pending.prices[parameterKey] ?? param.price,
                durationId:
                  pending.durationIds[parameterKey] || param.durationId,
              };
            }),
          };
        });
      } catch (error) {
        patchGroup(key, {
          loadingParams: false,
          // Ditandai sudah dicoba agar efek hidrasi tidak mengulang terus.
          paramsLoadedFor: loadedKey,
          paramsError: (error as Error).message,
        });
      }
    },
    [patchGroup, patchGroupWith, tree]
  );

  /**
   * Hidrasi mode revisi: grup yang datang dari database sudah punya
   * regulationId tetapi belum punya daftar parameter, jadi dimuat di sini.
   */
  useEffect(() => {
    for (const group of groups) {
      const loadedKey = [...group.regulationIds].sort().join(",");
      if (
        group.regulationIds.length > 0 &&
        loadedKey !== group.paramsLoadedFor &&
        !group.loadingParams
      ) {
        void loadParameters(group.key, group.regulationIds, true);
      }
    }
  }, [groups, loadParameters]);

  /** Simpul-simpul yang harus ditampilkan sebagai dropdown cascade. */
  function cascadeLevels(group: GroupDraft) {
    const levels: Array<{ options: MatrixNode[]; value: string }> = [];
    let currentLevel = tree;

    for (let depth = 0; depth <= group.matrixPath.length; depth += 1) {
      if (currentLevel.length === 0) break;

      const value = group.matrixPath[depth] ?? "";
      levels.push({ options: currentLevel, value });

      if (!value) break;

      const chosen = currentLevel.find((node) => node.id === value);
      if (!chosen) break;

      currentLevel = chosen.children;
    }

    return levels;
  }

  function selectedNode(group: GroupDraft): MatrixNode | null {
    let currentLevel = tree;
    let node: MatrixNode | null = null;

    for (const id of group.matrixPath) {
      const found: MatrixNode | undefined = currentLevel.find(
        (candidate) => candidate.id === id
      );
      if (!found) return node;
      node = found;
      currentLevel = found.children;
    }

    return node;
  }

  function handleMatrixChange(group: GroupDraft, depth: number, value: string) {
    // Memilih ulang di tingkat atas membatalkan pilihan tingkat bawahnya.
    const nextPath = [...group.matrixPath.slice(0, depth), value].filter(Boolean);

    patchGroup(group.key, {
      matrixPath: nextPath,
      regulationId: "",
      regulationIds: [],
      regulationLabel: "",
      params: [],
      paramsError: null,
      paramsLoadedFor: null,
      pendingSelection: null,
      description: group.description,
    });
  }

  function handleRegulationToggle(
    group: GroupDraft,
    regulationId: string,
    checked: boolean
  ) {
    const node = selectedNode(group);
    const nextRegulationIds = checked
      ? [...new Set([...group.regulationIds, regulationId])]
      : group.regulationIds.filter((id) => id !== regulationId);
    const labels = nextRegulationIds.map((id) => {
      const regulation = node?.regulations.find((candidate) => candidate.id === id);
      return regulation?.shortName || regulation?.name || "Regulasi";
    });

    const selectedParams = group.params.filter((param) => param.selected);
    const pendingSelection: PendingSelection = {
      parameterKeys: selectedParams.map(
        (param) => param.regulationParameterId ?? param.parameterId
      ),
      knownRegulationIds: group.regulationIds,
      prices: Object.fromEntries(
        selectedParams.map((param) => [
          param.regulationParameterId ?? param.parameterId,
          param.price,
        ])
      ),
      durationIds: Object.fromEntries(
        selectedParams.map((param) => [
          param.regulationParameterId ?? param.parameterId,
          param.durationId,
        ])
      ),
    };

    patchGroup(group.key, {
      regulationId: nextRegulationIds[0] || "",
      regulationIds: nextRegulationIds,
      regulationLabel: labels.join("; "),
      description: group.description || node?.name || "",
      pendingSelection,
      paramsLoadedFor: null,
      params: nextRegulationIds.length ? group.params : [],
    });
  }

  function addGroup() {
    const group = createEmptyGroup();
    onChange((current) => [...current, group]);
    setExpandedKey(group.key);
  }

  function duplicateGroup(group: GroupDraft) {
    const copy: GroupDraft = {
      ...group,
      key: newKey(),
      locations: group.locations.map((location) => ({
        ...location,
        key: newKey(),
      })),
      params: group.params.map((param) => ({ ...param })),
    };

    onChange((current) => {
      const index = current.findIndex((item) => item.key === group.key);
      const next = [...current];
      next.splice(index < 0 ? current.length : index + 1, 0, copy);
      return next;
    });

    setExpandedKey(copy.key);
  }

  function removeGroup(group: GroupDraft) {
    onChange((current) => current.filter((item) => item.key !== group.key));
    if (expandedKey === group.key) setExpandedKey(null);
  }

  const totals = useMemo(() => groupsTotal(groups), [groups]);

  if (loadingTree) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Memuat daftar matriks…
      </div>
    );
  }

  if (treeError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-600">
        {treeError}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, index) => {
        const node = selectedNode(group);
        const levels = cascadeLevels(group);
        const isOpen = expandedKey === group.key;
        const selectedCount = group.params.filter((p) => p.selected).length;
        const subtotal = groupSubtotal(group);
        const locationLabels = group.locations
          .map((location) => location.label.trim())
          .filter(Boolean);

        return (
          <div
            key={group.key}
            className={cn(
              "overflow-hidden rounded-2xl border bg-white transition-colors",
              isOpen ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200 hover:border-blue-200"
            )}
          >
            {/* ---- Kepala kartu: ringkasan grup ---- */}
            <div className="flex items-start gap-3 p-3.5">
              <button
                type="button"
                onClick={() => setExpandedKey(isOpen ? null : group.key)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <ChevronDown
                  size={18}
                  className={`mt-0.5 shrink-0 text-blue-600 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-800">
                    Grup {index + 1}
                    {group.description ? ` · ${group.description}` : ""}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {group.regulationLabel || "Regulasi belum dipilih"}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {selectedCount > 0
                      ? `${selectedCount} dari ${group.params.length} parameter`
                      : "Belum ada parameter"}
                    {locationLabels.length > 0
                      ? ` · ${locationLabels.join(", ")}`
                      : ""}
                    {` · Qty ${group.qty || 1}`}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`text-sm font-black ${
                    subtotal === null ? "text-amber-600" : "text-slate-800"
                  }`}
                >
                  {subtotal === null ? "—" : formatRupiah(subtotal)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => duplicateGroup(group)}
                    aria-label="Duplikat grup"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeGroup(group)}
                    aria-label="Hapus grup"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* ---- Isi kartu ---- */}
            {isOpen && (
              <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 p-4">
                {/* Cascade matriks */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {levels.map((level, depth) => (
                    <div key={depth}>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">
                        {depth === 0 ? "Matriks" : `Sub-matriks ${depth}`}
                      </label>
                      <Select
                        value={level.value}
                        disabled={disabled}
                        placeholder="Pilih…"
                        onChange={(value) =>
                          handleMatrixChange(group, depth, value)
                        }
                        options={level.options.map((option) => ({
                          value: option.id,
                          label: option.name,
                        }))}
                      />
                    </div>
                  ))}

                  {node && (
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">
                        Regulasi / Baku Mutu
                      </label>
                     {node.regulations.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {node.regulations.map((regulation) => (
                            <label
                              key={regulation.id}
                              className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 transition hover:border-blue-300"
                            >
                              <input
                                type="checkbox"
                                checked={group.regulationIds.includes(regulation.id)}
                                disabled={disabled}
                                onChange={(event) =>
                                  handleRegulationToggle(
                                    group,
                                    regulation.id,
                                    event.target.checked
                                  )
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700"
                              />
                              <span>
                                <strong className="block text-slate-700">
                                  {regulation.name}
                                </strong>
                                {regulation.parameterCount} parameter
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
                          Belum ada regulasi terdaftar untuk matriks ini.
                          {node.note ? ` ${node.note}` : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Titik sampling */}
                {group.regulationIds.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <MapPin size={13} /> Titik sampling
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Qty {group.qty || 1}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.locations.map((location, locationIndex) => (
                        <div key={location.key} className="flex gap-2">
                          <input
                            value={location.label}
                            disabled={disabled}
                            placeholder={`Titik ${locationIndex + 1} — mis. Upwind`}
                            onChange={(event) => {
                              const label = event.target.value;
                              patchGroupWith(group.key, (current) => ({
                                ...current,
                                locations: current.locations.map((item) =>
                                  item.key === location.key
                                    ? { ...item, label }
                                    : item
                                ),
                              }));
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
                          />
                          <input
                            value={location.customerSampleId}
                            disabled={disabled}
                            placeholder="ID sampel customer"
                            onChange={(event) => {
                              const customerSampleId = event.target.value;
                              patchGroupWith(group.key, (current) => ({
                                ...current,
                                locations: current.locations.map((item) =>
                                  item.key === location.key
                                    ? { ...item, customerSampleId }
                                    : item
                                ),
                              }));
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
                          />
                          {group.locations.length > 1 && (
                            <button
                              type="button"
                              disabled={disabled}
                              aria-label="Hapus titik"
                              onClick={() =>
                                patchGroupWith(group.key, (current) => ({
                                  ...current,
                                  locations: current.locations.filter(
                                    (item) => item.key !== location.key
                                  ),
                                }))
                              }
                              className="shrink-0 rounded-lg px-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        patchGroupWith(group.key, (current) => ({
                          ...current,
                          locations: [
                            ...current.locations,
                            { key: newKey(), label: "", customerSampleId: "" },
                          ],
                        }))
                      }
                      className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                    >
                      <Plus size={13} /> Tambah titik
                    </button>

                    <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-500">
                          Qty / frekuensi pekerjaan
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={group.qty}
                          disabled={disabled}
                          onChange={(event) =>
                            patchGroup(group.key, { qty: event.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-300"
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          Diisi manual; tidak otomatis sama dengan jumlah lokasi.
                        </span>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-500">
                          Harga satu paket
                        </span>
                        <span className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                          <span className="text-xs font-bold text-slate-400">Rp</span>
                          <input
                            inputMode="numeric"
                            value={group.unitPrice}
                            disabled={disabled}
                            placeholder="Belum ditetapkan"
                            onChange={(event) =>
                              patchGroup(group.key, {
                                unitPrice: formatPriceInput(event.target.value),
                              })
                            }
                            className="min-w-0 flex-1 bg-transparent py-2 text-right text-sm font-bold text-slate-700 outline-none"
                          />
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Parameter */}
                {group.loadingParams && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    <Loader2 size={15} className="animate-spin" /> Memuat
                    parameter…
                  </div>
                )}

                {group.paramsError && (
                  <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-600">
                    {group.paramsError}
                  </p>
                )}

                {group.params.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                      <span className="text-xs font-bold text-slate-500">
                        {selectedCount} dari {group.params.length} parameter
                        dipilih
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            patchGroup(group.key, {
                              params: group.params.map((param) => ({
                                ...param,
                                selected: true,
                              })),
                            })
                          }
                          className="rounded-lg px-2 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                          Pilih semua
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            patchGroup(group.key, {
                              params: group.params.map((param) => ({
                                ...param,
                                selected: false,
                              })),
                            })
                          }
                          className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    <ul className="divide-y divide-slate-100">
                      {group.params.map((param) => {
                        const parameterKey =
                          param.regulationParameterId ?? param.parameterId;

                        return (
                          <li
                            key={parameterKey}
                            className={`px-3 py-2.5 transition ${
                              param.selected ? "" : "opacity-55"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={param.selected}
                                disabled={disabled}
                                onChange={(event) =>
                                  patchParam(group.key, parameterKey, {
                                    selected: event.target.checked,
                                  })
                                }
                                className="mt-1 h-4 w-4 shrink-0 accent-blue-700"
                                aria-label={`Pilih ${param.name}`}
                              />

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold leading-snug text-slate-700">
                                  {param.name}
                                  {!param.isAccredited && (
                                    <span
                                      title="Parameter tidak terakreditasi"
                                      className="ml-1 text-amber-600"
                                    >
                                      *
                                    </span>
                                  )}
                                  {param.unit && (
                                    <span className="ml-1.5 text-xs font-medium text-slate-400">
                                      ({param.unit})
                                    </span>
                                  )}
                                </p>
                                {/* Metode mengikuti parameter, tidak diketik sales. */}
                                <p className="mt-0.5 break-words text-xs font-medium text-slate-400">
                                  {param.regulationLabel} ·{" "}
                                  {param.method || "Metode belum ditetapkan"}
                                </p>
                              </div>

                              {param.selected && param.durations.length > 0 && (
                                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                                  {param.durations.length > 0 && (
                                    <Select
                                      value={param.durationId}
                                      disabled={disabled}
                                      className="w-32"
                                      placeholder="Durasi"
                                      ariaLabel={`Durasi ${param.name}`}
                                      onChange={(value) =>
                                        patchParam(group.key, parameterKey, {
                                          durationId: value,
                                        })
                                      }
                                      options={param.durations.map(
                                        (duration) => ({
                                          value: duration.id,
                                          label: duration.label,
                                        })
                                      )}
                                    />
                                  )}

                                </div>
                              )}
                            </div>

                            {param.selected && param.limitValue && (
                              <p className="mt-1 pl-7 text-xs text-slate-400">
                                Baku mutu: {param.limitValue}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">
                    Deskripsi grup (tercetak di surat penawaran)
                  </label>
                  <input
                    value={group.description}
                    disabled={disabled}
                    placeholder={node?.name || "mis. Udara Ambien"}
                    onChange={(event) =>
                      patchGroup(group.key, { description: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={addGroup}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-3 text-xs font-bold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 disabled:opacity-50"
      >
        <Plus size={16} /> Tambah Grup
      </button>

      {totals.hasUnpriced && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {countUnpricedParams(groups)} paket belum berharga. Quotation
            tetap bisa disimpan dan dikirim sebagai penawaran scope, tetapi
            belum bisa di-approve.
          </span>
        </p>
      )}
    </div>
  );
}
