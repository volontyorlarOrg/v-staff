export const CONTRACT_STATUSES = ["published", "announced", "requested"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type Endpoint = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly contract: ContractStatus;
};

export const endpoints = {
  logIn: { method: "POST", path: "/auth/staff/login", contract: "announced" },
  refresh: { method: "POST", path: "/auth/refresh", contract: "published" },
  logOut: { method: "POST", path: "/auth/logout", contract: "published" },
  changePassword: {
    method: "POST",
    path: "/auth/password/change",
    contract: "announced",
  },
  currentUser: { method: "GET", path: "/me", contract: "published" },

  statistics: { method: "GET", path: "/staff/statistics", contract: "announced" },
  activity: { method: "GET", path: "/staff/activity", contract: "announced" },

  vacancies: { method: "GET", path: "/staff/opportunities", contract: "announced" },
  createVacancy: {
    method: "POST",
    path: "/staff/opportunities",
    contract: "announced",
  },
  updateVacancy: {
    method: "PATCH",
    path: "/staff/opportunities/{id}",
    contract: "announced",
  },
  publishVacancy: {
    method: "POST",
    path: "/staff/opportunities/{id}/publish",
    contract: "announced",
  },
  archiveVacancy: {
    method: "POST",
    path: "/staff/opportunities/{id}/archive",
    contract: "announced",
  },

  applications: { method: "GET", path: "/staff/applications", contract: "announced" },
  reviewApplication: {
    method: "PATCH",
    path: "/staff/applications/{id}/review",
    contract: "announced",
  },

  resolveAttendance: {
    method: "PUT",
    path: "/staff/attendance/{applicationId}",
    contract: "announced",
  },

  users: { method: "GET", path: "/staff/users", contract: "announced" },
  user: { method: "GET", path: "/staff/users/{id}", contract: "announced" },
  replaceUserPassword: {
    method: "PUT",
    path: "/staff/users/{id}/password",
    contract: "announced",
  },

  organizations: { method: "GET", path: "/organizations", contract: "published" },
} as const satisfies Record<string, Endpoint>;

export type EndpointName = keyof typeof endpoints;

export function pathFor(
  name: EndpointName,
  params: Record<string, string> = {},
): string {
  return endpoints[name].path.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (!value) throw new Error(`Missing "${key}" for endpoint ${name}`);
    return encodeURIComponent(value);
  });
}

export function isPublished(name: EndpointName): boolean {
  return endpoints[name].contract === "published";
}
