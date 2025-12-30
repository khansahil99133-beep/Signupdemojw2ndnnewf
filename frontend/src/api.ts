import { getAppMode } from "./utils/appMode";

function normalizeApiBase(raw?: string | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, "");
}

const appMode = getAppMode(import.meta.env.VITE_APP_MODE);
const adminApiBase = normalizeApiBase(import.meta.env.VITE_ADMIN_API_BASE);
const publicApiBase = normalizeApiBase(import.meta.env.VITE_API_BASE);
const API_BASE = (appMode === "admin" ? adminApiBase : publicApiBase) ?? "";

function buildApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalized}` : normalized;
}

export type SignupPayload = {
  username: string;
  email?: string | null;
  mobileNumber: string;
  whatsappNumber?: string | null;
  telegramUsername?: string | null;
  password: string;
};

export type UserStatus = "pending" | "approved" | "rejected";

export type StatusHistoryEntry = {
  at: string;
  by: string;
  from: string | null;
  to: UserStatus;
  note?: string;
};

export type SignupUser = {
  id: string;
  username: string;
  email: string | null;
  mobileNumber: string;
  whatsappNumber: string | null;
  telegramUsername: string | null;
  createdAt: string;
  updatedAt?: string;
  status?: UserStatus;
  statusChangedAt?: string;
  statusChangedBy?: string;
  statusHistory?: StatusHistoryEntry[];
};

export type ApiValidationError = {
  error: "validation_error";
  details: Array<{ field: string; message: string }>;
};

export type UsersListResponse = {
  users: SignupUser[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  counts: { pending: number; approved: number; rejected: number };
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  userId: string;
  username: string;
  from: string;
  to: string;
};

export type AuditResponse = {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    if (isJson && body?.error === "validation_error" && Array.isArray(body?.details)) {
      const first = body.details?.[0]?.message
        ? String(body.details[0].message)
        : "Validation error";
      const err = new Error(first) as Error & { data?: unknown };
      err.data = body;
      throw err;
    }

    const msg =
      typeof body === "string"
        ? body
        : body?.details?.[0]?.message
        ? String(body.details[0].message)
        : body?.error
        ? String(body.error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export async function signup(payload: SignupPayload): Promise<{ user: SignupUser }> {
  return jsonFetch("/api/signup", { method: "POST", body: JSON.stringify(payload) });
}

export async function adminLogin(payload: {
  username: string;
  password: string;
}): Promise<{ ok: true }> {
  await jsonFetch("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
  return { ok: true };
}

export async function adminMe(): Promise<{ ok: true; admin: { username: string } }> {
  return jsonFetch("/api/auth/me", { method: "GET" });
}

export async function adminLogout(): Promise<{ ok: true }> {
  return jsonFetch("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export async function listUsers(params: {
  q?: string;
  status?: UserStatus | "";
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}): Promise<UsersListResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.sort) sp.set("sort", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const qs = sp.toString();
  return jsonFetch(`/api/admin/users${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
): Promise<{ user: SignupUser }> {
  return jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function adminUpdateUser(
  id: string,
  payload: {
    email?: string | null;
    mobileNumber: string;
    whatsappNumber?: string | null;
    telegramUsername?: string | null;
    status?: UserStatus;
  },
): Promise<{ user: SignupUser }> {
  return jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteUser(id: string): Promise<{ ok: true }> {
  await jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return { ok: true };
}

export async function createResetToken(
  id: string,
): Promise<{ token: string; resetUrl: string; expiresAt: number }> {
  return jsonFetch(`/api/admin/users/${encodeURIComponent(id)}/reset-token`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  await jsonFetch("/api/reset-password", { method: "POST", body: JSON.stringify(payload) });
  return { ok: true };
}

export async function listAudit(params: {
  page?: number;
  pageSize?: number;
}): Promise<AuditResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const qs = sp.toString();
  return jsonFetch(`/api/admin/audit${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  tags: string[];
  published: boolean;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  contentMarkdown?: string;
  newsletterRequested?: boolean;
  newsletterStatus?: string | null;
  newsletterSentAt?: string | null;
};

export type BlogListResponse = {
  items: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export async function listBlog(params: {
  q?: string;
  tag?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}): Promise<BlogListResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tag) sp.set("tag", params.tag);
  if (params.sort) sp.set("sort", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const qs = sp.toString();
  return jsonFetch(`/api/blog${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getBlog(slug: string): Promise<{ post: BlogPost; related: BlogPost[] }> {
  return jsonFetch(`/api/blog/${encodeURIComponent(slug)}`, { method: "GET" });
}

export async function adminListBlog(params: {
  q?: string;
  tag?: string;
  status?: "all" | "published" | "draft";
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}): Promise<BlogListResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tag) sp.set("tag", params.tag);
  if (params.status) sp.set("status", params.status);
  if (params.sort) sp.set("sort", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const qs = sp.toString();
  return jsonFetch(`/api/admin/blog${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function adminCreateBlog(payload: {
  title: string;
  slug?: string;
  excerpt?: string;
  contentMarkdown: string;
  coverImageUrl?: string | null;
  tags?: string[];
  published?: boolean;
}): Promise<{ post: BlogPost }> {
  return jsonFetch(`/api/admin/blog`, { method: "POST", body: JSON.stringify(payload) });
}

export async function adminUpdateBlog(
  id: string,
  payload: {
    title: string;
    slug?: string;
    excerpt?: string;
    contentMarkdown: string;
    coverImageUrl?: string | null;
    tags?: string[];
    published?: boolean;
  },
): Promise<{ post: BlogPost }> {
  return jsonFetch(`/api/admin/blog/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteBlog(id: string): Promise<{ ok: true }> {
  await jsonFetch(`/api/admin/blog/${encodeURIComponent(id)}`, { method: "DELETE" });
  return { ok: true };
}

export async function adminUploadImage(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/uploads/image", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg =
      typeof body === "string" ? body : body?.error ? String(body.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as { url: string };
}

export type BlogTag = { tag: string; count: number };

export async function listBlogTags(): Promise<{ items: BlogTag[] }> {
  return jsonFetch(`/api/blog/tags`, { method: "GET" });
}
