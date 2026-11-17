import { describe, expect, it, vi } from 'vitest';
import { BluetoothCentral, encodeBleWrite, formatBleValue, parseBluetoothUuids, type BleCharacteristic, type BleDevice, type BleServer } from '@/lib/bluetoothCentral';

// Test-only GATT doubles; never used or exposed by the application's hardware interface.
function deviceFixture(connectedAfterConnect = true) {
  const server: BleServer = {
    connected: false,
    connect: vi.fn(async () => { server.connected = connectedAfterConnect; return server; }),
    disconnect: vi.fn(() => { server.connected = false; }),
    getPrimaryServices: vi.fn(async () => []),
    getPrimaryService: vi.fn(),
  };
  const device = Object.assign(new EventTarget(), { id: 'unit-test', gatt: server }) as BleDevice;
  return { device, server };
}
function characteristicFixture() {
  return Object.assign(new EventTarget(), {
    uuid: 'unit-characteristic', value: new DataView(Uint8Array.of(65).buffer),
    properties: { read: true, write: true, writeWithoutResponse: false, notify: true, indicate: false },
    readValue: vi.fn(), writeValueWithResponse: vi.fn(), writeValueWithoutResponse: vi.fn(),
    startNotifications: vi.fn(async function (this: BleCharacteristic) { return this; }),
    stopNotifications: vi.fn(async function (this: BleCharacteristic) { return this; }),
  }) as BleCharacteristic;
}
describe('Bluetooth Central hardware state and cleanup', () => {
  it('never claims connection success when GATT is not connected', async () => {
    const central = new BluetoothCentral(vi.fn());
    const { device } = deviceFixture(false);
    await expect(central.connect(device)).rejects.toThrow('لم يتم إنشاء اتصال GATT فعلي');
    expect(central.connected).toBe(false);
    central.dispose();
  });
  it('disconnects and removes notification listeners on disposal', async () => {
    const central = new BluetoothCentral(vi.fn());
    const { device, server } = deviceFixture();
    await central.connect(device);
    const characteristic = characteristicFixture();
    const receive = vi.fn();
    await central.subscribe(characteristic, receive);
    characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
    expect(receive).toHaveBeenCalledTimes(1);
    central.dispose();
    characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
    expect(receive).toHaveBeenCalledTimes(1);
    expect(server.disconnect).toHaveBeenCalledTimes(1);
    expect(central.connected).toBe(false);
  });
  it('updates state and drops subscriptions on unexpected device disconnection', async () => {
    const disconnected = vi.fn();
    const central = new BluetoothCentral(disconnected);
    const { device, server } = deviceFixture();
    await central.connect(device);
    const characteristic = characteristicFixture();
    const receive = vi.fn();
    await central.subscribe(characteristic, receive);
    server.connected = false;
    device.dispatchEvent(new Event('gattserverdisconnected'));
    characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(receive).not.toHaveBeenCalled();
    expect(central.connected).toBe(false);
    central.dispose();
  });
  it('disconnects a late connection after the module has closed', async () => {
    const central = new BluetoothCentral(vi.fn());
    const { device, server } = deviceFixture();
    let finish: ((value: BleServer) => void) | undefined;
    server.connect = () => new Promise(resolve => { finish = resolve; });
    const pending = central.connect(device);
    central.dispose();
    server.connected = true;
    finish?.(server);
    await expect(pending).rejects.toThrow('تم إلغاء الاتصال');
    expect(server.connected).toBe(false);
  });
});
describe('BLE data encoding', () => {
  it('normalizes configurable UUIDs and rejects invalid UUIDs', () => {
    expect(parseBluetoothUuids('180F, 0x180f')).toEqual(['0000180f-0000-1000-8000-00805f9b34fb']);
    expect(() => parseBluetoothUuids('not-a-uuid')).toThrow();
  });
  it('encodes HEX writes and rejects partial or non-hex bytes', () => {
    expect([...encodeBleWrite('01 A0 FF', true)]).toEqual([1, 160, 255]);
    expect(() => encodeBleWrite('A', true)).toThrow();
    expect(() => encodeBleWrite('GG', true)).toThrow();
  });
  it('decodes only the DataView slice and supports real UTF-8 bytes', () => {
    expect(formatBleValue(new DataView(Uint8Array.of(0, 65, 66, 0).buffer, 1, 2))).toEqual({ text: 'AB', hex: '41 42' });
    expect(new TextDecoder().decode(encodeBleWrite('اختبار', false))).toBe('اختبار');
  });
});