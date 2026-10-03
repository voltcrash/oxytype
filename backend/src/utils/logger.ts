function write(level: string, message: string): void {
  const record = JSON.stringify({ level, message });
  if (level === "error") console.error(record);
  else if (level === "warning") console.warn(record);
  else console.info(record);
}
export default {
  error: (message: string): void => write("error", message),
  warning: (message: string): void => write("warning", message),
  info: (message: string): void => write("info", message),
  success: (message: string): void => write("success", message),
};
