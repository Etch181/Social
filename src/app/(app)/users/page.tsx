"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Loader2, UserCog, Clock } from "lucide-react";
import { Panel, PanelHeader, Badge, Modal, FadeIn, useToast, Skeleton } from "@/components/ui";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data?type=users");
      const data = await res.json();
      if (data.ok) setRows(data.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name || !form.email || form.password.length < 10) {
      toast.show("Name, email and a password of at least 10 characters are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "user.create", ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Failed to create user", "error");
        return;
      }
      toast.show("User created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "STAFF" });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">ROLE-BASED ACCESS CONTROL</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">User Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Administrators have full access, staff operate the agency workflows, and client users are
              hard-locked to their own workspace by the backend — not by hiding UI elements.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Add user
          </button>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            role: "ADMIN",
            title: "Administrator",
            body: "Full access to every workspace, integration, provider, user and security setting.",
            tone: "accent",
          },
          {
            role: "STAFF",
            title: "Agency staff",
            body: "Runs day-to-day operations: clients, content, approvals, publishing and analytics.",
            tone: "info",
          },
          {
            role: "CLIENT",
            title: "Client user",
            body: "Reads and manages only their own workspace data — enforced server-side on every query.",
            tone: "success",
          },
        ].map((item) => (
          <Panel key={item.role} hover>
            <Badge tone={item.tone}>{item.role}</Badge>
            <h3 className="mt-4 text-[14px] font-semibold text-ink">{item.title}</h3>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{item.body}</p>
          </Panel>
        ))}
      </div>

      <Panel pad={false}>
        <div className="border-b border-[var(--c-edge)] px-6 py-4">
          <PanelHeader label="ACCOUNTS" title="Platform users" />
        </div>

        {loading ? (
          <div className="p-6">
            <Skeleton lines={5} />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <UserCog size={26} className="mx-auto text-muted" />
            <h3 className="mt-4 text-[14px] font-semibold text-ink">No additional users yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">
              Add staff or client users to delegate operations while keeping tenant isolation intact.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-2)] text-[11px] font-bold text-white">
                          {row.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">{row.name}</span>
                      </div>
                    </td>
                    <td className="num text-xs">{row.email}</td>
                    <td>
                      <Badge tone={row.role === "ADMIN" ? "accent" : row.role === "STAFF" ? "info" : "neutral"}>
                        {row.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={row.status === "ACTIVE" ? "success" : "warning"}>{row.status}</Badge>
                    </td>
                    <td className="num text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-muted" />
                        {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "never"}
                      </div>
                    </td>
                    <td className="num text-xs">{new Date(row.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create user"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={create} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Create user
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="lbl">Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Email</label>
            <input
              className="input"
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Password (min. 10 characters)</label>
            <input
              className="input"
              type="password"
              dir="ltr"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Administrator</option>
              <option value="STAFF">Agency staff</option>
              <option value="CLIENT">Client user</option>
            </select>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] px-4 py-3.5">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--c-success)]" />
            <p className="text-[11px] leading-relaxed text-muted">
              Passwords are hashed with bcrypt (cost factor 12) before storage. Plaintext passwords are
              never persisted or logged.
            </p>
          </div>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
