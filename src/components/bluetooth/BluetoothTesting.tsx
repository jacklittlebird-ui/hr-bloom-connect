import { useEffect, useRef, useState } from 'react';
import { Bluetooth, BluetoothConnected, Cable, Download, Radio, Search, Trash2, Unplug, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { BLE_SERVICE_UUID, BLE_CHAR_UUID } from '@/lib/bleBeacon';
import { BluetoothCentral, browserBluetooth, encodeBleWrite, formatBleValue, parseBluetoothUuids, type BleCharacteristic, type BleDevice, type BleService } from '@/lib/bluetoothCentral';

type ServiceRow = { service: BleService; characteristics: BleCharacteristic[] };
type LogEntry = { id: number; time: string; source: string; text: string; hex?: string };

export default function BluetoothTesting() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const t = (arabic: string, english: string) => ar ? arabic : english;
  const api = browserBluetooth();
  const secure = window.isSecureContext;
  const [availability, setAvailability] = useState<boolean | undefined>();
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [activeId, setActiveId] = useState('');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [serviceInput, setServiceInput] = useState(BLE_SERVICE_UUID);
  const [characteristicInput, setCharacteristicInput] = useState(BLE_CHAR_UUID);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [writeInputs, setWriteInputs] = useState<Record<string, string>>({});
  const [hexMode, setHexMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const central = useRef<BluetoothCentral>();
  const mounted = useRef(false);
  const logId = useRef(0);
  const log = (source: string, text: string, hex?: string) => {
    if (!mounted.current) return;
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    setLogs(prev => [...prev.slice(-199), { id: ++logId.current, time, source, text, hex }]);
  };
  useEffect(() => {
    mounted.current = true;
    const client = new BluetoothCentral(() => {
      if (!mounted.current) return;
      setConnected(false); setServices([]); setSubscribed([]);
      log('GATT', t('انقطع اتصال الجهاز', 'Device disconnected'));
    });
    central.current = client;
    browserBluetooth()?.getAvailability?.().then(value => {
      if (mounted.current) setAvailability(value);
    }).catch(() => { /* Availability stays unknown, not a successful hardware check. */ });
    return () => { mounted.current = false; client.dispose(); };
    // The testing connection belongs to this mounted module only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = (reason: unknown) => {
    const name = reason instanceof Error ? reason.name : '';
    const detail = reason instanceof Error ? reason.message : String(reason);
    const message = name === 'NotFoundError'
      ? t('لم يتم اختيار جهاز أو لم يُعثر عليه.', 'No device selected or found.')
      : name === 'SecurityError' || name === 'NotAllowedError'
        ? t('رُفض الإذن أو منعت سياسة المتصفح البلوتوث.', 'Permission denied or Bluetooth blocked by browser policy.')
        : name === 'NetworkError'
          ? t('فشل اتصال الجهاز؛ تحقق من تشغيله وقربه وعدم انشغاله باتصال آخر.', 'Connection failed; check device power, range, and other connections.')
          : detail;
    if (mounted.current) { setError(message); log('Error', message); }
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (reason) { fail(reason); }
    finally { if (mounted.current) setBusy(false); }
  };
  // requestDevice is invoked synchronously inside the button's user gesture, before any await.
  const scan = () => {
    if (!api || !secure) return;
    let request: Promise<BleDevice>;
    try { request = api.requestDevice({ acceptAllDevices: true, optionalServices: parseBluetoothUuids(serviceInput) }); }
    catch (reason) { fail(reason); return; }
    void run(async () => {
      const device = await request;
      if (!mounted.current) return;
      setDevices(prev => prev.some(item => item.id === device.id) ? prev : [...prev, device]);
      log('BLE', `${t('تم اختيار جهاز', 'Device selected')}: ${device.name || t('بدون اسم', 'Unnamed')} (${device.id})`);
    });
  };
  const explore = async (server: Awaited<ReturnType<BluetoothCentral['connect']>>) => {
    const uuids = parseBluetoothUuids(serviceInput);
    const charUuids = parseBluetoothUuids(characteristicInput);
    const found: BleService[] = [];
    if (uuids.length) {
      for (const uuid of uuids) {
        try { found.push(await server.getPrimaryService(uuid)); }
        catch (reason) { fail(reason); }
      }
    } else found.push(...await server.getPrimaryServices());
    const rows: ServiceRow[] = [];
    for (const service of found) {
      let characteristics: BleCharacteristic[] = [];
      try { characteristics = await service.getCharacteristics(); }
      catch (reason) {
        fail(reason);
        for (const uuid of charUuids) {
          try { characteristics.push(await service.getCharacteristic(uuid)); } catch (reason) { fail(reason); }
        }
      }
      rows.push({ service, characteristics });
    }
    if (mounted.current && central.current?.connected) setServices(rows);
  };
  const connect = (device: BleDevice) => void run(async () => {
    const client = central.current;
    if (!client) return;
    setConnected(false); setServices([]); setSubscribed([]); setActiveId(device.id);
    const server = await client.connect(device);
    if (!mounted.current || !server.connected) return;
    setConnected(true);
    log('GATT', t('تم الاتصال الفعلي بالجهاز', 'Actual GATT connection established'));
    await explore(server);
  });
  const disconnect = () => {
    central.current?.disconnect(); setConnected(false); setServices([]); setSubscribed([]);
    log('GATT', t('تم فصل الجهاز', 'Device disconnected'));
  };
  const recordValue = (key: string, value: DataView) => {
    const decoded = formatBleValue(value); log(key, decoded.text, decoded.hex);
  };
  const usable = Boolean(api && secure);
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-w-0 space-y-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={connected ? 'default' : 'secondary'} className="gap-2">
          {connected ? <BluetoothConnected className="h-4 w-4" /> : <Bluetooth className="h-4 w-4" />}
          {connected ? t('متصل فعلياً', 'Connected to hardware') : t('غير متصل', 'Disconnected')}
        </Badge>
        <Badge variant="outline">{t('تجريبي • أجهزة حقيقية فقط', 'Experimental • Real hardware only')}</Badge>
      </div>
      {!usable && <p role="status" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{!secure ? t('يلزم اتصال آمن HTTPS لاستخدام البلوتوث.', 'Bluetooth requires a secure HTTPS context.') : t('Web Bluetooth غير متاح في هذا المتصفح. Safari على iPhone غير مدعوم.', 'Web Bluetooth is unavailable in this browser. iPhone Safari is not supported.')}</p>}
      <section className="space-y-3" aria-label={t('إعدادات البلوتوث', 'Bluetooth configuration')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="ble-services">{t('UUID الخدمات المسموح بها', 'Allowed service UUIDs')}</Label><Input id="ble-services" dir="ltr" value={serviceInput} disabled={busy || connected} onChange={event => setServiceInput(event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="ble-characteristics">{t('UUID الخصائص (اختياري)', 'Characteristic UUIDs (optional)')}</Label><Input id="ble-characteristics" dir="ltr" value={characteristicInput} disabled={busy || connected} onChange={event => setCharacteristicInput(event.target.value)} /></div>
        </div>
        <p className="text-xs text-muted-foreground">{t('اكتشاف الخدمات مقيد بإذن المتصفح للخدمات المحددة. الأجهزة المعروضة هي التي تختارها من نافذة المتصفح، وليست مسحاً تلقائياً لكل الأجهزة.', 'Service discovery is limited to browser-authorized UUIDs. The list contains devices selected in the browser chooser, not a background scan.')}</p>
        <Button className="gap-2" disabled={!usable || busy} onClick={scan}><Search className="h-4 w-4" />{busy ? t('جارٍ التنفيذ…', 'Working…') : t('البحث عن جهاز BLE', 'Scan for BLE device')}</Button>
      </section>
      <section className="space-y-3"><h3 className="font-semibold">{t('الأجهزة المختارة', 'Selected devices')}</h3>
        {!devices.length && <p className="text-sm text-muted-foreground">{t('لم يتم اختيار أي جهاز.', 'No device has been selected.')}</p>}
        {devices.map(device => <div key={device.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="min-w-0 flex-1"><p className="font-medium break-words">{device.name || t('جهاز بدون اسم', 'Unnamed device')}</p><p dir="ltr" className="break-all font-mono text-xs text-muted-foreground">{device.id}</p></div>
          {connected && activeId === device.id ? <Button variant="outline" disabled={busy} className="gap-2" onClick={disconnect}><Unplug className="h-4 w-4" />{t('فصل', 'Disconnect')}</Button> : <Button variant="outline" disabled={busy || !usable} className="gap-2" onClick={() => connect(device)}><Cable className="h-4 w-4" />{t('اتصال', 'Connect')}</Button>}
        </div>)}
      </section>
      <section className="space-y-3"><h3 className="font-semibold">{t('خدمات وخصائص GATT', 'GATT services & characteristics')}</h3>
        {!services.length && <p className="text-sm text-muted-foreground">{t('لا توجد خدمات مكتشفة.', 'No services discovered.')}</p>}
        <div className="flex items-center gap-2"><Switch id="ble-hex" checked={hexMode} onCheckedChange={setHexMode} /><Label htmlFor="ble-hex">{t('الكتابة بصيغة HEX بدلاً من UTF-8', 'Write HEX instead of UTF-8')}</Label></div>
        {services.map(({ service, characteristics }) => <div key={service.uuid} className="space-y-3 border-t border-border pt-3">
          <p dir="ltr" className="break-all font-mono text-sm text-primary">{service.uuid}</p>
          {!characteristics.length && <p className="text-sm text-muted-foreground">{t('لا توجد خصائص متاحة.', 'No characteristics available.')}</p>}
          {characteristics.map(characteristic => {
            const key = `${service.uuid}/${characteristic.uuid}`;
            const props = characteristic.properties;
            const listening = subscribed.includes(key);
            return <div key={key} className="space-y-2 rounded-md border border-border p-3">
              <p dir="ltr" className="break-all font-mono text-xs">{characteristic.uuid}</p>
              <p dir="ltr" className="text-xs text-muted-foreground">{Object.entries(props).filter(([, value]) => value === true).map(([name]) => name).join(' · ')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" disabled={!connected || busy || !props.read} onClick={() => void run(async () => recordValue(key, await characteristic.readValue()))}><Download className="h-4 w-4" />{t('قراءة', 'Read')}</Button>
                <Button variant={listening ? 'default' : 'outline'} size="sm" className="gap-2" disabled={!connected || busy || !(props.notify || props.indicate)} onClick={() => void run(async () => {
                  const client = central.current;
                  if (!client) return;
                  if (listening) await client.unsubscribe(characteristic);
                  else await client.subscribe(characteristic, value => recordValue(key, value));
                  if (mounted.current && client.connected) setSubscribed(prev => listening ? prev.filter(item => item !== key) : [...prev, key]);
                })}><Radio className="h-4 w-4" />{listening ? t('إيقاف الإشعارات', 'Stop notifications') : t('اشتراك بالإشعارات', 'Subscribe')}</Button>
              </div>
              {(props.write || props.writeWithoutResponse) && <div className="flex flex-wrap gap-2">
                <Input className="min-w-0 flex-1 basis-40" dir="ltr" aria-label={`${t('قيمة الكتابة', 'Write value')} ${characteristic.uuid}`} value={writeInputs[key] || ''} onChange={event => setWriteInputs(prev => ({ ...prev, [key]: event.target.value }))} />
                <Button size="sm" variant="outline" className="gap-2" disabled={!connected || busy || !writeInputs[key]} onClick={() => void run(async () => {
                  const value = encodeBleWrite(writeInputs[key] || '', hexMode);
                  if (props.write) await characteristic.writeValueWithResponse(value);
                  else await characteristic.writeValueWithoutResponse(value);
                  log(key, t('تمت كتابة البيانات', 'Data written'));
                })}><Upload className="h-4 w-4" />{t('كتابة', 'Write')}</Button>
              </div>}
            </div>;
          })}
        </div>)}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{t('سجل البيانات المباشرة', 'Live data log')}</h3><Button variant="ghost" size="sm" className="gap-2" onClick={() => setLogs([])}><Trash2 className="h-4 w-4" />{t('مسح السجل', 'Clear log')}</Button></div>
        <div role="log" aria-live="polite" className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
          {!logs.length ? <p className="text-muted-foreground">{t('لا توجد بيانات بعد.', 'No data yet.')}</p> : logs.map(entry => <div key={entry.id} className="space-y-1 border-b border-border py-2 last:border-0"><p dir="ltr" className="break-all font-mono text-muted-foreground">{entry.time} · {entry.source}</p><p className="whitespace-pre-wrap break-words">{entry.text}</p>{entry.hex !== undefined && <p dir="ltr" className="break-all font-mono">HEX: {entry.hex || '—'}</p>}</div>)}
        </div>
      </section>
      <section className="space-y-2 border-t border-border pt-4"><h3 className="font-semibold">{t('التشخيص', 'Diagnostics')}</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Secure context</dt><dd>{secure ? 'HTTPS / localhost ✓' : 'No'}</dd></div>
          <div><dt className="text-muted-foreground">Web Bluetooth API</dt><dd>{api ? t('متاحة', 'Available') : t('غير متاحة', 'Unavailable')}</dd></div>
          <div><dt className="text-muted-foreground">{t('توفر محول البلوتوث', 'Bluetooth adapter availability')}</dt><dd>{availability === undefined ? t('غير مؤكد', 'Unknown') : availability ? t('متاح حسب المتصفح', 'Available according to browser') : t('غير متاح حسب المتصفح', 'Unavailable according to browser')}</dd></div>
          <div><dt className="text-muted-foreground">GATT</dt><dd>{connected ? t('متصل', 'Connected') : busy ? t('جارٍ التنفيذ', 'Working') : t('غير متصل', 'Disconnected')}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">User agent</dt><dd dir="ltr" className="break-all text-xs">{navigator.userAgent}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">{t('آخر خطأ', 'Last error')}</dt><dd role={error ? 'alert' : undefined} className="whitespace-pre-wrap break-words text-destructive">{error || '—'}</dd></div>
        </dl>
      </section>
    </div>
  );
}