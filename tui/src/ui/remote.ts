import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";
import { responseError } from "../api/client";

export function dataOrThrow<T>(response: {
  status: number;
  body: { data: T } | { message: string };
  headers: Headers;
}): T {
  if (response.status !== 200 || !("data" in response.body)) {
    throw responseError(response);
  }
  return response.body.data;
}

/** Clear old data on every dependency change; ignore responses after disposal. */
export function createRemote<T>(load: () => Promise<T> | undefined): {
  data: Accessor<T | undefined>;
  error: Accessor<string | undefined>;
  loading: Accessor<boolean>;
  reload: () => void;
} {
  const [data, setData] = createSignal<T>();
  const [error, setError] = createSignal<string>();
  const [loading, setLoading] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  let request = 0;
  createEffect(() => {
    revision();
    const id = ++request;
    setData(undefined);
    setError(undefined);
    let pending: Promise<T> | undefined;
    try {
      pending = load();
    } catch (failure) {
      setLoading(false);
      setError(failure instanceof Error ? failure.message : "Request failed");
      return;
    }
    setLoading(pending !== undefined);
    void pending
      ?.then(
        (value) => {
          if (id === request) setData(() => value);
        },
        (failure: unknown) => {
          if (id === request) {
            setError(
              failure instanceof Error ? failure.message : "Request failed",
            );
          }
        },
      )
      .finally(() => {
        if (id === request) setLoading(false);
      });
  });
  onCleanup(() => {
    request++;
  });
  return {
    data,
    error,
    loading,
    reload: () => setRevision((value) => value + 1),
  };
}
