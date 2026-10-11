import { isRedirectError } from "next/dist/client/components/redirect-error";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Server side. A production build strips the message from any error thrown in
 * a Server Action, so "Current PIN is wrong." would reach the phone as
 * gibberish. Wrapped actions send the message back as data instead. */
export function safe<A extends unknown[], T>(action: (...args: A) => Promise<T>) {
  return async (...args: A): Promise<Result<T>> => {
    try {
      return { ok: true, value: await action(...args) };
    } catch (error) {
      if (isRedirectError(error)) throw error;
      return { ok: false, error: error instanceof Error ? error.message : "Something went wrong. Try again." };
    }
  };
}

/** Client side: turns the failure back into a thrown Error for try/catch. */
export function unwrapped<A extends unknown[], T>(action: (...args: A) => Promise<Result<T>>) {
  return async (...args: A): Promise<T> => {
    const result = await action(...args);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  };
}
