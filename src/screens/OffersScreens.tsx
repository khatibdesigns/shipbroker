import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, ModeKey } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useShipments } from '../lib/shipments';
import { useCatalog, buildOffers, Offer } from '../lib/catalog';
import { ShipmentDraft, askAboutOffer } from '../lib/ai';
import {
  Screen, Body, Row, Txt, Card, Button, Badge, ModeBadge, Rating, Avatar, IconButton, BottomNav, AppBar, Sheet, RouteArrow, Hr,
} from '../components/ui';
import { Icon, IconName } from '../components/Icon';

function modeLabel(t: (en: string, ar?: string) => string, m: ModeKey) {
  return m === 'sea' ? t('Sea', 'بحر') : m === 'air' ? t('Air', 'جو') : t('Road', 'بر');
}

function headerIcon(category?: string | null): IconName {
  const k = (category || '').toLowerCase();
  if (k.includes('vehicle') || k.includes('car')) return 'car';
  if (k.includes('boat') || k.includes('yacht')) return 'boat';
  if (k.includes('doc')) return 'doc';
  return 'cube';
}

function ShipmentHeader({ draft }: { draft?: ShipmentDraft }) {
  const { t } = useI18n();
  const nav = useNav();
  // Use the real created shipment when present; otherwise a representative sample.
  const from = draft?.fromCity || t('Kuwait', 'الكويت');
  const to = draft?.toCity || t('Paris', 'باريس');
  const badges: { label: string; urgent?: boolean }[] = [];
  if (draft?.weightKg != null) badges.push({ label: `${draft.weightKg.toLocaleString()} kg` });
  if (draft?.size) badges.push({ label: t(draft.size[0].toUpperCase() + draft.size.slice(1), '') });
  if (draft?.timing) badges.push({ label: draft.timing, urgent: /asap/i.test(draft.timing) });
  if (!badges.length) {
    badges.push({ label: '1,500 kg' }, { label: t('Large', 'كبير') }, { label: 'ASAP', urgent: true });
  }
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Row style={{ marginBottom: 12 }}>
        {nav.canGoBack ? <IconButton name="back" flip onPress={nav.pop} /> : <View style={{ width: 38 }} />}
        <Txt size={18} weight="bold" align="center" style={{ flex: 1 }}>
          {t('Offers', 'العروض')}
        </Txt>
        <IconButton name="filter" size={18} onPress={() => nav.push('OffersFilter')} />
      </Row>
      <Row gap={12}>
        <View style={{ width: 52, height: 52, borderRadius: 13, backgroundColor: '#e7ebef', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Icon name={headerIcon(draft?.category)} size={26} color={colors.textTertiary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row gap={7}>
            <Txt size={15} weight="bold">
              {from}
            </Txt>
            <RouteArrow size={15} />
            <Txt size={15} weight="bold">
              {to}
            </Txt>
          </Row>
          <Row gap={6} style={{ marginTop: 6, flexWrap: 'wrap' }}>
            {badges.map((b, i) => (
              <ModeBadge
                key={i}
                label={b.label}
                soft={!b.urgent}
                small
                bg={b.urgent ? 'rgba(255,77,79,0.1)' : undefined}
                color={b.urgent ? colors.error : undefined}
              />
            ))}
          </Row>
        </View>
      </Row>
    </View>
  );
}

function OfferCard({
  company,
  initials,
  name,
  rating,
  cnt,
  price,
  eta,
  mode,
  ai,
  best,
  onSelect,
  onAsk,
}: {
  company?: boolean;
  initials?: string;
  name: string;
  rating: string;
  cnt: string;
  price: string;
  eta: string;
  mode: ModeKey;
  ai?: boolean;
  best?: boolean;
  onSelect?: () => void;
  onAsk?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card
      borderColor={best ? colors.brandTeal : colors.border}
      style={[{ padding: 15, marginBottom: 12, marginTop: best ? 12 : 0 }, best ? { shadowColor: colors.brandTeal, shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 6 }, elevation: 5 } : null]}
    >
      {best && (
        <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: -10, left: 16, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="sparkle" size={11} color="#fff" sw={2.4} />
          <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>
            {t('AI CHOICE', 'اختيار الذكاء')}
          </Txt>
        </LinearGradient>
      )}
      <Row gap={12} style={{ marginBottom: 12 }} align="flex-start">
        <Avatar
          icon={company ? 'ship' : undefined}
          initials={initials}
          size={46}
          rounded={company ? 12 : 23}
          bg={company ? colors.surfaceMuted : '#E8ECEF'}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={15} weight="bold" numberOfLines={1}>
            {name}
          </Txt>
          <Row gap={6} style={{ marginTop: 5, flexWrap: 'wrap' }}>
            <Rating value={rating} count={cnt} />
            <ModeBadge mode={mode} label={modeLabel(t, mode)} small style={{ paddingHorizontal: 8 }} />
            {company && <ModeBadge label={t('Company', 'شركة')} soft small />}
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 }}>
          <Row gap={3} align="baseline">
            <Txt size={20} weight="extrabold" tabular>
              {price}
            </Txt>
            <Txt size={12} weight="bold" color={colors.textTertiary}>
              KWD
            </Txt>
          </Row>
          <Txt size={12} weight="semibold" color={colors.textTertiary} style={{ marginTop: 1 }} numberOfLines={1}>
            {eta}
          </Txt>
        </View>
      </Row>
      <Row gap={8}>
        <Button label={t('SELECT OFFER', 'اختر العرض')} onPress={onSelect} height={46} style={{ flex: 1 }} />
        {/* Ask AI is available on every offer, not just the AI-Choice one. */}
        {onAsk && <Button label={t('Ask AI', 'اسأل الذكاء')} variant="secondary" icon="sparkle" full={false} height={46} onPress={onAsk} />}
      </Row>
    </Card>
  );
}

function fmtReviews(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
}

export function Offers({ shipmentId, draft }: { shipmentId?: string; draft?: ShipmentDraft }) {
  const { t, lang } = useI18n();
  const nav = useNav();
  const { carriers } = useCatalog();
  const { active, getById } = useShipments();
  const sid = shipmentId || active?.id;
  const sdraft = draft || (sid ? getById(sid) : undefined) || active || {};
  const offers = buildOffers(sdraft, carriers);

  const [ask, setAsk] = React.useState<{ offer: Offer; loading: boolean; text: string; err: string } | null>(null);
  const openAsk = async (o: Offer) => {
    setAsk({ offer: o, loading: true, text: '', err: '' });
    try {
      const text = await askAboutOffer({
        shipment: sdraft,
        offer: { name: o.name, mode: o.mode, price: o.price, eta: lang === 'ar' ? o.eta.ar : o.eta.en, rating: o.rating, type: o.type },
        lang,
      });
      setAsk((a) => (a && a.offer.carrierId === o.carrierId ? { ...a, loading: false, text } : a));
    } catch (e: any) {
      setAsk((a) => (a && a.offer.carrierId === o.carrierId ? { ...a, loading: false, err: e?.message || 'Error' } : a));
    }
  };

  return (
    <Screen>
      <ShipmentHeader draft={sdraft} />
      <Body>
        <Row gap={7} style={{ marginVertical: 14 }}>
          <Icon name="sparkle" size={16} color={colors.brandTeal} sw={2} />
          <Txt size={13.5} weight="semibold" color={colors.textSecondary} style={{ flex: 1 }}>
            {offers.length
              ? t('I found the best matches for your shipment.', 'وجدت أفضل العروض المناسبة لشحنتك.')
              : t('Loading offers…', 'جارٍ تحميل العروض…')}
          </Txt>
        </Row>
        {offers.map((o) => (
          <OfferCard
            key={o.carrierId}
            company={o.type === 'company'}
            initials={o.initials}
            name={o.name}
            rating={o.rating.toFixed(1)}
            cnt={fmtReviews(o.reviews)}
            price={o.price}
            eta={lang === 'ar' ? o.eta.ar : o.eta.en}
            mode={o.mode}
            ai={o.ai}
            best={o.ai}
            onSelect={() => nav.push('OfferDetail', { shipmentId: sid, offer: o })}
            onAsk={() => openAsk(o)}
          />
        ))}
      </Body>
      <BottomNav />

      {ask && (
        <>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,24,31,0.45)' }} onPress={() => setAsk(null)} />
          <Sheet>
            <Row gap={9} style={{ marginBottom: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden' }}>
                <View style={{ flex: 1, backgroundColor: colors.brandTeal, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="sparkle" size={18} color="#fff" sw={2} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={15.5} weight="bold">
                  {t('AI assessment', 'تقييم الذكاء')}
                </Txt>
                <Txt size={12.5} weight="semibold" color={colors.textSecondary} numberOfLines={1}>
                  {ask.offer.name}
                </Txt>
              </View>
              <IconButton name="close" size={16} d={32} bare bg={colors.surfaceMuted} onPress={() => setAsk(null)} />
            </Row>
            {ask.loading ? (
              <Row gap={10} style={{ paddingVertical: 22 }}>
                <ActivityIndicator color={colors.brandTeal} />
                <Txt size={14} color={colors.textSecondary}>
                  {t('Analysing this offer…', 'نحلّل هذا العرض…')}
                </Txt>
              </Row>
            ) : ask.err ? (
              <Txt size={14} color={colors.error} style={{ paddingVertical: 14 }}>
                {ask.err}
              </Txt>
            ) : (
              <Txt size={14.5} color={colors.textPrimary} style={{ lineHeight: 22, paddingVertical: 4 }}>
                {ask.text}
              </Txt>
            )}
            <Button label={t('Got it', 'تمام')} variant="ghost" style={{ marginTop: 10 }} onPress={() => setAsk(null)} />
          </Sheet>
        </>
      )}
    </Screen>
  );
}

export function OffersFilter() {
  const { t } = useI18n();
  const nav = useNav();
  const [sel, setSel] = React.useState('ai');
  const rows: { key: string; label: string; ic?: IconName }[] = [
    { key: 'ai', label: t('AI Choice', 'اختيار الذكاء'), ic: 'sparkle' },
    { key: 'plh', label: t('Price: Low to High', 'السعر: من الأقل'), ic: 'offers' },
    { key: 'phl', label: t('Price: High to Low', 'السعر: من الأعلى') },
    { key: 'fast', label: t('Fastest delivery', 'الأسرع توصيلاً'), ic: 'bolt' },
    { key: 'rate', label: t('Highest rating', 'الأعلى تقييماً'), ic: 'star' },
    { key: 'co', label: t('Companies only', 'الشركات فقط'), ic: 'ship' },
    { key: 'tr', label: t('Travellers only', 'المسافرون فقط'), ic: 'user' },
  ];
  return (
    <Screen bg="rgba(20,24,31,0.45)">
      <Pressable style={{ flex: 1 }} onPress={nav.pop} />
      <Sheet>
        <Row justify="space-between" style={{ marginBottom: 8 }}>
          <Txt size={18} weight="bold">
            {t('Sort & filter', 'الترتيب والتصفية')}
          </Txt>
          <IconButton name="close" size={16} d={32} bare bg={colors.surfaceMuted} onPress={nav.pop} />
        </Row>
        {rows.map((r) => {
          const on = r.key === sel;
          return (
            <Pressable key={r.key} onPress={() => setSel(r.key)}>
              <Row justify="space-between" style={{ paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Row gap={11}>
                  {r.ic && <Icon name={r.ic} size={19} color={on ? colors.brandTeal : colors.textTertiary} />}
                  <Txt size={15} weight={on ? 'bold' : 'semibold'} color={on ? colors.textPrimary : colors.textSecondary}>
                    {r.label}
                  </Txt>
                </Row>
                {on ? (
                  <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={13} color="#fff" sw={2.6} />
                  </LinearGradient>
                ) : (
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border }} />
                )}
              </Row>
            </Pressable>
          );
        })}
        <Button label={t('Apply', 'تطبيق')} style={{ marginTop: 16 }} onPress={nav.pop} />
      </Sheet>
    </Screen>
  );
}

function DetailLine({ label, val, strong }: { label: string; val: string; strong?: boolean }) {
  return (
    <Row justify="space-between" style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Txt size={14} weight="semibold" color={colors.textSecondary}>
        {label}
      </Txt>
      <Txt size={14.5} weight={strong ? 'extrabold' : 'bold'}>
        {val}
      </Txt>
    </Row>
  );
}

function serviceLabel(t: (en: string, ar?: string) => string, mode?: ModeKey) {
  if (mode === 'sea') return t('Sea · FCL 40HC', 'بحري · FCL 40HC');
  if (mode === 'air') return t('Air · Express', 'جوي · سريع');
  return t('Road · FTL', 'بري · حمولة كاملة');
}

export function OfferDetail({ shipmentId, offer }: { shipmentId?: string; offer?: Offer }) {
  const { t, lang } = useI18n();
  const nav = useNav();
  const { getById } = useShipments();
  const s = shipmentId ? getById(shipmentId) : undefined;
  const mode = offer?.mode || 'sea';
  const eta = offer ? (lang === 'ar' ? offer.eta.ar : offer.eta.en) : '—';
  const route = `${s?.fromCity || '—'} → ${s?.toCity || '—'}`;
  return (
    <Screen>
      <AppBar title={t('Offer details', 'تفاصيل العرض')} />
      <Body>
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <Row gap={13}>
            <Avatar icon={offer?.type === 'company' ? 'ship' : undefined} initials={offer?.type !== 'company' ? offer?.initials : undefined} size={54} rounded={14} bg={colors.surfaceMuted} />
            <View style={{ flex: 1 }}>
              <Txt size={16.5} weight="extrabold" numberOfLines={1}>
                {offer?.name || t('Carrier', 'ناقل')}
              </Txt>
              <Row gap={8} style={{ marginTop: 5, flexWrap: 'wrap' }}>
                <Rating value={(offer?.rating ?? 0).toFixed(1)} count={offer ? fmtReviews(offer.reviews) : undefined} />
                <ModeBadge mode={mode} label={modeLabel(t, mode)} small style={{ paddingHorizontal: 8 }} />
                {offer?.verified && <Badge label={t('Verified', 'موثّق')} icon="shield" style={{ paddingVertical: 3, paddingHorizontal: 8 }} />}
              </Row>
            </View>
          </Row>
        </Card>
        <Card style={{ paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }}>
          <DetailLine label={t('Route', 'المسار')} val={route} />
          <DetailLine label={t('Estimated delivery', 'التوصيل المتوقع')} val={eta} />
          <DetailLine label={t('Service', 'الخدمة')} val={serviceLabel(t, mode)} />
          <DetailLine label={t('Insurance', 'التأمين')} val={t('Included', 'مشمول')} />
          <Row justify="space-between" style={{ paddingTop: 14, paddingBottom: 6 }}>
            <Txt size={15} weight="bold">
              {t('Total price', 'السعر الإجمالي')}
            </Txt>
            <Row gap={4} align="baseline">
              <Txt size={24} weight="extrabold" tabular>
                {offer?.price || '—'}
              </Txt>
              <Txt size={12} weight="bold" color={colors.textTertiary}>
                KWD
              </Txt>
            </Row>
          </Row>
        </Card>
        <Badge label={t('Payment held securely in escrow until delivery', 'يُحفظ الدفع بأمان حتى التسليم')} icon="lock" style={{ width: '100%', justifyContent: 'center', paddingVertical: 11, marginBottom: 14 }} />
        <Button label={t('Select & continue', 'اختر وتابع')} size="lg" onPress={() => nav.push('Escrow', { shipmentId, offer })} />
      </Body>
    </Screen>
  );
}

export function Escrow({ shipmentId, offer }: { shipmentId?: string; offer?: Offer }) {
  const { t, lang } = useI18n();
  const nav = useNav();
  const { setStatus } = useShipments();
  const orderId = '#SB-' + (shipmentId ? shipmentId.slice(-5).toUpperCase() : '00000');
  const price = offer?.price || '—';

  // Confirm the booking on the real shipment with the SELECTED offer's details.
  React.useEffect(() => {
    if (shipmentId && offer) {
      setStatus(shipmentId, 'in_transit', {
        carrier: offer.name,
        mode: offer.mode,
        priceKWD: offer.price,
        eta: lang === 'ar' ? offer.eta.ar : offer.eta.en,
        orderId,
      });
    }
  }, [shipmentId]);

  return (
    <Screen>
      <AppBar onlyLang />
      <Body contentStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="check" size={48} color="#fff" sw={2.4} />
        </LinearGradient>
        <Txt size={23} weight="extrabold" align="center">
          {t('Payment secured', 'تم تأمين الدفع')}
        </Txt>
        <Txt size={14.5} color={colors.textSecondary} align="center" style={{ marginTop: 8, maxWidth: 290, lineHeight: 21 }}>
          {t(
            `We are holding ${price} KWD in escrow. ${offer?.name || 'The carrier'} has been notified and will start your shipment.`,
            `نحتفظ بـ ${price} د.ك في الضمان. تم إشعار ${offer?.name || 'الناقل'} لبدء شحنتك.`
          )}
        </Txt>
        <Card muted style={{ width: '100%', padding: 16, marginTop: 26 }}>
          <Row justify="space-between">
            <Txt size={13} weight="semibold" color={colors.textSecondary}>
              {t('Order ID', 'رقم الطلب')}
            </Txt>
            <Txt size={13.5} weight="bold">
              {orderId}
            </Txt>
          </Row>
          <Row justify="space-between" style={{ marginTop: 11 }}>
            <Txt size={13} weight="semibold" color={colors.textSecondary}>
              {t('Released on', 'يُحرَّر عند')}
            </Txt>
            <Txt size={13.5} weight="bold">
              {t('Delivery confirmation', 'تأكيد التسليم')}
            </Txt>
          </Row>
        </Card>
        <Button label={t('Track shipment', 'تتبع الشحنة')} size="lg" style={{ marginTop: 28 }} onPress={() => nav.push('TrackDetail', { shipmentId })} />
        <Button label={t('Back to Home', 'العودة للرئيسية')} variant="secondary" style={{ marginTop: 10, borderWidth: 0 }} textColor={colors.textSecondary} onPress={() => { nav.popToRoot(); nav.switchTab('home'); }} />
      </Body>
    </Screen>
  );
}
