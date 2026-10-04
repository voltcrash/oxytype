export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const timestamp = Math.floor(Date.now() / 1000);
  new DataView(bytes.buffer).setUint32(0, timestamp);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
