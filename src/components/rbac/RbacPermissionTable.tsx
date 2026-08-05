"use client";

import { Fragment, useMemo, useState } from "react";
import type { Menu, Role, RoleMenu } from "@prisma/client";
import { Save } from "lucide-react";
import Select from "@/components/ui/Select";

type RoleWithMenus = Role & {
  roleMenus: Array<
    RoleMenu & {
      menu: Menu;
    }
  >;
};

type PermissionKey =
  | "canView"
  | "canCreate"
  | "canUpdate"
  | "canDelete"
  | "canApprove"
  | "canValidate"
  | "canExport";

type PermissionItem = {
  menuId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canValidate: boolean;
  canExport: boolean;
};

type PermissionState = Record<string, Record<string, PermissionItem>>;

type Props = {
  roles: RoleWithMenus[];
  menus: Menu[];
};

const permissions: Array<{
  key: PermissionKey;
  label: string;
}> = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canUpdate", label: "Update" },
  { key: "canDelete", label: "Delete" },
  { key: "canApprove", label: "Approve" },
  { key: "canValidate", label: "Validate" },
  { key: "canExport", label: "Export" },
];

function createInitialPermissions(roles: RoleWithMenus[], menus: Menu[]) {
  const state: PermissionState = {};

  for (const role of roles) {
    state[role.id] = {};

    for (const menu of menus) {
      const current = role.roleMenus.find((item) => item.menuId === menu.id);

      state[role.id][menu.id] = {
        menuId: menu.id,
        canView: current?.canView ?? false,
        canCreate: current?.canCreate ?? false,
        canUpdate: current?.canUpdate ?? false,
        canDelete: current?.canDelete ?? false,
        canApprove: current?.canApprove ?? false,
        canValidate: current?.canValidate ?? false,
        canExport: current?.canExport ?? false,
      };
    }
  }

  return state;
}

function getMenuGroup(menuKey: string) {
  const prefix = menuKey.split(".")[0];

  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    admin: "Administration",
    master: "Master Data",
    quotation: "Quotation",
    sales: "Sales",
    technical: "Technical",
    lab: "Laboratory",
    coa: "COA",
    finance: "Finance",
  };

  return labels[prefix] || "Other";
}

export default function RbacPermissionTable({ roles, menus }: Props) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || "");
  const [permissionState, setPermissionState] = useState<PermissionState>(() =>
    createInitialPermissions(roles, menus)
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const groupedMenus = useMemo(() => {
    return menus.reduce<Record<string, Menu[]>>((acc, menu) => {
      const group = getMenuGroup(menu.key);

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push(menu);

      return acc;
    }, {});
  }, [menus]);

  function togglePermission(menuId: string, key: PermissionKey) {
    if (!selectedRoleId) return;

    setPermissionState((prev) => {
      const current = prev[selectedRoleId]?.[menuId];

      if (!current) return prev;

      return {
        ...prev,
        [selectedRoleId]: {
          ...prev[selectedRoleId],
          [menuId]: {
            ...current,
            [key]: !current[key],
          },
        },
      };
    });
  }

  function checkAllMenu(menuId: string) {
    if (!selectedRoleId) return;

    setPermissionState((prev) => {
      const current = prev[selectedRoleId]?.[menuId];

      if (!current) return prev;

      const shouldCheck = !(
        current.canView &&
        current.canCreate &&
        current.canUpdate &&
        current.canDelete &&
        current.canApprove &&
        current.canValidate &&
        current.canExport
      );

      return {
        ...prev,
        [selectedRoleId]: {
          ...prev[selectedRoleId],
          [menuId]: {
            ...current,
            canView: shouldCheck,
            canCreate: shouldCheck,
            canUpdate: shouldCheck,
            canDelete: shouldCheck,
            canApprove: shouldCheck,
            canValidate: shouldCheck,
            canExport: shouldCheck,
          },
        },
      };
    });
  }

  async function savePermissions() {
    if (!selectedRoleId) {
      setMessage("Pilih role dulu.");
      return;
    }

    setLoading(true);
    setMessage("");

    const permissionsPayload = Object.values(
      permissionState[selectedRoleId] || {}
    );

    const response = await fetch(`/api/admin/roles/${selectedRoleId}/menus`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        permissions: permissionsPayload,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal update permission");
      return;
    }

    setMessage("Permission berhasil disimpan.");
  }

  if (!selectedRole) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
        Role belum tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium text-slate-600">
          Pilih Role
        </label>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Select
            value={selectedRoleId}
            onChange={(value) => {
              setSelectedRoleId(value);
              setMessage("");
            }}
            options={roles.map((role) => ({ value: role.id, label: `${role.name} - ${role.code}` }))}
            ariaLabel="Pilih Role"
            className="w-full md:max-w-md"
            buttonClassName="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 outline-none"
          />

          <button
            onClick={savePermissions}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {loading ? "Menyimpan..." : "Simpan Permission"}
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="sticky left-0 z-20 w-70 bg-white px-5 py-4">
                  Menu
                </th>

                {permissions.map((permission) => (
                  <th key={permission.key} className="px-4 py-4 text-center">
                    {permission.label}
                  </th>
                ))}

                <th className="px-4 py-4 text-center">All</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(groupedMenus).map(([groupName, items]) => (
                <Fragment key={groupName}>
                  <tr className="border-b border-slate-200 bg-white">
                    <td
                      colSpan={permissions.length + 2}
                      className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-emerald-600"
                    >
                      {groupName}
                    </td>
                  </tr>

                  {items.map((menu) => {
                    const current = permissionState[selectedRoleId]?.[menu.id];

                    if (!current) return null;

                    const allChecked =
                      current.canView &&
                      current.canCreate &&
                      current.canUpdate &&
                      current.canDelete &&
                      current.canApprove &&
                      current.canValidate &&
                      current.canExport;

                    return (
                      <tr
                        key={menu.id}
                        className="group border-b border-slate-200 hover:bg-slate-50"
                      >
                        <td className="sticky left-0 z-1 bg-white px-5 py-4 group-hover:bg-slate-50">
                          <p className="font-medium text-slate-900">{menu.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {menu.key} · {menu.href}
                          </p>
                        </td>

                        {permissions.map((permission) => (
                          <td
                            key={`${menu.id}-${permission.key}`}
                            className="px-4 py-4 text-center"
                          >
                            <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100">
                              <input
                                type="checkbox"
                                checked={current[permission.key]}
                                onChange={() =>
                                  togglePermission(menu.id, permission.key)
                                }
                                className="h-4 w-4 accent-emerald-500"
                              />
                            </label>
                          </td>
                        ))}

                        <td className="px-4 py-4 text-center">
                          <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={() => checkAllMenu(menu.id)}
                              className="h-4 w-4 accent-emerald-500"
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
