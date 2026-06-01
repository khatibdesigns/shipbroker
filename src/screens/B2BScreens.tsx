import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { colors, radius } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import {
  Screen, Body, Row, Txt, Card, Button, Field, Seg, Chip, AppBar, LangToggle, Progress, Sheet, BottomNav, IconButton, PillCount, Link, Stepper,
} from '../components/ui';
import { Select, Option } from '../components/Select';
import { PlaceField, RouteMap } from '../components/PlaceField';
import { useShipments } from '../lib/shipments';
import { ShipMode } from '../lib/ai';
import { Icon, IconName } from '../components/Icon';

function WizardBar({ title, step }: { title: string; step?: number }) {
  const nav = useNav();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
      <Row justify="space-between" style={{ marginBottom: 12 }}>
        <IconButton name="back" flip onPress={nav.canGoBack ? nav.pop : undefined} />
        <Txt size={16} weight="bold" align="center" style={{ flex: 1 }}>
          {title}
        </Txt>
        <LangToggle />
      </Row>
      {step != null && (
        <View style={{ marginBottom: 18 }}>
          <Progress step={step} total={5} />
        </View>
      )}
    </View>
  );
}

function FooterBar({ left, right, onLeft, onRight }: { left: string; right: string; onLeft?: () => void; onRight?: () => void }) {
  return (
    <Row gap={10} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Button label={left} variant="secondary" style={{ flex: 1 }} onPress={onLeft} />
      <Button label={right} style={{ flex: 2 }} onPress={onRight} />
    </Row>
  );
}

// ---- Create Shipment wizard: 5 steps, the detail step adapts to the service ----
type WizDraft = {
  service?: string;
  subtype?: string;
  incoterms?: string;
  pickup?: string;
  destination?: string;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  timing?: string;
  timeWindow?: string;
  // cargo (air / sea / road / winch / freight forwarder)
  pieces?: number;
  weightPer?: number; // kg per piece
  dimW?: string; // cm
  dimH?: string;
  dimD?: string;
  // marine
  lengthM?: string;
  grossTonnage?: string;
  // warehousing
  pallets?: string;
  durationWeeks?: string;
  notes?: string;
};

const SERVICE_MODE: Record<string, ShipMode> = {
  air: 'air', sea: 'sea', road: 'road', winch: 'road', marine: 'sea', warehousing: 'road', freight_fwd: 'sea',
};

// Per-mode weight rules (per piece). Air is courier-style (≤20 kg, 0.5 steps);
// road & sea move in larger 10/25 kg industry increments.
const WEIGHT_RULES: Record<ShipMode, { min: number; step: number; max: number }> = {
  air: { min: 0.5, step: 0.5, max: 20 },
  road: { min: 10, step: 10, max: 30000 },
  sea: { min: 25, step: 25, max: 60000 },
};

export function WizardStep1() {
  const { t } = useI18n();
  const nav = useNav();
  const { create } = useShipments();
  const [step, setStep] = useState(1);
  const [d, setD] = useState<WizDraft>({});
  const [err, setErr] = useState('');
  const set = (k: keyof WizDraft, v: any) => setD((p) => ({ ...p, [k]: v }));
  const round = (v: number, p = 2) => {
    const f = Math.pow(10, p);
    return Math.round(v * f) / f;
  };

  const SERVICES: Option[] = [
    { key: 'air', label: t('Air Freight', 'شحن جوي') },
    { key: 'sea', label: t('Sea Freight', 'شحن بحري') },
    { key: 'road', label: t('Road Freight', 'شحن بري') },
    { key: 'winch', label: t('Winch', 'ونش') },
    { key: 'marine', label: t('Marine', 'بحري') },
    { key: 'warehousing', label: t('Warehousing', 'تخزين') },
    { key: 'freight_fwd', label: t('Freight Forwarder', 'وسيط شحن') },
  ];
  const SUBTYPES: Record<string, Option[]> = {
    air: [{ key: 'docs', label: t('Documents', 'مستندات') }, { key: 'goods', label: t('Goods', 'بضائع') }, { key: 'express', label: t('Express', 'سريع') }],
    sea: [{ key: 'fcl20', label: "FCL 20'" }, { key: 'fcl40', label: "FCL 40'" }, { key: 'fcl40hc', label: 'FCL 40HC' }, { key: 'lcl', label: 'LCL' }, { key: 'roro', label: t('Ro-Ro (Vehicles)', 'رورو (مركبات)') }],
    road: [{ key: 'flatbed', label: t('Flatbed', 'مسطّحة') }, { key: 'lowbed', label: t('Lowbed', 'منخفضة') }, { key: 'reefer', label: t('Refrigerated', 'مبرّدة') }, { key: 'carcarrier', label: t('Car Carrier', 'نقل سيارات') }, { key: 'general', label: t('General Cargo', 'بضائع عامة') }],
    winch: [{ key: 'fulldown', label: t('Full-Down Flatbed', 'مسطّح كامل') }, { key: 'hydraulic', label: t('Hydraulic Lift', 'رافعة هيدروليكية') }, { key: 'standard', label: t('Standard Tow', 'سحب عادي') }, { key: 'hook', label: t('Hook / Wheel-Lift', 'رافعة عجلات') }],
    marine: [{ key: 'yacht', label: t('Yacht delivery', 'تسليم يخت') }, { key: 'boat', label: t('Boat transport', 'نقل قارب') }],
    warehousing: [{ key: 'ambient', label: t('Ambient', 'عادي') }, { key: 'cold', label: t('Cold storage', 'تبريد') }, { key: 'bonded', label: t('Bonded', 'جمركي') }],
    freight_fwd: [{ key: 'customs', label: t('Customs clearance', 'تخليص جمركي') }, { key: 'd2d', label: t('Door-to-door', 'من الباب للباب') }, { key: 'project', label: t('Project cargo', 'شحنات مشاريع') }],
  };
  const INCOTERMS: Option[] = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP'].map((k) => ({ key: k, label: k }));
  const TIMING: Option[] = [
    { key: 'asap', label: t('ASAP', 'في أقرب وقت') }, { key: 'tomorrow', label: t('Tomorrow', 'غداً') },
    { key: '3days', label: t('In 3 days', 'خلال 3 أيام') }, { key: 'week', label: t('Next week', 'الأسبوع القادم') }, { key: 'flex', label: t('Flexible', 'مرن') },
  ];
  const WINDOWS: Option[] = [
    { key: 'm', label: '09:00–13:00' }, { key: 'a', label: '13:00–17:00' }, { key: 'e', label: '17:00–21:00' }, { key: 'flex', label: t('Flexible', 'مرن') },
  ];

  const labelOf = (opts: Option[], key?: string) => opts.find((o) => o.key === key)?.label || '—';
  const serviceLabel = labelOf(SERVICES, d.service);
  const subtypeLabel = d.service ? labelOf(SUBTYPES[d.service] || [], d.subtype) : '—';

  // cargo computations (total weight + CBM from pieces × per-piece weight/dims)
  const mode: ShipMode = (d.service && SERVICE_MODE[d.service]) || 'road';
  const wr = WEIGHT_RULES[mode];
  const isCargo = d.service !== 'marine' && d.service !== 'warehousing';
  const pieces = d.pieces ?? 1;
  const weightPer = d.weightPer ?? wr.min;
  const W = parseFloat(d.dimW || '');
  const H = parseFloat(d.dimH || '');
  const Dp = parseFloat(d.dimD || '');
  const hasDims = !!(W && H && Dp);
  const totalWeight = round(weightPer * pieces);
  const totalCbm = hasDims ? round((W * H * Dp) / 1e6 * pieces, 3) : 0;

  const next = () => {
    setErr('');
    if (step === 1 && !d.service) return setErr(t('Please choose a service.', 'يرجى اختيار خدمة.'));
    if (step === 2 && (!d.pickup?.trim() || !d.destination?.trim())) return setErr(t('Enter pickup and destination.', 'أدخل الاستلام والوجهة.'));
    setStep((s) => Math.min(5, s + 1));
  };
  const back = () => {
    setErr('');
    if (step === 1) nav.pop();
    else setStep((s) => s - 1);
  };

  const submit = async () => {
    const weightKg = isCargo ? totalWeight : d.grossTonnage ? parseFloat(d.grossTonnage) * 1000 : undefined;
    const draft = {
      item: subtypeLabel !== '—' ? `${serviceLabel} · ${subtypeLabel}` : serviceLabel,
      category: d.service,
      fromCity: d.pickup,
      toCity: d.destination,
      mode,
      weightKg: weightKg && !isNaN(weightKg) ? weightKg : undefined,
      pieces: isCargo ? pieces : undefined,
      cbm: totalCbm || undefined,
      dims: hasDims ? { w: W, h: H, d: Dp } : undefined,
      timing: labelOf(TIMING, d.timing) !== '—' ? labelOf(TIMING, d.timing) : undefined,
      notes: d.notes,
    };
    const id = await create(draft);
    nav.replace('Offers', { shipmentId: id, draft });
  };

  const STEP_TITLES = [
    t('Service', 'الخدمة'),
    t('Pickup & Destination', 'الاستلام والوجهة'),
    t('Schedule', 'الجدولة'),
    t('Details', 'التفاصيل'),
    t('Review', 'المراجعة'),
  ];

  // service-specific detail fields for step 4
  const renderDetails = () => {
    if (d.service === 'marine') {
      return (
        <Row gap={12}>
          <View style={{ flex: 1 }}><Field label={t('Boat length (m)', 'طول القارب (م)')} ph="e.g. 24" value={d.lengthM} onChangeText={(v) => set('lengthM', v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Field label={t('Gross tonnage', 'الحمولة الإجمالية')} ph="e.g. 100" value={d.grossTonnage} onChangeText={(v) => set('grossTonnage', v)} keyboardType="numeric" /></View>
        </Row>
      );
    }
    if (d.service === 'warehousing') {
      return (
        <Row gap={12}>
          <View style={{ flex: 1 }}><Field label={t('Pallets', 'عدد المنصات')} ph="e.g. 5" value={d.pallets} onChangeText={(v) => set('pallets', v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Field label={t('Duration (weeks)', 'المدة (أسابيع)')} ph="e.g. 4" value={d.durationWeeks} onChangeText={(v) => set('durationWeeks', v)} keyboardType="numeric" /></View>
        </Row>
      );
    }
    // cargo: pieces × weight/piece (mode-stepped) + dimensions → live total weight + CBM
    const modeName = mode === 'sea' ? t('sea', 'بحر') : mode === 'air' ? t('air', 'جو') : t('road', 'بر');
    return (
      <>
        <Stepper label={t('Pieces', 'عدد القطع')} value={pieces} onChange={(v) => set('pieces', v)} step={1} min={1} max={999} />
        <Stepper
          label={t(`Weight per piece · ${modeName}`, `الوزن لكل قطعة · ${modeName}`)}
          value={weightPer}
          onChange={(v) => set('weightPer', v)}
          step={wr.step}
          min={wr.min}
          max={wr.max}
          unit="kg"
        />
        <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
          {t('Dimensions per piece (cm)', 'الأبعاد لكل قطعة (سم)')}
        </Txt>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Field label={t('Width', 'العرض')} ph="W" value={d.dimW} onChangeText={(v) => set('dimW', v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Field label={t('Height', 'الارتفاع')} ph="H" value={d.dimH} onChangeText={(v) => set('dimH', v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Field label={t('Depth', 'العمق')} ph="D" value={d.dimD} onChangeText={(v) => set('dimD', v)} keyboardType="numeric" /></View>
        </Row>
        <Card muted style={{ padding: 14, marginTop: 2 }}>
          <Row justify="space-between">
            <Row gap={8}>
              <Icon name="box" size={18} color={colors.brandTeal} />
              <Txt size={14} weight="bold">{t('Total weight', 'الوزن الإجمالي')}</Txt>
            </Row>
            <Txt size={15} weight="extrabold" tabular>{totalWeight.toLocaleString()} kg</Txt>
          </Row>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <Row justify="space-between">
            <Row gap={8}>
              <Icon name="cube" size={18} color={colors.brandTeal} />
              <Txt size={14} weight="bold">{t('Total volume', 'الحجم الإجمالي')}</Txt>
            </Row>
            <Txt size={15} weight="extrabold" tabular>{hasDims ? `${totalCbm} m³` : t('add dimensions', 'أضف الأبعاد')}</Txt>
          </Row>
        </Card>
      </>
    );
  };

  const SummaryLine = ({ label, val }: { label: string; val: string }) => (
    <Row justify="space-between" style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Txt size={14} weight="semibold" color={colors.textSecondary}>{label}</Txt>
      <Txt size={14} weight="bold" style={{ maxWidth: '60%' }} numberOfLines={1}>{val}</Txt>
    </Row>
  );

  return (
    <Screen>
      <WizardBar title={t('Create Shipment', 'إنشاء شحنة')} step={step} />
      <Body>
        <Txt size={13} weight="bold" color={colors.textSecondary} style={{ marginBottom: 16 }}>
          {t(`Step ${step} of 5`, `الخطوة ${step} من 5`)} · {STEP_TITLES[step - 1]}
        </Txt>

        {step === 1 && (
          <>
            <Select label={t('Service', 'الخدمة')} placeholder={t('Select a service', 'اختر خدمة')} value={d.service} options={SERVICES} onChange={(v) => { set('service', v); setD((p) => ({ ...p, service: v, subtype: undefined })); }} />
            {d.service && <Select label={t('Subtype', 'النوع الفرعي')} placeholder={t('Select subtype', 'اختر النوع')} value={d.subtype} options={SUBTYPES[d.service] || []} onChange={(v) => set('subtype', v)} />}
            <Select label={t('Incoterms (optional)', 'شروط التجارة (اختياري)')} placeholder="EXW, FOB, CIF…" value={d.incoterms} options={INCOTERMS} onChange={(v) => set('incoterms', v)} />
          </>
        )}

        {step === 2 && (
          <>
            <PlaceField
              label={t('Pickup city / address', 'مدينة / عنوان الاستلام')}
              ph={t('Search a place…', 'ابحث عن مكان…')}
              icon="pin"
              value={d.pickup}
              onChangeText={(v) => setD((p) => ({ ...p, pickup: v, pickupLat: undefined, pickupLng: undefined }))}
              onSelect={({ description, coords }) => setD((p) => ({ ...p, pickup: description, pickupLat: coords?.lat, pickupLng: coords?.lng }))}
            />
            <PlaceField
              label={t('Destination city / address', 'مدينة / عنوان الوجهة')}
              ph={t('Search a place…', 'ابحث عن مكان…')}
              icon="location"
              value={d.destination}
              onChangeText={(v) => setD((p) => ({ ...p, destination: v, destLat: undefined, destLng: undefined }))}
              onSelect={({ description, coords }) => setD((p) => ({ ...p, destination: description, destLat: coords?.lat, destLng: coords?.lng }))}
            />
            <RouteMap
              from={d.pickupLat != null ? { lat: d.pickupLat, lng: d.pickupLng! } : null}
              to={d.destLat != null ? { lat: d.destLat, lng: d.destLng! } : null}
              style={{ marginBottom: 8 }}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Select label={t('When', 'متى')} placeholder={t('Select timing', 'اختر التوقيت')} value={d.timing} options={TIMING} onChange={(v) => set('timing', v)} icon="clock" />
            <Select label={t('Time window', 'الفترة')} placeholder={t('Select a window', 'اختر فترة')} value={d.timeWindow} options={WINDOWS} onChange={(v) => set('timeWindow', v)} />
          </>
        )}

        {step === 4 && (
          <>
            <Txt size={13.5} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 14 }}>
              {serviceLabel} {subtypeLabel !== '—' ? `· ${subtypeLabel}` : ''}
            </Txt>
            {renderDetails()}
            <Field label={t('Notes (optional)', 'ملاحظات (اختياري)')} ph={t('Anything we should know…', 'أي شيء يجب أن نعرفه…')} area value={d.notes} onChangeText={(v) => set('notes', v)} />
          </>
        )}

        {step === 5 && (
          <Card style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <SummaryLine label={t('Service', 'الخدمة')} val={serviceLabel} />
            {subtypeLabel !== '—' && <SummaryLine label={t('Subtype', 'النوع')} val={subtypeLabel} />}
            {d.incoterms && <SummaryLine label={t('Incoterms', 'شروط التجارة')} val={d.incoterms} />}
            <SummaryLine label={t('Pickup', 'الاستلام')} val={d.pickup || '—'} />
            <SummaryLine label={t('Destination', 'الوجهة')} val={d.destination || '—'} />
            <SummaryLine label={t('When', 'التوقيت')} val={labelOf(TIMING, d.timing)} />
            <SummaryLine label={t('Time window', 'الفترة')} val={labelOf(WINDOWS, d.timeWindow)} />
            {isCargo ? (
              <>
                <SummaryLine label={t('Pieces', 'عدد القطع')} val={String(pieces)} />
                <SummaryLine label={t('Total weight', 'الوزن الإجمالي')} val={`${totalWeight.toLocaleString()} kg`} />
                {hasDims && <SummaryLine label={t('Volume', 'الحجم')} val={`${totalCbm} m³`} />}
                {hasDims && <SummaryLine label={t('Dimensions', 'الأبعاد')} val={`${W}×${H}×${Dp} cm`} />}
              </>
            ) : d.service === 'marine' ? (
              <>
                {!!d.lengthM && <SummaryLine label={t('Boat length', 'طول القارب')} val={`${d.lengthM} m`} />}
                {!!d.grossTonnage && <SummaryLine label={t('Gross tonnage', 'الحمولة')} val={`${d.grossTonnage} GT`} />}
              </>
            ) : (
              <>
                {!!d.pallets && <SummaryLine label={t('Pallets', 'المنصات')} val={d.pallets} />}
                {!!d.durationWeeks && <SummaryLine label={t('Duration', 'المدة')} val={`${d.durationWeeks} wk`} />}
              </>
            )}
            {!!d.notes && <SummaryLine label={t('Notes', 'ملاحظات')} val={d.notes} />}
          </Card>
        )}

        {!!err && (
          <Txt size={13} weight="semibold" color={colors.error} style={{ marginTop: 8 }}>
            {err}
          </Txt>
        )}
      </Body>
      <FooterBar
        left={step === 1 ? t('Cancel', 'إلغاء') : t('Back', 'رجوع')}
        right={step === 5 ? t('Submit & get offers', 'إرسال وعرض العروض') : t('Next', 'التالي')}
        onLeft={back}
        onRight={step === 5 ? submit : next}
      />
    </Screen>
  );
}

export function ServicesGrid() {
  const { t } = useI18n();
  const nav = useNav();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState('air');
  const items: { k: string; icon: IconName; label: string; sub: string }[] = [
    { k: 'air', icon: 'plane', label: t('Air Freight', 'شحن جوي'), sub: t('Docs & Goods', 'مستندات وبضائع') },
    { k: 'sea', icon: 'ship', label: t('Sea Freight', 'شحن بحري'), sub: 'FCL / LCL' },
    { k: 'road', icon: 'truck', label: t('Road Freight', 'شحن بري'), sub: t('Trucking', 'شاحنات') },
    { k: 'winch', icon: 'car', label: t('Winch', 'ونش'), sub: t('Tow services', 'خدمات السحب') },
    { k: 'ware', icon: 'ware', label: t('Warehousing', 'تخزين'), sub: t('Storage', 'تخزين') },
    { k: 'vehicles', icon: 'boat', label: t('Vehicles & Leisure', 'مركبات وترفيه'), sub: t('Cars + Boats', 'سيارات وقوارب') },
    { k: 'ff', icon: 'doc', label: t('Freight Fwd.', 'وسيط شحن'), sub: t('Broker', 'وسيط') },
    { k: 'marine', icon: 'user', label: t('Marine Captain', 'ربّان بحري'), sub: t('Certified', 'معتمد') },
  ];
  const filters = [
    { key: 'all', label: t('All', 'الكل') },
    { key: 'air', label: 'Air' },
    { key: 'sea', label: 'Sea' },
    { key: 'road', label: 'Road' },
  ];
  return (
    <Screen>
      <AppBar title={t('Services', 'الخدمات')} />
      <Body>
        <Field ph={t('Search services…', 'ابحث في الخدمات…')} icon="search" />
        <Row gap={8} style={{ marginBottom: 16 }}>
          {filters.map((f) => (
            <Chip key={f.key} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11 }}>
          {items.map((it) => {
            const on = selected === it.k;
            return (
              <Card key={it.k} flat style={{ width: '47.5%', padding: 14 }}>
                <Row justify="space-between" style={{ marginBottom: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={it.icon} size={21} color={colors.brandTeal} />
                  </View>
                  <Pressable onPress={() => setSelected(it.k)} style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 0 : 2, borderColor: colors.border, backgroundColor: on ? colors.brandTeal : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Icon name="check" size={12} color="#fff" sw={2.6} />}
                  </Pressable>
                </Row>
                <Txt size={14.5} weight="bold">
                  {it.label}
                </Txt>
                <Txt size={12} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 12 }}>
                  {it.sub}
                </Txt>
                <Button label={t('Request', 'طلب')} variant="ghost" size="sm" onPress={() => nav.push('QuickRFQ')} />
              </Card>
            );
          })}
        </View>
      </Body>
      <BottomNav />
    </Screen>
  );
}

export function QuickRFQ() {
  const { t } = useI18n();
  const nav = useNav();
  const [type, setType] = useState('docs');
  return (
    <Screen>
      <AppBar title={t('Services', 'الخدمات')} />
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <Card muted style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={13} weight="semibold" color={colors.textTertiary}>
            {t('Services grid', 'شبكة الخدمات')}
          </Txt>
        </Card>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,24,31,0.35)' }} />
      <Sheet>
        <Txt size={18} weight="extrabold" align="center" style={{ marginBottom: 18 }}>
          {t('Quick RFQ — Air Freight', 'طلب سريع — شحن جوي')}
        </Txt>
        <View style={{ marginBottom: 16 }}>
          <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
            {t('Shipment type', 'نوع الشحنة')}
          </Txt>
          <Seg value={type} onChange={setType} options={[{ key: 'docs', label: t('Documents', 'مستندات') }, { key: 'goods', label: t('Goods', 'بضائع') }]} />
        </View>
        <Row gap={12}>
          <View style={{ flex: 1 }}>
            <Field label={t('Weight (kg)', 'الوزن (كجم)')} ph="e.g. 12.5" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('Destination country', 'دولة الوجهة')} ph={t('Select…', 'اختر…')} select />
          </View>
        </Row>
        <Field label={t('Ready date', 'تاريخ الجاهزية')} ph={t('Pick a date', 'اختر التاريخ')} icon="clock" />
        <Button label={t('Send Request', 'إرسال الطلب')} size="lg" onPress={() => { nav.pop(); nav.push('RFQCart'); }} />
        <Link label={t('Advanced details', 'تفاصيل متقدمة')} style={{ marginTop: 10 }} onPress={() => { nav.pop(); nav.push('WizardStep1'); }} />
      </Sheet>
    </Screen>
  );
}

export function ServicesAdd() {
  const { t } = useI18n();
  const nav = useNav();
  const items: { icon: IconName; label: string }[] = [
    { icon: 'ship', label: t('Sea FCL', 'بحري FCL') },
    { icon: 'truck', label: t('Road Flatbed', 'بري مسطّح') },
    { icon: 'ware', label: t('Warehousing', 'تخزين') },
  ];
  const [count, setCount] = useState(2);
  return (
    <Screen>
      <Row gap={12} style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
        {nav.canGoBack ? <IconButton name="back" flip onPress={nav.pop} /> : null}
        <Txt size={18} weight="bold" align="center" style={{ flex: 1 }}>
          {t('Services', 'الخدمات')}
        </Txt>
        <Row gap={12}>
          <LangToggle />
          <Pressable onPress={() => nav.push('RFQCart')} style={{ position: 'relative' }}>
            <IconButton name="list" size={18} onPress={() => nav.push('RFQCart')} />
            <View style={{ position: 'absolute', top: -6, right: -6 }}>
              <PillCount n={count} />
            </View>
          </Pressable>
        </Row>
      </Row>
      <Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11 }}>
          {items.map((it) => (
            <Card key={it.label} flat style={{ width: '47.5%', padding: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name={it.icon} size={21} color={colors.brandTeal} />
              </View>
              <Txt size={14.5} weight="bold" style={{ marginBottom: 12 }}>
                {it.label}
              </Txt>
              <Button label={t('Add to RFQ', 'أضف للطلب')} variant="ghost" size="sm" icon="plus" iconColor={colors.textPrimary} onPress={() => setCount((c) => c + 1)} />
            </Card>
          ))}
        </View>
      </Body>
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <Card flat style={{ backgroundColor: colors.textPrimary, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: 'transparent' }}>
          <Icon name="check" size={18} color={colors.brandMint} sw={2.4} />
          <Txt size={14} weight="bold" color="#fff">
            {t('Added to RFQ', 'أُضيف للطلب')}
          </Txt>
        </Card>
      </View>
      <BottomNav />
    </Screen>
  );
}

export function RFQCart() {
  const { t } = useI18n();
  const nav = useNav();
  const items: { label: string; sub: string; icon: IconName }[] = [
    { label: t('Sea FCL (40HC)', 'بحري FCL (40HC)'), sub: t('Port to Port', 'ميناء إلى ميناء'), icon: 'ship' },
    { label: t('Road Flatbed', 'بري مسطّح'), sub: t('Local pickup', 'استلام محلي'), icon: 'truck' },
    { label: t('Warehousing', 'تخزين'), sub: t('Ambient', 'تخزين عادي'), icon: 'ware' },
  ];
  return (
    <Screen>
      <AppBar title={t('RFQ Cart (3)', 'سلة الطلب (3)')} />
      <Body>
        <View style={{ gap: 11, marginBottom: 14 }}>
          {items.map((it) => (
            <Card key={it.label} flat style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={it.icon} size={21} color={colors.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="bold">
                  {it.label}
                </Txt>
                <Txt size={12.5} weight="semibold" color={colors.textSecondary}>
                  {it.sub}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Link label={t('Edit', 'تعديل')} brand style={{ padding: 0 }} />
                <Link label={t('Remove', 'حذف')} color={colors.error} style={{ padding: 0 }} />
              </View>
            </Card>
          ))}
        </View>
        <Card muted style={{ padding: 15, marginBottom: 16 }}>
          <Row gap={8} style={{ marginBottom: 6 }}>
            <Icon name="clock" size={16} color={colors.textSecondary} />
            <Txt size={14} weight="bold">
              {t('Summary', 'الملخّص')}
            </Txt>
          </Row>
          <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ lineHeight: 20 }}>
            {t('Tentative timeline & combined RFQ across 3 services. Companies will quote a bundled price.', 'جدول مبدئي وطلب مجمّع عبر 3 خدمات. ستقدّم الشركات سعراً موحّداً.')}
          </Txt>
        </Card>
        <Button label={t('Submit Combined RFQ', 'إرسال الطلب المجمّع')} size="lg" onPress={() => { nav.popToRoot(); nav.switchTab('offers'); }} />
        <Link label={t('Add more services', 'أضف خدمات أخرى')} brand icon="plus" style={{ marginTop: 12 }} onPress={() => nav.push('ServicesAdd')} />
      </Body>
    </Screen>
  );
}
