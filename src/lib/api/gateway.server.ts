import "server-only";

import type { z } from "zod";
import { cache } from "react";

import { authedApi, authedMultipart, type QueryParams } from "@/lib/api/client.server";
import {
  endpoints,
  pathFor,
  type Endpoint,
  type EndpointName,
} from "@/lib/api/endpoints";
import { isApiError, isSessionOver } from "@/lib/api/errors";
import { loadedFromError, ready, type Loaded } from "@/lib/api/load";
import {
  failedResult,
  okResult,
  resultFromError,
  type ActionResult,
} from "@/lib/api/action-result";
import { getSession } from "@/lib/auth/session.server";

type Params = Record<string, string>;

export type ReadOptions<TSchema extends z.ZodType> = {
  schema: TSchema;
  params?: Params;
  query?: QueryParams;
};

export type WriteOptions = {
  params?: Params;
  body?: unknown;
  query?: QueryParams;
};

function stableKey(value: Record<string, unknown> | undefined): string {
  const entries = Object.entries(value ?? {})
    .filter(([, item]) => item !== undefined && item !== null && item !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function fromKey<T>(key: string): T {
  return Object.fromEntries(JSON.parse(key) as Array<[string, unknown]>) as T;
}

const readOnce = cache(
  async (
    name: EndpointName,
    schema: z.ZodType,
    paramsKey: string,
    queryKey: string,
  ): Promise<Loaded<unknown>> => {
    const session = await getSession();
    if (!session) return { state: "expired" };

    const endpoint: Endpoint = endpoints[name];

    try {
      const data = await authedApi(
        pathFor(name, fromKey<Params>(paramsKey)),
        session.accessToken,
        { method: endpoint.method, query: fromKey<QueryParams>(queryKey), schema },
      );
      return ready(data);
    } catch (error) {
      return loadedFromError(error, name, endpoint.contract === "published");
    }
  },
);

export function read<TSchema extends z.ZodType>(
  name: EndpointName,
  { schema, params, query }: ReadOptions<TSchema>,
): Promise<Loaded<z.infer<TSchema>>> {
  return readOnce(name, schema, stableKey(params), stableKey(query)) as Promise<
    Loaded<z.infer<TSchema>>
  >;
}

export async function write(
  name: EndpointName,
  { params, body, query }: WriteOptions = {},
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failedResult("sessionExpired");

  const endpoint = endpoints[name];
  const path = pathFor(name, params);
  const send = (accessToken: string) =>
    authedApi(path, accessToken, { method: endpoint.method, query, body });

  try {
    await send(session.accessToken);
    return okResult;
  } catch (error) {
    if (isSessionOver(error)) {
      return failedResult("sessionExpired");
    }

    if (
      isApiError(error) &&
      error.code === "notFound" &&
      error.backendCode === null &&
      endpoint.contract !== "published"
    ) {
      return failedResult("awaitingContract");
    }

    return resultFromError(error);
  }
}

export async function writeReturning<TSchema extends z.ZodType>(
  name: EndpointName,
  { schema, params, body, query }: WriteOptions & { schema: TSchema },
): Promise<{ result: ActionResult; data?: z.infer<TSchema> }> {
  const session = await getSession();
  if (!session) return { result: failedResult("sessionExpired") };

  const endpoint = endpoints[name];

  try {
    const data = await authedApi(pathFor(name, params), session.accessToken, {
      method: endpoint.method,
      query,
      body,
      schema,
    });
    return { result: okResult, data: data as z.infer<TSchema> };
  } catch (error) {
    if (isSessionOver(error)) return { result: failedResult("sessionExpired") };
    return { result: resultFromError(error) };
  }
}

export async function writeMultipart(
  name: EndpointName,
  params: Params,
  body: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failedResult("sessionExpired");
  try {
    await authedMultipart(pathFor(name, params), session.accessToken, body);
    return okResult;
  } catch (error) {
    if (isSessionOver(error)) return failedResult("sessionExpired");
    return resultFromError(error);
  }
}
