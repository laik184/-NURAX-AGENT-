const activeLocks = new Set<string>();

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const withFileLock = async <T>(lockKey: string, task: () => Promise<T>): Promise<T> => {
  while (activeLocks.has(lockKey)) {
    await wait(10);
  }

  activeLocks.add(lockKey);
  try {
    return await task();
  } finally {
    activeLocks.delete(lockKey);
  }
};
