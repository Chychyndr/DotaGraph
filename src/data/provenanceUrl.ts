export const isWebUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};
