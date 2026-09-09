export const PORTAL_ID = "staff" as const;

export const PORTAL_ROLE = "coordinator" as const;

export const SESSION_COOKIE_NAME = "volontyorlar_staff_session";

export const SESSION_SECRET_VARIABLE = "VOLONTYORLAR_STAFF_SESSION_SECRET";

export const LOGIN_ENDPOINT = "/auth/staff/login";

export const IS_ADMIN_PORTAL = false;

export const DEVELOPMENT_PORT = 3002;

export function rawSessionSecret(): string | undefined {
  return process.env.VOLONTYORLAR_STAFF_SESSION_SECRET;
}
