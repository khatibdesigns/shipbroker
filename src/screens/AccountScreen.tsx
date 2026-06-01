import React from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useAuth } from '../lib/auth';
import { Screen, Body, Row, Txt, Card, Badge, BottomNav, LangToggle, Avatar, Hr, RouteArrow } from '../components/ui';
import { Icon, IconName } from '../components/Icon';

function LinkRow({ icon, label, sub, onPress, danger }: { icon: IconName; label: string; sub?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress}>
      <Row gap={13} style={{ paddingVertical: 13 }}>
        <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: danger ? 'rgba(255,77,79,0.1)' : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={danger ? colors.error : colors.brandTeal} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="bold" color={danger ? colors.error : colors.textPrimary}>
            {label}
          </Txt>
          {!!sub && (
            <Txt size={12.5} weight="semibold" color={colors.textSecondary}>
              {sub}
            </Txt>
          )}
        </View>
        {!danger && <RouteArrow />}
      </Row>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt size={12} weight="bold" color={colors.textTertiary} style={{ letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 22, marginBottom: 6, marginHorizontal: 2 }}>
      {children}
    </Txt>
  );
}

export default function AccountScreen() {
  const { t } = useI18n();
  const nav = useNav();
  const { profile, signOut } = useAuth();
  const displayName = profile.name || profile.company?.name || t('Ahmed Al-Kuwaiti', 'أحمد الكويتي');
  const displayPhone = profile.phone || profile.company?.phone || '+965 5000 0000';
  return (
    <Screen>
      <Row style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
        <Txt size={22} weight="bold" style={{ flex: 1 }}>
          {t('Account', 'حسابي')}
        </Txt>
        <LangToggle />
      </Row>
      <Body>
        {/* Profile header */}
        <LinearGradient colors={gradients.send as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#7D8BFF', opacity: 0.35, top: -50, right: -40 }} />
          <Row gap={14}>
            <Avatar initials={(displayName[0] || 'A').toUpperCase()} size={56} bg="rgba(255,255,255,0.18)" color="#fff" />
            <View style={{ flex: 1 }}>
              <Txt size={18} weight="extrabold" color="#fff">
                {displayName}
              </Txt>
              <Txt size={13} weight="semibold" color="rgba(255,255,255,0.8)">
                {displayPhone}
              </Txt>
            </View>
          </Row>
          <Badge label={t('Secure Payments · Escrow protected', 'دفع آمن · محمي بالضمان')} icon="shield" onDark style={{ alignSelf: 'flex-start', marginTop: 14 }} />
        </LinearGradient>

        <SectionLabel>{t('Create a request', 'إنشاء طلب')}</SectionLabel>
        <Card>
          <View style={{ paddingHorizontal: 14 }}>
            <LinkRow icon="sparkle" label={t('Send with AI Agent', 'أرسل بمساعد الذكاء')} sub={t('Conversational, one question at a time', 'محادثة، سؤال واحد في كل مرة')} onPress={() => nav.push('AiAgent')} />
            <Hr />
            <LinkRow icon="list" label={t('Create Shipment (Wizard)', 'إنشاء شحنة (المعالج)')} sub={t('5-step structured form', 'نموذج من 5 خطوات')} onPress={() => nav.push('WizardStep1')} />
            <Hr />
            <LinkRow icon="offers" label={t('Services & Quick RFQ', 'الخدمات والطلب السريع')} sub={t('Browse services, build an RFQ', 'تصفّح الخدمات وأنشئ طلباً')} onPress={() => nav.push('ServicesGrid')} />
            <Hr />
            <LinkRow icon="cube" label={t('Combined RFQ cart', 'سلة الطلب المجمّع')} sub={t('Bundle multiple services', 'اجمع عدة خدمات')} onPress={() => nav.push('ServicesAdd')} />
          </View>
        </Card>

        <SectionLabel>{t('Carry & earn', 'وصّل واربح')}</SectionLabel>
        <Card>
          <View style={{ paddingHorizontal: 14 }}>
            <LinkRow icon="box" label={t('Available packages', 'الطرود المتاحة')} sub={t('Find packages to carry', 'ابحث عن طرود لتوصيلها')} onPress={() => nav.push('AvailablePackages')} />
            <Hr />
            <LinkRow icon="ship" label={t('Become a service provider', 'كن مزوّد خدمة')} sub={t('Company, trucking, winch, marine', 'شركة، شاحنات، ونش، بحري')} onPress={() => nav.push('RegisterProvider')} />
          </View>
        </Card>

        <SectionLabel>{t('Account', 'الحساب')}</SectionLabel>
        <Card>
          <View style={{ paddingHorizontal: 14 }}>
            <LinkRow icon="pin" label={t('Track a shipment', 'تتبع شحنة')} onPress={() => nav.push('TrackDetail')} />
            <Hr />
            <LinkRow icon="edit" label={t('Edit personal details', 'تعديل البيانات الشخصية')} onPress={() => nav.push('CreateAccount')} />
            <Hr />
            <LinkRow icon="close" label={t('Sign out', 'تسجيل الخروج')} danger onPress={async () => { await signOut(); nav.popToRoot(); nav.push('Welcome'); }} />
          </View>
        </Card>

        <Txt size={12} weight="semibold" color={colors.textTertiary} align="center" style={{ marginTop: 22 }}>
          {t('ShipBroker · Version 1.0', 'شيب بروكر · الإصدار 1.0')}
        </Txt>
      </Body>
      <BottomNav />
    </Screen>
  );
}
