import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { colors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useShipments, statusLabel, Shipment } from '../lib/shipments';
import {
  Screen, Body, Row, Txt, Card, Button, Badge, ModeBadge, Rating, Avatar, Chip, BottomNav, AppBar, LangToggle, Seg, MapRoute, Att, RouteArrow, IconButton,
} from '../components/ui';
import { Icon, IconName, Star } from '../components/Icon';
import { useCatalog } from '../lib/catalog';
import { PackageCard, CarrierRow } from './shared';

function pkgIcon(cat: string): IconName {
  const k = (cat || '').toLowerCase();
  if (k.includes('doc')) return 'doc';
  if (k.includes('auto') || k.includes('vehicle')) return 'car';
  if (k.includes('electronic') || k.includes('apparel') || k.includes('shoe')) return 'cube';
  return 'box';
}

export function AvailablePackages() {
  const { t } = useI18n();
  const nav = useNav();
  const { packages } = useCatalog();
  const [filter, setFilter] = useState('all');
  const filters = [
    { key: 'all', label: t('All', 'الكل') },
    { key: 'air', label: t('Air', 'جو') },
    { key: 'road', label: t('Road', 'بر') },
    { key: 'today', label: t('Today', 'اليوم') },
  ];
  return (
    <Screen>
      <Row gap={12} style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
        {nav.canGoBack && <IconButton name="back" flip onPress={nav.pop} />}
        <Txt size={22} weight="bold" style={{ flex: 1 }}>
          {t('Packages to carry', 'طرود للتوصيل')}
        </Txt>
        <LangToggle />
      </Row>
      <Row gap={8} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        {filters.map((f) => (
          <Chip key={f.key} label={f.label} sm on={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </Row>
      <Body>
        {packages.length === 0 ? (
          <Txt size={14} color={colors.textSecondary} align="center" style={{ marginTop: 40 }}>
            {t('Loading packages…', 'جارٍ تحميل الطرود…')}
          </Txt>
        ) : (
          packages.map((p) => (
            <PackageCard
              key={p.id}
              icon={pkgIcon(p.category)}
              item={p.item}
              from={p.fromCity}
              to={p.toCity}
              weight={`${p.weightKg} kg`}
              fit={p.fit}
              eta={p.eta}
              urgent={p.urgent}
              onPress={() => nav.push('PackageDetail', { id: p.id })}
            />
          ))
        )}
      </Body>
      <BottomNav />
    </Screen>
  );
}

function modeLbl(t: (en: string, ar?: string) => string, m: 'air' | 'road' | 'sea') {
  return m === 'sea' ? t('Sea', 'بحر') : m === 'air' ? t('Air', 'جو') : t('Road', 'بر');
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <Card flat muted style={{ flex: 1, padding: 12, alignItems: 'center' }}>
      <Txt size={17} weight="extrabold" tabular>
        {value}
      </Txt>
      <Txt size={11.5} weight="semibold" color={colors.textSecondary} align="center" style={{ marginTop: 2 }}>
        {label}
      </Txt>
    </Card>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <Row gap={1}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={12} color={i < n ? colors.ratingGold : colors.border} />
      ))}
    </Row>
  );
}

export function CarrierProfile({ id }: { id?: string }) {
  const { t } = useI18n();
  const nav = useNav();
  const { getCarrier } = useCatalog();
  const c = id ? getCarrier(id) : undefined;

  if (!c) {
    return (
      <Screen>
        <AppBar title={t('Carrier', 'الناقل')} />
        <Body>
          <Txt size={14} color={colors.textSecondary} align="center" style={{ marginTop: 40 }}>
            {t('Loading…', 'جارٍ التحميل…')}
          </Txt>
        </Body>
      </Screen>
    );
  }
  const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
  return (
    <Screen>
      <AppBar title={t('Carrier profile', 'ملف الناقل')} />
      <Body>
        {/* identity */}
        <Card style={{ padding: 16, marginBottom: 14 }}>
          <Row gap={14}>
            <Avatar icon={c.type === 'company' ? 'ship' : undefined} initials={c.type !== 'company' ? c.initials : undefined} size={64} rounded={c.type === 'company' ? 16 : 32} bg={colors.surfaceMuted} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={18} weight="extrabold" numberOfLines={1}>
                {c.name}
              </Txt>
              <Row gap={8} style={{ marginTop: 5, flexWrap: 'wrap' }}>
                <Rating value={c.rating.toFixed(1)} count={fmt(c.reviews)} />
                <ModeBadge label={c.type === 'company' ? t('Company', 'شركة') : t('Traveller', 'مسافر')} soft small />
                {c.verified && <Badge label={t('Verified', 'موثّق')} icon="shield" style={{ paddingVertical: 3, paddingHorizontal: 8 }} />}
              </Row>
              <Row gap={5} style={{ marginTop: 8 }}>
                {c.modes.map((m) => (
                  <ModeBadge key={m} mode={m} label={modeLbl(t, m)} small style={{ paddingHorizontal: 8 }} />
                ))}
              </Row>
            </View>
          </Row>
        </Card>

        {/* trust stats */}
        <Row gap={10} style={{ marginBottom: 8 }}>
          <StatCell value={fmt(c.deliveries)} label={t('Deliveries', 'عمليات تسليم')} />
          <StatCell value={`${c.onTimePct}%`} label={t('On time', 'في الوقت')} />
        </Row>
        <Row gap={10} style={{ marginBottom: 16 }}>
          <StatCell value={`${c.responseMins}m`} label={t('Responds in', 'يرد خلال')} />
          <StatCell value={String(c.memberSince)} label={t('Member since', 'عضو منذ')} />
        </Row>

        {/* about */}
        <Txt size={15} weight="bold" style={{ marginBottom: 6 }}>
          {t('About', 'نبذة')}
        </Txt>
        <Txt size={13.5} color={colors.textSecondary} style={{ lineHeight: 20, marginBottom: 16 }}>
          {c.bio}
        </Txt>

        {/* routes */}
        {c.routes?.length > 0 && (
          <>
            <Txt size={15} weight="bold" style={{ marginBottom: 8 }}>
              {t('Frequent routes', 'مسارات متكررة')}
            </Txt>
            <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 18 }}>
              {c.routes.map((r) => (
                <View key={r} style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Txt size={13} weight="semibold">
                    {r}
                  </Txt>
                </View>
              ))}
            </Row>
          </>
        )}

        {/* reviews */}
        <Row justify="space-between" style={{ marginBottom: 8 }}>
          <Txt size={15} weight="bold">
            {t('Reviews', 'التقييمات')}
          </Txt>
          <Txt size={13} weight="semibold" color={colors.textTertiary}>
            {fmt(c.reviews)} {t('total', 'إجمالاً')}
          </Txt>
        </Row>
        {(c.reviewList || []).map((r, i) => (
          <Card key={i} flat style={{ padding: 14, marginBottom: 10 }}>
            <Row gap={11}>
              <Avatar initials={r.initials} size={38} />
              <View style={{ flex: 1 }}>
                <Row justify="space-between">
                  <Txt size={14} weight="bold">
                    {r.author}
                  </Txt>
                  <Txt size={12} weight="semibold" color={colors.textTertiary}>
                    {t(`${r.days}d ago`, `قبل ${r.days} يوم`)}
                  </Txt>
                </Row>
                <View style={{ marginTop: 3, marginBottom: 6 }}>
                  <Stars n={r.rating} />
                </View>
                <Txt size={13.5} color={colors.textSecondary} style={{ lineHeight: 19 }}>
                  {r.text}
                </Txt>
              </View>
            </Row>
          </Card>
        ))}

        {/* CTA */}
        <Row gap={10} style={{ marginTop: 8 }}>
          <Button label={t('Message', 'مراسلة')} variant="secondary" style={{ flex: 1 }} />
          <Button label={t('Request a quote', 'اطلب عرض سعر')} icon="sparkle" iconColor="#fff" style={{ flex: 2 }} onPress={() => { nav.popToRoot(); nav.switchTab('home'); nav.push('AiAgent'); }} />
        </Row>
      </Body>
    </Screen>
  );
}

export function Carriers() {
  const { t } = useI18n();
  const nav = useNav();
  const { carriers } = useCatalog();
  const companies = carriers.filter((c) => c.type === 'company');
  const travellers = carriers.filter((c) => c.type === 'traveller');
  const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
  const Section = ({ title, list }: { title: string; list: typeof carriers }) =>
    list.length ? (
      <>
        <Txt size={13} weight="bold" color={colors.textTertiary} style={{ letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 18, marginBottom: 4, marginHorizontal: 2 }}>
          {title}
        </Txt>
        {list.map((c, i) => (
          <React.Fragment key={c.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
            <CarrierRow initials={c.initials} name={c.name} rating={c.rating.toFixed(1)} delivered={fmt(c.reviews)} modes={c.modes} onPress={() => nav.push('CarrierProfile', { id: c.id })} />
          </React.Fragment>
        ))}
      </>
    ) : null;
  return (
    <Screen>
      <AppBar title={t('Top rated carriers', 'الأعلى تقييماً')} />
      <Body>
        {carriers.length === 0 ? (
          <Txt size={14} color={colors.textSecondary} align="center" style={{ marginTop: 40 }}>
            {t('Loading carriers…', 'جارٍ تحميل الناقلين…')}
          </Txt>
        ) : (
          <>
            <Section title={t('Companies', 'الشركات')} list={companies} />
            <Section title={t('Travellers', 'المسافرون')} list={travellers} />
          </>
        )}
      </Body>
    </Screen>
  );
}

export function PackageDetail({ id }: { id?: string }) {
  const { t } = useI18n();
  const { getPackage } = useCatalog();
  const p = id ? getPackage(id) : undefined;
  return (
    <Screen>
      <AppBar title={t('Package details', 'تفاصيل الطرد')} />
      <Body>
        <View style={{ height: 150, borderRadius: 16, backgroundColor: '#e7ebef', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <Icon name={pkgIcon(p?.category || '')} size={40} color={colors.textTertiary} />
        </View>
        <Row justify="space-between" style={{ marginBottom: 4 }}>
          <Txt size={19} weight="extrabold" numberOfLines={1} style={{ flex: 1 }}>
            {p?.item || t('Package', 'طرد')}
          </Txt>
          <ModeBadge label={p?.eta || '—'} small bg="rgba(0,180,196,0.1)" color={colors.brandTeal} />
        </Row>
        <Row gap={7} style={{ marginBottom: 16 }}>
          <Txt size={14} weight="semibold" color={colors.textSecondary}>
            {p?.fromCity || '—'}
          </Txt>
          <RouteArrow size={15} />
          <Txt size={14} weight="semibold" color={colors.textSecondary}>
            {p?.toCity || '—'}
          </Txt>
        </Row>
        <Card style={{ padding: 15, marginBottom: 14 }}>
          <Row gap={10}>
            <Att label={t('Weight', 'الوزن')} val={p ? `${p.weightKg} kg` : '—'} />
            <Att label={t('Fit', 'الحجم')} val={p?.fit || '—'} />
            <Att label={t('Value', 'القيمة')} val={p?.value || '—'} />
          </Row>
        </Card>
        <Card style={{ padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Avatar initials={p?.senderInitials || '—'} size={40} />
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="bold">
              {p?.senderName || t('Sender', 'المرسِل')}
            </Txt>
            {p && <Rating value={p.senderRating.toFixed(1)} count={String(p.senderReviews)} size={12} />}
          </View>
          <Badge label={t('Verified', 'موثّق')} icon="shield" />
        </Card>
        <Row gap={10}>
          <Button label={t('Message', 'مراسلة')} variant="secondary" style={{ flex: 1 }} />
          <Button label={t('Make an offer', 'قدّم عرضاً')} variant="carry" style={{ flex: 2 }} />
        </Row>
      </Body>
    </Screen>
  );
}

export function Shipments() {
  const { t } = useI18n();
  const nav = useNav();
  const { shipments } = useShipments();
  const [tab, setTab] = useState('active');

  const list = shipments.filter((s) => (tab === 'active' ? s.status !== 'delivered' : s.status === 'delivered'));

  const ShipCard = ({ s }: { s: Shipment }) => {
    const done = s.status === 'delivered';
    return (
      <Pressable onPress={() => nav.push('TrackDetail', { shipmentId: s.id })}>
        <Card style={{ padding: 15, marginBottom: 12 }}>
          <Row gap={13}>
            <Avatar icon={done ? 'check' : 'box'} size={46} rounded={12} bg={done ? 'rgba(0,200,150,0.1)' : colors.surfaceMuted} iconColor={done ? colors.success : colors.brandTeal} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={15} weight="bold" numberOfLines={1}>
                {s.item || t('Shipment', 'شحنة')}
              </Txt>
              <Row gap={6} style={{ marginTop: 3 }}>
                <Txt size={13} weight="semibold" color={colors.textSecondary}>
                  {s.fromCity || '—'}
                </Txt>
                <RouteArrow size={13} />
                <Txt size={13} weight="semibold" color={colors.textSecondary}>
                  {s.toCity || '—'}
                </Txt>
              </Row>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}>
              {done ? (
                <ModeBadge label={statusLabel(s.status, t)} bg="rgba(0,200,150,0.12)" color={colors.success} />
              ) : (
                <ModeBadge label={statusLabel(s.status, t)} soft />
              )}
              {!!s.mode && (
                <ModeBadge mode={s.mode} label={s.mode === 'sea' ? t('Sea', 'بحر') : s.mode === 'air' ? t('Air', 'جو') : t('Road', 'بر')} small />
              )}
            </View>
          </Row>
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen>
      <Row style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
        <Txt size={22} weight="bold" style={{ flex: 1 }}>
          {t('Shipments', 'الشحنات')}
        </Txt>
        <LangToggle />
      </Row>
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <Seg value={tab} onChange={setTab} options={[{ key: 'active', label: t('Active', 'النشطة') }, { key: 'history', label: t('History', 'السجل') }]} />
      </View>
      <Body>
        {list.length ? (
          list.map((s) => <ShipCard key={s.id} s={s} />)
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="box" size={30} color={colors.textTertiary} />
            </View>
            <Txt size={16} weight="bold" align="center">
              {tab === 'active' ? t('No active shipments', 'لا توجد شحنات نشطة') : t('No past shipments', 'لا يوجد سجل شحنات')}
            </Txt>
            <Txt size={13.5} color={colors.textSecondary} align="center" style={{ marginTop: 6, lineHeight: 20 }}>
              {t('Create one with the AI agent from the Home tab.', 'أنشئ واحدة عبر مساعد الذكاء من الرئيسية.')}
            </Txt>
            {tab === 'active' && (
              <Button label={t('Send with AI', 'أرسل بالذكاء')} icon="sparkle" full={false} style={{ marginTop: 18, paddingHorizontal: 28 }} onPress={() => { nav.switchTab('home'); nav.push('AiAgent'); }} />
            )}
          </View>
        )}
      </Body>
      <BottomNav />
    </Screen>
  );
}

export function TrackDetail({ shipmentId }: { shipmentId?: string }) {
  const { t } = useI18n();
  const { getById } = useShipments();
  const s = shipmentId ? getById(shipmentId) : undefined;
  const item = s?.item || t('Shipment', 'شحنة');
  const order = s?.orderId || '#SB-—';
  const carrier = s?.carrier || t('Pending carrier', 'بانتظار الناقل');
  const mode = s?.mode || 'road';
  const from = s?.fromCity || '—';
  const to = s?.toCity || '—';
  const transitLabel = mode === 'sea' ? t('At sea', 'في البحر') : mode === 'air' ? t('In the air', 'في الجو') : t('On the road', 'على الطريق');
  const steps: [string, string, true | 'now' | false][] = [
    [t('Order placed', 'تم الطلب'), from, true],
    [t('Picked up', 'تم الاستلام'), from, true],
    [t('In transit', 'قيد النقل'), transitLabel, 'now'],
    [t('Out for delivery', 'خرجت للتسليم'), to, false],
    [t('Delivered', 'تم التسليم'), to, false],
  ];
  return (
    <Screen>
      <AppBar title={t('Track shipment', 'تتبع الشحنة')} />
      <Body>
        <MapRoute height={150} style={{ marginBottom: 16 }} />
        <Card style={{ padding: 15, marginBottom: 18 }}>
          <Row gap={12}>
            <Avatar icon="box" size={44} rounded={12} bg={colors.surfaceMuted} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight="bold" numberOfLines={1}>
                {item}
              </Txt>
              <Txt size={12.5} weight="semibold" color={colors.textSecondary} numberOfLines={1}>
                {order} · {carrier}
              </Txt>
            </View>
            <ModeBadge mode={mode} label={mode === 'sea' ? t('Sea', 'بحر') : mode === 'air' ? t('Air', 'جو') : t('Road', 'بر')} />
          </Row>
        </Card>
        <View>
          {steps.map(([title, sub, st], i) => {
            const last = i === steps.length - 1;
            return (
              <Row key={i} align="flex-start" gap={14} style={{ paddingBottom: last ? 0 : 20 }}>
                <View style={{ alignItems: 'center', width: 22 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: st === true ? colors.brandTeal : st === 'now' ? '#fff' : colors.surfaceMuted,
                      borderWidth: st === 'now' ? 3 : 0,
                      borderColor: colors.brandTeal,
                    }}
                  >
                    {st === true && <Icon name="check" size={12} color="#fff" sw={2.8} />}
                  </View>
                  {!last && <View style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: st === true ? colors.brandTeal : colors.border, marginTop: 2 }} />}
                </View>
                <View style={{ flex: 1, paddingTop: 1 }}>
                  <Txt size={14.5} weight="bold" color={st ? colors.textPrimary : colors.textTertiary}>
                    {title}
                  </Txt>
                  {!!sub && (
                    <Txt size={12.5} weight="semibold" color={colors.textSecondary} style={{ marginTop: 2 }}>
                      {sub}
                    </Txt>
                  )}
                </View>
                {st === 'now' && <ModeBadge label={t('Now', 'الآن')} bg="rgba(0,180,196,0.1)" color={colors.brandTeal} />}
              </Row>
            );
          })}
        </View>
      </Body>
    </Screen>
  );
}
