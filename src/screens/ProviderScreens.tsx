import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useAuth, Profile } from '../lib/auth';
import { Screen, Body, Row, Txt, Card, Button, Field, Seg, Chip, LangToggle, Link, RouteArrow } from '../components/ui';
import { Select } from '../components/Select';
import { Icon, IconName } from '../components/Icon';

function OnboardHeader({ title, sub }: { title: string; sub?: string }) {
  const { t } = useI18n();
  const nav = useNav();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 }}>
      <Row justify="space-between">
        <Link label={t('Back', 'رجوع')} icon="back" onPress={nav.canGoBack ? nav.pop : undefined} style={{ paddingHorizontal: 0 }} />
        <LangToggle />
      </Row>
      <Txt size={23} weight="extrabold" align="center" style={{ marginTop: 8, marginBottom: 2 }}>
        {title}
      </Txt>
      {sub && (
        <Txt size={13.5} weight="semibold" color={colors.textSecondary} align="center">
          {sub}
        </Txt>
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

// Multi-select grid pill used by Freight Forwarder.
function Pick({ label, sub, on, onPress }: { label: string; sub?: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 13,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderColor: on ? colors.brandTeal : colors.border,
        backgroundColor: on ? 'rgba(0,217,163,0.06)' : '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
      }}
    >
      {on ? (
        <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={13} color="#fff" sw={2.6} />
        </LinearGradient>
      ) : (
        <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.border }} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={14.5} weight="bold">
          {label}
        </Txt>
        {!!sub && (
          <Txt size={12.5} weight="semibold" color={colors.textSecondary}>
            {sub}
          </Txt>
        )}
      </View>
    </Pressable>
  );
}

// Provider type chooser (shown after company registration).
export function ProviderTypes() {
  const { t } = useI18n();
  const nav = useNav();
  const types: { route: string; icon: IconName; label: string; sub: string }[] = [
    { route: 'FreightForwarder', icon: 'ship', label: t('Freight Forwarder', 'وسيط شحن'), sub: t('Multi-service broker', 'وسيط متعدد الخدمات') },
    { route: 'Trucking', icon: 'truck', label: t('Trucking Service', 'خدمة الشاحنات'), sub: t('Truck fleet', 'أسطول شاحنات') },
    { route: 'Winch', icon: 'car', label: t('Winch Services', 'خدمات الونش'), sub: t('Tow & recovery', 'سحب وإنقاذ') },
    { route: 'MarineCaptain', icon: 'boat', label: t('Marine Captain', 'ربّان بحري'), sub: t('Certified vessels', 'قوارب معتمدة') },
  ];
  return (
    <Screen>
      <OnboardHeader title={t('Choose your service type', 'اختر نوع خدمتك')} sub={t('We tailor onboarding to what you offer', 'نخصّص التسجيل حسب ما تقدّمه')} />
      <Body contentStyle={{ paddingTop: 12, gap: 11 }}>
        {types.map((ty) => (
          <Pressable key={ty.route} onPress={() => nav.push(ty.route)}>
            <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ty.icon} size={24} color={colors.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={15.5} weight="bold">
                  {ty.label}
                </Txt>
                <Txt size={12.5} weight="semibold" color={colors.textSecondary}>
                  {ty.sub}
                </Txt>
              </View>
              <RouteArrow />
            </Card>
          </Pressable>
        ))}
      </Body>
    </Screen>
  );
}

export function FreightForwarder() {
  const { t } = useI18n();
  const nav = useNav();
  const { saveProfile } = useAuth();
  const initial = ['fcl', 'roro', 'air'];
  const [sel, setSel] = useState<string[]>(initial);
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const save = async () => {
    const payload: Partial<Profile> & { services: string[] } = { providerType: 'freight-forwarder', services: sel };
    await saveProfile(payload);
    nav.popToRoot();
    nav.switchTab('home');
  };
  const items: { k: string; label: string; sub?: string }[] = [
    { k: 'fcl', label: t('FCL', 'حمولة حاوية كاملة'), sub: t('Full Container Load', 'حمولة حاوية كاملة') },
    { k: 'lcl', label: t('LCL', 'أقل من حاوية'), sub: t('Less than Container', 'أقل من حمولة حاوية') },
    { k: 'roro', label: t('Ro-Ro', 'رورو'), sub: t('Vehicles', 'مركبات') },
    { k: 'cars', label: t('Cars', 'سيارات') },
    { k: 'boats', label: t('Boats & Yachts', 'قوارب ويخوت') },
    { k: 'rv', label: t('Caravans & RVs', 'كرفانات') },
    { k: 'air', label: t('Air Freight', 'شحن جوي') },
    { k: 'road', label: t('Road Freight', 'شحن بري') },
    { k: 'reefer', label: t('Refrigerated', 'مبرّد'), sub: t('Reefer transport', 'نقل مبرّد') },
    { k: 'general', label: t('General Cargo', 'بضائع عامة') },
    { k: 'ware', label: t('Warehousing', 'تخزين') },
    { k: 'customs', label: t('Customs Clearance', 'تخليص جمركي') },
  ];
  const allSelected = sel.length === items.length;
  return (
    <Screen>
      <OnboardHeader title={t('Freight Forwarder', 'وسيط شحن')} sub={t('Select one or more services', 'اختر خدمة أو أكثر')} />
      <Body contentStyle={{ paddingTop: 12 }}>
        <Row gap={10} style={{ marginBottom: 14 }}>
          <Field ph={t('Search services…', 'ابحث في الخدمات…')} icon="search" style={{ flex: 1, marginBottom: 0 }} />
          <Chip label={t('Select all', 'تحديد الكل')} on={allSelected} onPress={() => setSel(allSelected ? [] : items.map((i) => i.k))} style={{ height: 50, justifyContent: 'center' }} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {items.map((it) => (
            <View key={it.k} style={{ width: '48%' }}>
              <Pick label={it.label} sub={it.sub} on={sel.includes(it.k)} onPress={() => toggle(it.k)} />
            </View>
          ))}
        </View>
      </Body>
      <FooterBar left={t('Cancel', 'إلغاء')} right={t('Next', 'التالي')} onLeft={nav.pop} onRight={save} />
    </Screen>
  );
}

export function Trucking() {
  const { t } = useI18n();
  const nav = useNav();
  const { saveProfile } = useAuth();
  const [sel, setSel] = useState<string[]>(['carcarrier', 'flatbed']);
  const [expanded, setExpanded] = useState(false);
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const allRows: { k: string; label: string; sub: string; icon: IconName }[] = [
    { k: 'carcarrier', label: t('Car Carrier Truck', 'شاحنة نقل سيارات'), sub: t('Vehicles transport', 'نقل المركبات'), icon: 'car' },
    { k: 'flatbed', label: t('Flatbed Truck', 'شاحنة مسطّحة'), sub: t('Open deck', 'سطح مفتوح'), icon: 'truck' },
    { k: 'lowbed', label: t('Lowbed Truck', 'شاحنة منخفضة'), sub: t('Heavy / low-profile', 'أحمال ثقيلة'), icon: 'truck' },
    { k: 'reefer', label: t('Refrigerated Truck', 'شاحنة مبرّدة'), sub: t('Temperature-controlled', 'مكيّفة'), icon: 'truck' },
    { k: 'general', label: t('General Cargo Truck', 'شاحنة بضائع عامة'), sub: t('Palletized goods', 'بضائع مرصوفة'), icon: 'box' },
    { k: 'tanker', label: t('Tanker Truck', 'شاحنة صهريج'), sub: t('Liquids & fuel', 'سوائل ووقود'), icon: 'truck' },
    { k: 'container', label: t('Container Chassis', 'شاحنة حاويات'), sub: t('ISO containers', 'حاويات قياسية'), icon: 'box' },
    { k: 'boxvan', label: t('Box / Dry Van', 'شاحنة صندوقية'), sub: t('Enclosed cargo', 'بضائع مغلقة'), icon: 'box' },
  ];
  const rows = expanded ? allRows : allRows.slice(0, 5);
  const save = async () => {
    const payload: Partial<Profile> & { services: string[] } = { providerType: 'trucking', services: sel };
    await saveProfile(payload);
    nav.popToRoot();
    nav.switchTab('home');
  };
  return (
    <Screen>
      <OnboardHeader title={t('Trucking Service', 'خدمة الشاحنات')} sub={t('Select the required truck types', 'اختر أنواع الشاحنات المطلوبة')} />
      <Body contentStyle={{ paddingTop: 12 }}>
        <Field ph={t('Search truck types…', 'ابحث عن أنواع الشاحنات…')} icon="search" />
        <View style={{ gap: 10 }}>
          {rows.map((r) => {
            const on = sel.includes(r.k);
            return (
              <Pressable key={r.k} onPress={() => toggle(r.k)}>
                <Card flat borderColor={on ? colors.brandTeal : colors.border} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, backgroundColor: on ? 'rgba(0,217,163,0.05)' : '#fff' }}>
                  <View style={{ width: 56, height: 44, borderRadius: 10, backgroundColor: '#e7ebef', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={r.icon} size={24} color={colors.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={15} weight="bold">
                      {r.label}
                    </Txt>
                    <Txt size={12.5} weight="semibold" color={colors.textSecondary}>
                      {r.sub}
                    </Txt>
                  </View>
                  {on ? (
                    <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={14} color="#fff" sw={2.6} />
                    </LinearGradient>
                  ) : (
                    <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.border }} />
                  )}
                </Card>
              </Pressable>
            );
          })}
        </View>
        <Link label={expanded ? t('Show less', 'عرض أقل') : t('Show more', 'عرض المزيد')} brand style={{ marginTop: 14 }} onPress={() => setExpanded((v) => !v)} />
      </Body>
      <FooterBar left={t('Back', 'رجوع')} right={t('Next', 'التالي')} onLeft={nav.pop} onRight={save} />
    </Screen>
  );
}

export function Winch() {
  const { t } = useI18n();
  const nav = useNav();
  const { saveProfile } = useAuth();
  const [sel, setSel] = useState<string[]>(['flatbed']);
  const [coverage, setCoverage] = useState('intl');
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const save = async () => {
    const payload: Partial<Profile> & { services: string[]; coverage: string } = { providerType: 'winch', services: sel, coverage };
    await saveProfile(payload);
    nav.popToRoot();
    nav.switchTab('home');
  };
  const chips = [
    { k: 'flatbed', label: t('Full-Down Flatbed', 'مسطّح كامل') },
    { k: 'hydraulic', label: t('Hydraulic Lift', 'رافعة هيدروليكية') },
    { k: 'standard', label: t('Standard Tow', 'سحب عادي') },
    { k: 'hook', label: t('Hook / Wheel-Lift', 'رافعة عجلات') },
    { k: 'covered', label: t('Fully Covered', 'مغطّى بالكامل') },
  ];
  return (
    <Screen>
      <OnboardHeader title={t('Winch Services', 'خدمات الونش')} sub={t('Select all that apply (multi-select)', 'اختر كل ما ينطبق')} />
      <Body contentStyle={{ paddingTop: 12 }}>
        <Field ph={t('Search winch services…', 'ابحث في خدمات الونش…')} icon="search" />
        <Row gap={10} style={{ flexWrap: 'wrap', marginBottom: 24 }}>
          {chips.map((c) => (
            <Chip key={c.k} label={c.label} on={sel.includes(c.k)} brand={sel.includes(c.k)} icon={sel.includes(c.k) ? 'check' : undefined} onPress={() => toggle(c.k)} />
          ))}
        </Row>
        <Txt size={14} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 10 }}>
          {t('Coverage', 'التغطية')}
        </Txt>
        <Seg value={coverage} onChange={setCoverage} options={[{ key: 'intl', label: t('Intl & Domestic', 'دولي ومحلي') }, { key: 'domestic', label: t('Domestic Only', 'محلي فقط') }]} />
      </Body>
      <FooterBar left={t('Cancel', 'إلغاء')} right={t('Next', 'التالي')} onLeft={nav.pop} onRight={save} />
    </Screen>
  );
}

export function MarineCaptain() {
  const { t } = useI18n();
  const nav = useNav();
  const { saveProfile } = useAuth();
  const [coverage, setCoverage] = useState('intl');
  const [license, setLicense] = useState('');
  const [maxLen, setMaxLen] = useState('');
  const [maxGt, setMaxGt] = useState('');
  const licenseTypes = [
    { key: 'coastal', label: t('Coastal / Nearshore', 'ساحلي') },
    { key: 'offshore', label: t('Offshore', 'بحري') },
    { key: 'yachtmaster', label: t('Yachtmaster', 'ماستر يخوت') },
    { key: 'master200', label: t('Master 200 GT', 'ماستر 200') },
    { key: 'master500', label: t('Master 500 GT', 'ماستر 500') },
  ];
  const save = async () => {
    const payload: Partial<Profile> & { coverage: string; license: string; maxBoatLength: string; maxGt: string } = {
      providerType: 'marine-captain',
      coverage,
      license,
      maxBoatLength: maxLen.trim(),
      maxGt: maxGt.trim(),
    };
    await saveProfile(payload);
    nav.popToRoot();
    nav.switchTab('home');
  };
  return (
    <Screen>
      <OnboardHeader title={t('Marine Captain', 'ربّان بحري')} sub={t('Provide coverage & license details', 'أدخل تفاصيل التغطية والرخصة')} />
      <Body contentStyle={{ paddingTop: 14 }}>
        <Txt size={14} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 10 }}>
          {t('Coverage', 'التغطية')}
        </Txt>
        <Seg value={coverage} onChange={setCoverage} options={[{ key: 'intl', label: t('International & Domestic', 'دولي ومحلي') }, { key: 'domestic', label: t('Domestic Only', 'محلي فقط') }]} style={{ marginBottom: 18 }} />
        <Select label={t('Captain license type', 'نوع رخصة الربّان')} placeholder={t('Select license type', 'اختر نوع الرخصة')} value={license} options={licenseTypes} onChange={setLicense} />
        <Row gap={12}>
          <View style={{ flex: 1 }}>
            <Field label={t('Max boat length (m)', 'أقصى طول للقارب (م)')} ph="e.g. 24" value={maxLen} onChangeText={setMaxLen} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('Max GT (optional)', 'أقصى حمولة (اختياري)')} ph="e.g. 100" value={maxGt} onChangeText={setMaxGt} keyboardType="number-pad" />
          </View>
        </Row>
      </Body>
      <FooterBar left={t('Cancel', 'إلغاء')} right={t('Save & continue', 'حفظ ومتابعة')} onLeft={nav.pop} onRight={save} />
    </Screen>
  );
}
