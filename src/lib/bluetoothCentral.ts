export type BluetoothUuid = string;
export interface BleCharacteristic extends EventTarget {
  uuid: string;
  value?: DataView;
  properties: { read: boolean; write: boolean; writeWithoutResponse: boolean; notify: boolean; indicate: boolean };
  readValue(): Promise<DataView>;
  writeValueWithResponse(value: Uint8Array): Promise<void>;
  writeValueWithoutResponse(value: Uint8Array): Promise<void>;
  startNotifications(): Promise<BleCharacteristic>;
  stopNotifications(): Promise<BleCharacteristic>;
}
export interface BleService {
  uuid: string;
  getCharacteristics(): Promise<BleCharacteristic[]>;
  getCharacteristic(uuid: BluetoothUuid): Promise<BleCharacteristic>;
}
export interface BleServer {
  connected: boolean;
  connect(): Promise<BleServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BleService[]>;
  getPrimaryService(uuid: BluetoothUuid): Promise<BleService>;
}
export interface BleDevice extends EventTarget { id: string; name?: string; gatt?: BleServer }
export interface BluetoothApi {
  getAvailability?(): Promise<boolean>;
  requestDevice(options: { acceptAllDevices: true; optionalServices: BluetoothUuid[] }): Promise<BleDevice>;
}
export function browserBluetooth(): BluetoothApi | undefined {
  return (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
}
export function parseBluetoothUuids(input: string): BluetoothUuid[] {
  return [...new Set(input.split(/[\s,;]+/).filter(Boolean).map(value => {
    const uuid = value.toLowerCase().replace(/^0x/, '');
    if (/^[\da-f]{4}$/.test(uuid)) return `0000${uuid}-0000-1000-8000-00805f9b34fb`;
    if (/^[\da-f]{8}$/.test(uuid)) return `${uuid}-0000-1000-8000-00805f9b34fb`;
    if (/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(uuid)) return uuid;
    throw new Error(`UUID غير صالح: ${value}`);
  }))];
}
export function encodeBleWrite(input: string, hex: boolean): Uint8Array {
  if (!hex) return new TextEncoder().encode(input);
  const value = input.replace(/\s/g, '');
  if (!value || value.length % 2 || !/^[\da-f]+$/i.test(value)) throw new Error('HEX: أدخل أزواجاً مثل 01 A0 FF');
  return Uint8Array.from(value.match(/../g) ?? [], byte => parseInt(byte, 16));
}
export function formatBleValue(value: DataView): { hex: string; text: string } {
  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return { hex: Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(' ').toUpperCase(), text: new TextDecoder().decode(bytes) };
}

/** Owns only the testing module's connection and listeners, never the attendance connection. */
export class BluetoothCentral {
  private device?: BleDevice;
  private server?: BleServer;
  private disposed = false;
  private connectionAttempt = 0;
  private subscriptions = new Map<BleCharacteristic, EventListener>();
  constructor(private onDisconnect: () => void) {}
  private disconnected = () => {
    this.clearListeners();
    this.server = undefined;
    this.onDisconnect();
  };
  private clearListeners() {
    this.subscriptions.forEach((listener, characteristic) => characteristic.removeEventListener('characteristicvaluechanged', listener));
    this.subscriptions.clear();
  }
  async connect(device: BleDevice): Promise<BleServer> {
    if (this.disposed) throw new Error('تم إغلاق اختبار البلوتوث');
    this.disconnect();
    if (!device.gatt) throw new Error('الجهاز لا يدعم اتصال GATT');
    this.device = device;
    device.addEventListener('gattserverdisconnected', this.disconnected);
    const attempt = this.connectionAttempt;
    try {
      const server = await device.gatt.connect();
      if (this.disposed || this.device !== device || attempt !== this.connectionAttempt) {
        server.disconnect();
        throw new Error('تم إلغاء الاتصال');
      }
      if (!server.connected) throw new Error('لم يتم إنشاء اتصال GATT فعلي');
      this.server = server;
      return server;
    } catch (error) {
      if (attempt === this.connectionAttempt) this.disconnect();
      throw error;
    }
  }
  get connected() { return this.server?.connected === true; }
  async subscribe(characteristic: BleCharacteristic, receive: (value: DataView) => void) {
    if (!this.connected) throw new Error('الجهاز غير متصل');
    if (this.subscriptions.has(characteristic)) return;
    const listener = () => { if (characteristic.value) receive(characteristic.value); };
    characteristic.addEventListener('characteristicvaluechanged', listener);
    this.subscriptions.set(characteristic, listener);
    try {
      await characteristic.startNotifications();
      if (!this.connected || this.disposed) {
        characteristic.removeEventListener('characteristicvaluechanged', listener);
        this.subscriptions.delete(characteristic);
        throw new Error('انقطع اتصال الجهاز');
      }
    } catch (error) {
      characteristic.removeEventListener('characteristicvaluechanged', listener);
      this.subscriptions.delete(characteristic);
      throw error;
    }
  }
  async unsubscribe(characteristic: BleCharacteristic) {
    const listener = this.subscriptions.get(characteristic);
    if (listener) characteristic.removeEventListener('characteristicvaluechanged', listener);
    this.subscriptions.delete(characteristic);
    if (this.connected) await characteristic.stopNotifications();
  }
  disconnect() {
    this.connectionAttempt++;
    this.clearListeners();
    this.device?.removeEventListener('gattserverdisconnected', this.disconnected);
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.server = undefined;
    this.device = undefined;
  }
  dispose() { this.disposed = true; this.disconnect(); }
}