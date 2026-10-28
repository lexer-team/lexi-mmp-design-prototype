import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";

const ROLE_PERMISSIONS = [
  { id: "chat", label: "Use Lexi chat" },
  { id: "dashboards", label: "View dashboards" },
  { id: "segments", label: "Create and manage segments" },
  { id: "activations", label: "Manage activations" },
  { id: "integrations", label: "Manage integrations" },
  { id: "definitions", label: "Manage definitions and rules" },
  { id: "context", label: "Manage business context" },
  { id: "users", label: "Manage users and roles" },
] as const;

type PermissionAccess = "manage" | "view" | "none";
type RoleDefinition = { description: string; permissions: Record<string, PermissionAccess> };

const permissionLevels = (manage: string[], viewOnly: string[] = []): Record<string, PermissionAccess> =>
  Object.fromEntries(ROLE_PERMISSIONS.map(({ id }) => [
    id,
    manage.includes(id) ? "manage" : viewOnly.includes(id) ? "view" : "none",
  ]));

const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  Admin: { description: "Full access to users, roles, data connections and workspace configuration.", permissions: permissionLevels(ROLE_PERMISSIONS.map((permission) => permission.id)) },
  Manager: { description: "Manage day-to-day customer programs, segments and activations.", permissions: permissionLevels(["chat", "segments", "activations", "integrations"], ["dashboards"]) },
  Analyst: { description: "Explore dashboards and build customer segments.", permissions: permissionLevels(["chat", "segments"], ["dashboards"]) },
  Viewer: { description: "View dashboards and ask Lexi questions.", permissions: permissionLevels(["chat"], ["dashboards"]) },
  User: { description: "Use chat and view shared workspace content.", permissions: permissionLevels(["chat"], ["dashboards"]) },
};

export function RoleManagerDialog({
  open,
  onOpenChange,
  roles,
  onCreateRole,
  onRenameRole,
  onDeleteRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: string[];
  onCreateRole: (role: string) => void;
  onRenameRole: (oldName: string, newName: string) => void;
  onDeleteRole: (role: string, fallbackRole: string) => void;
}) {
  const [selectedRole, setSelectedRole] = useState(roles[0] ?? "");
  const [draftName, setDraftName] = useState(roles[0] ?? "");
  const [draftDescription, setDraftDescription] = useState(DEFAULT_ROLES[roles[0] ?? ""]?.description ?? "");
  const [roleDefinitions, setRoleDefinitions] = useState<Record<string, RoleDefinition>>(DEFAULT_ROLES);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setRoleDefinitions((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([role]) => roles.includes(role)));
      roles.forEach((role) => {
        if (!next[role]) next[role] = DEFAULT_ROLES[role] ?? { description: "", permissions: permissionLevels([]) };
      });
      return next;
    });
    if (!roles.includes(selectedRole) && roles[0]) {
      setSelectedRole(roles[0]);
      setDraftName(roles[0]);
      setDraftDescription(DEFAULT_ROLES[roles[0]]?.description ?? "");
    }
  }, [roles, selectedRole]);

  const selectRole = (role: string) => {
    setSelectedRole(role);
    setDraftName(role);
    setDraftDescription(roleDefinitions[role]?.description ?? DEFAULT_ROLES[role]?.description ?? "");
    setError("");
  };

  const createRole = () => {
    const role = newRoleName.trim();
    if (!role) return;
    if (roles.some((existing) => existing.toLowerCase() === role.toLowerCase())) {
      setError("A role with this name already exists.");
      return;
    }
    onCreateRole(role);
    setRoleDefinitions((current) => ({ ...current, [role]: { description: "", permissions: permissionLevels([]) } }));
    setSelectedRole(role);
    setDraftName(role);
    setDraftDescription("");
    setNewRoleName("");
    setError("");
  };

  const saveRole = () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setError("Enter a role name.");
      return;
    }
    if (roles.some((role) => role.toLowerCase() === nextName.toLowerCase() && role !== selectedRole)) {
      setError("A role with this name already exists.");
      return;
    }
    if (nextName !== selectedRole) onRenameRole(selectedRole, nextName);
    setRoleDefinitions((current) => {
      const next = { ...current, [nextName]: { ...current[selectedRole], description: draftDescription } };
      if (nextName !== selectedRole) delete next[selectedRole];
      return next;
    });
    setSelectedRole(nextName);
    setDraftName(nextName);
    setError("");
  };

  const deleteRole = () => {
    if (!selectedRole || roles.length < 2) return;
    const fallbackRole = roles.find((role) => role !== selectedRole) ?? "";
    onDeleteRole(selectedRole, fallbackRole);
    setRoleDefinitions((current) => {
      const next = { ...current };
      delete next[selectedRole];
      return next;
    });
    selectRole(fallbackRole);
    setDeleteOpen(false);
  };

  const permissions = roleDefinitions[selectedRole]?.permissions ?? [];

  return (
    <>
      <Button variant="outline" onClick={() => onOpenChange(true)}>Manage roles</Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg" className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage roles</DialogTitle>
            <DialogDescription>Define role descriptions and permissions for your team.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid min-h-[26rem] grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border md:grid-cols-[15rem_minmax(0,1fr)] md:divide-x md:divide-y-0">
            <aside className="flex min-h-0 flex-col p-3">
              <p className="px-2 pb-2 text-xs font-semibold text-foreground-secondary">Roles</p>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {roles.map((role) => (
                  <button key={role} type="button" onClick={() => selectRole(role)} className={`w-full rounded-md px-2.5 py-2 text-left ${selectedRole === role ? "bg-accent text-foreground" : "text-foreground-secondary hover:bg-muted/50 hover:text-foreground"}`}>
                    <span className="block text-sm font-medium">{role}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{roleDefinitions[role]?.description || DEFAULT_ROLES[role]?.description || "No description yet"}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <label htmlFor="manage-new-role" className="text-xs font-medium text-foreground">New role</label>
                <div className="mt-1 flex gap-2">
                  <Input id="manage-new-role" value={newRoleName} onChange={(event) => { setNewRoleName(event.target.value); setError(""); }} placeholder="Role name" className="h-9" />
                  <Button size="sm" onClick={createRole} disabled={!newRoleName.trim()}>Add</Button>
                </div>
              </div>
            </aside>
            <section className="min-w-0 overflow-y-auto p-4">
              {selectedRole ? (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[12rem] flex-1">
                      <label htmlFor="manage-role-name" className="text-xs font-semibold text-foreground-secondary">Role name</label>
                      <Input id="manage-role-name" value={draftName} onChange={(event) => { setDraftName(event.target.value); setError(""); }} className="mt-1" />
                    </div>
                    <Button onClick={saveRole} disabled={!draftName.trim()}>Save role</Button>
                    <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={roles.length < 2}>Delete</Button>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="manage-role-description" className="text-xs font-semibold text-foreground-secondary">Description</label>
                    <Input id="manage-role-description" value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} className="mt-1" placeholder="Describe this role's responsibilities" />
                  </div>
                  <fieldset className="mt-5">
                    <legend className="text-sm font-semibold text-foreground">Permissions</legend>
                    <div className="mt-2 divide-y divide-border border-y border-border">
                      {ROLE_PERMISSIONS.map((permission) => (
                        <div key={permission.id} className="grid grid-cols-1 items-center gap-2 py-2.5 text-sm text-foreground md:grid-cols-[minmax(10rem,1fr)_minmax(18rem,1.5fr)]">
                          <span>{permission.label}</span>
                          <RadioGroup
                            value={permissions[permission.id] ?? "none"}
                            onValueChange={(value: PermissionAccess) => setRoleDefinitions((current) => ({
                              ...current,
                              [selectedRole]: {
                                description: current[selectedRole]?.description ?? "",
                                permissions: { ...current[selectedRole]?.permissions, [permission.id]: value },
                              },
                            }))}
                            className="grid grid-cols-3 gap-2"
                            aria-label={`${permission.label} access`}
                          >
                            {(["manage", "view", "none"] as const).map((value) => (
                              <label key={value} className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground-secondary">
                                <RadioGroupItem value={value} />
                                <span>{value === "view" ? "View Only" : value === "none" ? "No Access" : "Manage"}</span>
                              </label>
                            ))}
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                  {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
                </>
              ) : <p className="text-sm text-muted-foreground">Create a role to define its permissions.</p>}
            </section>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} variant="destructive" title={`Delete ${selectedRole}?`} description={`Users assigned to ${selectedRole} will be reassigned to another existing role.`} confirmLabel="Delete role" cancelLabel="Keep role" onConfirm={deleteRole} />
    </>
  );
}