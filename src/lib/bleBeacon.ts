// Trial: verify physical presence via the station ESP32 BLE beacon (Web Bluetooth, Android Chrome).
export const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const BLE_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const BLE_TRIAL_EMPLOYEES = ['emp1490'];

export const isBleTrialEmployee = (...codes: (string | null | undefined)[]) =>
  codes.some((c) => !!c && BLE_TRIAL_EMPLOYEES.includes(String(c).trim().toLowerCase()));

/** Must be called directly from a click (user gesture). Throws an Arabic/English message on failure. */
export async function verifyStationBeacon(ar = true): Promise<void> {
  const bt = (navigator as any).bluetooth;
  if (!bt?.requestDevice) {
    throw new Error(ar
      ? 'هذا المتصفح لا يدعم البلوتوث. استخدم Chrome على أندرويد.'
      : 'This browser does not support Bluetooth. Use Chrome on Android.');
  }
  let device: any;
  try {
    device = await bt.requestDevice({ filters: [{ services: [BLE_SERVICE_UUID] }] });
  } catch {
    throw new Error(ar
      ? 'لم يتم العثور على جهاز المحطة. تأكد أنك داخل المحطة وأن البلوتوث مفعّل ثم اختر الجهاز.'
      : 'Station device not found. Make sure you are at the station with Bluetooth on.');
  }
  try {
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService(BLE_SERVICE_UUID);
    const ch = await svc.getCharacteristic(BLE_CHAR_UUID);
    const val = new TextDecoder().decode(await ch.readValue());
    try { server.disconnect(); } catch { /* ignore */ }
    if (val !== 'STATION_VERIFIED') throw new Error('bad');
  } catch {
    throw new Error(ar
      ? 'تعذّر التحقق من جهاز المحطة. اقترب من الجهاز وأعد المحاولة.'
      : 'Could not verify the station device. Move closer and retry.');
  }
}
