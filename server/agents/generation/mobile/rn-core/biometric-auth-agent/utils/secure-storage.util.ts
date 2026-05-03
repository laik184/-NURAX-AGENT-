const storageBucket = new Map<string, string>();

const getScopedKey = (key: string): string => `secure::${key}`;

export const secureSet = async (key: string, value: string): Promise<void> => {
  storageBucket.set(getScopedKey(key), value);
};

export const secureGet = async (key: string): Promise<string | null> => {
  const value = storageBucket.get(getScopedKey(key));
  return value ?? null;
};

export const secureDelete = async (key: string): Promise<void> => {
  storageBucket.delete(getScopedKey(key));
};
