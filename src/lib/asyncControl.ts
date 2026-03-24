export async function withTimeout<T>(promiseOrThenable: Promise<T> | PromiseLike<T>, timeoutMs: number, label = 'request'): Promise<T> {
  const promise = Promise.resolve(promiseOrThenable);
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));