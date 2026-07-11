import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { colors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useAuth } from '../lib/auth';
import { useShipments, statusLabel } from '../lib/shipments';
import { useCatalog } from '../lib/catalog';
import { Screen, Body, Row, Txt, Hero, Button, Badge, LangToggle, Seg, BottomNav, IconButton, Card, Hr, Link, Avatar, ModeBadge, RouteArrow } from '../components/ui';
import { Fade } from '../components/anim';
import { Icon, IconName } from '../components/Icon';
import { CarrierRow, PackageCard } from './shared';

function fmtCount(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
}
function pkgIcon(cat: string): IconName {
  const k = (cat || '').toLowerCase();
  if (k.includes('electronic')) return 'cube';
  if (k.includes('apparel') || k.includes('shoe')) return 'cube';
  if (k.includes('doc')) return 'doc';
  if (k.includes('auto') || k.includes('vehicle')) return 'car';
  return 'box';
}

// Live tracker for the user's most recent active shipment.
function ActiveTracker() {
  const { t } = useI18n();
  const nav = useNav();
  const { active } = useShipments();
  if (!active) {
    return (
      <Card muted style={{ padding: 16, marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar icon="box" size={40} rounded={11} bg="#fff" />
        <Txt size={13.5} weight="semibold" color={colors.textSecondary} style={{ flex: 1 }}>
          {t('No active shipments yet. Tap “Send with AI” to create one.', 'لا توجد شحنات نشطة بعد. اضغط «أرسل بالذكاء» لإنشاء واحدة.')}
        </Txt>
      </Card>
    );
  }
  const inTransit = active.status === 'in_transit' || active.status === 'booked';
  const open = () => nav.push('TrackDetail', { shipmentId: active.id });
  return (
    <Pressable onPress={open}>
      <Card style={{ padding: 16, marginBottom: 22 }}>
        <Row justify="space-between" style={{ marginBottom: 12 }}>
          <Txt size={15} weight="bold">
            {t('Your Shipment', 'شحنتك')}
          </Txt>
          <ModeBadge
            label={statusLabel(active.status, t)}
            mode={inTransit ? active.mode || 'sea' : undefined}
            soft={!inTransit}
            bg={inTransit ? undefined : 'rgba(0,180,196,0.1)'}
            color={inTransit ? undefined : colors.brandTeal}
          />
        </Row>
        <Row gap={14}>
          <Avatar icon="box" size={46} rounded={12} bg={colors.surfaceMuted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} weight="bold" numberOfLines={1}>
              {active.item || t('Shipment', 'شحنة')}
            </Txt>
            <Row gap={7} style={{ marginTop: 2 }}>
              <Txt size={13} weight="semibold" color={colors.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
                {active.fromCity || '—'}
              </Txt>
              <RouteArrow />
              <Txt size={13} weight="semibold" color={colors.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
                {active.toCity || '—'}
              </Txt>
            </Row>
          </View>
          <Button label={t('TRACK', 'تتبع')} variant="ghost" size="sm" full={false} onPress={open} />
        </Row>
      </Card>
    </Pressable>
  );
}

function Greeting({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <Row align="flex-start" style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 }}>
      <View style={{ flex: 1 }}>
        <Txt size={13} weight="semibold" color={colors.textTertiary}>
          {t('Welcome back', 'مرحباً بعودتك')}
        </Txt>
        <Txt size={24} weight="extrabold" style={{ marginTop: 2 }}>
          {t('Hello, ', 'أهلاً، ')}
          {name}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <LangToggle />
        <Badge label={t('Secure Payments', 'دفع آمن')} icon="shield" />
      </View>
    </Row>
  );
}

export default function HomeScreen() {
  const { t } = useI18n();
  const nav = useNav();
  const { profile } = useAuth();
  const { topCarriers, packages } = useCatalog();
  const [mode, setMode] = useState<'send' | 'carry'>('send');
  const name = (profile.name && profile.name.split(' ')[0]) || t('Ahmed', 'أحمد');

  return (
    <Screen>
      <Greeting name={name} />
      <View style={{ paddingHorizontal: 20, marginBottom: 18 }}>
        <Seg
          value={mode}
          onChange={(k) => setMode(k as 'send' | 'carry')}
          options={[
            { key: 'send', label: t('Send', 'إرسال') },
            { key: 'carry', label: t('Carry', 'توصيل') },
          ]}
        />
      </View>

      <Body>
        <Fade key={mode} dy={10}>
        {mode === 'send' ? (
          <>
            <Hero variant="send" blobs={['#6E7BF2', '#3D49C9', '#8E9BFF']} minHeight={196} style={{ marginBottom: 22 }}>
              <Badge label={t('AI powered', 'مدعوم بالذكاء')} icon="sparkle" onDark style={{ alignSelf: 'flex-start', marginBottom: 14 }} />
              <Txt size={27} weight="extrabold" color="#fff" style={{ lineHeight: 31, maxWidth: 260 }}>
                {t('Send Your Package In Seconds', 'أرسل طردك في ثوانٍ')}
              </Txt>
              <Txt size={13.5} color="rgba(255,255,255,0.82)" style={{ marginTop: 8, marginBottom: 18, maxWidth: 250, lineHeight: 19 }}>
                {t('Describe it once. Travellers and companies bid to deliver.', 'صِفه مرة واحدة، وسيتنافس المسافرون والشركات على توصيله.')}
              </Txt>
              <Button
                label={t('SEND WITH AI', 'أرسل بالذكاء الاصطناعي')}
                variant="white"
                icon="sparkle"
                iconColor={colors.sendInk}
                onPress={() => nav.push('AiAgent')}
              />
            </Hero>
            <ActiveTracker />
            <Row justify="space-between" style={{ marginBottom: 4 }}>
              <Txt size={16} weight="bold">
                {t('Top rated carriers', 'الأعلى تقييماً')}
              </Txt>
              <Link label={t('See all', 'عرض الكل')} onPress={() => nav.push('Carriers')} />
            </Row>
            {topCarriers.slice(0, 3).map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <Hr />}
                <CarrierRow
                  initials={c.initials}
                  name={c.name}
                  rating={c.rating.toFixed(1)}
                  delivered={fmtCount(c.reviews)}
                  modes={c.modes}
                  onPress={() => nav.push('CarrierProfile', { id: c.id })}
                />
              </React.Fragment>
            ))}
          </>
        ) : (
          <>
            <Hero variant="carry" blobs={['#3CF0C5', '#00B07A', '#7DFFDD']} minHeight={168} style={{ marginBottom: 18 }}>
              <Txt size={26} weight="extrabold" color="#fff" style={{ lineHeight: 29, maxWidth: 240 }}>
                {t('Find Packages To Carry', 'ابحث عن طرود لتوصيلها')}
              </Txt>
              <Txt size={13.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 7, marginBottom: 16 }}>
                {t('Earn on routes you already travel.', 'اربح على المسارات التي تسلكها بالفعل.')}
              </Txt>
              <Button
                label={t('FIND WITH AI', 'ابحث بالذكاء')}
                variant="white"
                textColor={colors.carryInk}
                icon="sparkle"
                iconColor={colors.carryInk}
                onPress={() => nav.push('AvailablePackages')}
              />
            </Hero>
            <Card style={{ padding: 16, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Txt size={12.5} weight="semibold" color={colors.textTertiary}>
                  {t('Your earnings', 'أرباحك')}
                </Txt>
                <Row gap={5} align="baseline" style={{ marginTop: 2 }}>
                  <Txt size={26} weight="extrabold" tabular>
                    123.000
                  </Txt>
                  <Txt size={12} weight="bold" color={colors.textTertiary}>
                    KWD
                  </Txt>
                </Row>
              </View>
              <Button label={t('EDIT', 'تعديل')} variant="ghost" size="sm" full={false} onPress={() => nav.selectTab('account')} />
            </Card>
            <Row justify="space-between" style={{ marginBottom: 10 }}>
              <Txt size={16} weight="bold">
                {t('Available packages', 'الطرود المتاحة')}
              </Txt>
              <IconButton name="filter" size={17} d={34} onPress={() => nav.push('AvailablePackages')} />
            </Row>
            {packages.map((p) => (
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
            ))}
          </>
        )}
        </Fade>
      </Body>
      <BottomNav />
    </Screen>
  );
}
