const cloneValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const cloned = Object.keys(source).reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = cloneValue(source[key]);
      return accumulator;
    }, {});

    return cloned as T;
  }

  return value;
};

export const cloneResponseSafely = <T>(response: T): Readonly<T> => Object.freeze(cloneValue(response));
