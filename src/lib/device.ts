export function getOrCreateDeviceId(): string {
  const key = "attendance_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    id = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(key, id);
  }
  return id;
}
