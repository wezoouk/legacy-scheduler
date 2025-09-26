// Utility to log warnings only once per session
const warnedMessages = new Set<string>();

export const onceWarn = (name: string, message: string) => {
  const key = `${name}:${message}`;
  if (!warnedMessages.has(key)) {
    console.warn(`[${name}] ${message}`);
    warnedMessages.add(key);
  }
};



