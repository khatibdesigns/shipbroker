import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, Image, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, fonts, fontFor } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useShipments } from '../lib/shipments';
import { useCatalog, buildOffers } from '../lib/catalog';
import { ShipmentDraft } from '../lib/ai';
import { useAiChat, UiMsg } from '../lib/aichat';
import { Screen, Row, Txt, Bubble, Chip, Card, Avatar, Button, Skeleton, Att, IconButton, LangToggle, RouteArrow } from '../components/ui';
import { Fade } from '../components/anim';
import { Icon } from '../components/Icon';

function AgentBar({ onNew, canReset }: { onNew?: () => void; canReset?: boolean }) {
  const { t } = useI18n();
  const nav = useNav();
  return (
    <Row gap={12} style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <IconButton name="back" flip onPress={nav.canGoBack ? nav.pop : undefined} />
      <Row gap={10} style={{ flex: 1 }}>
        <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="sparkle" size={20} color="#fff" sw={2} />
        </LinearGradient>
        <View style={{ minWidth: 0 }}>
          <Txt size={15.5} weight="bold">
            {t('AI Agent', 'مساعد الذكاء')}
          </Txt>
          <Row gap={5} style={{ marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
            <Txt size={12} weight="semibold" color={colors.textSecondary}>
              {t('Online', 'متصل')}
            </Txt>
          </Row>
        </View>
      </Row>
      {canReset && (
        <Pressable onPress={onNew} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="plus" size={16} sw={2.2} color={colors.brandTeal} />
          <Txt size={13} weight="bold" color={colors.brandTeal}>
            {t('New', 'جديد')}
          </Txt>
        </Pressable>
      )}
      <LangToggle />
    </Row>
  );
}

function TypingBubble() {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, borderBottomLeftRadius: 6, flexDirection: 'row', gap: 6 }}>
      <ActivityIndicator size="small" color={colors.textSecondary} />
    </View>
  );
}

function DraftSummary({ draft }: { draft: ShipmentDraft }) {
  const { t } = useI18n();
  const weight = draft.weightKg != null ? `${draft.weightKg.toLocaleString()} kg` : draft.size ? sizeLabel(t, draft.size) : '—';
  return (
    <Card style={{ padding: 15, alignSelf: 'stretch', marginTop: 2 }}>
      <Row gap={12} style={{ marginBottom: 13 }}>
        <Avatar icon={iconForCategory(draft.category)} size={44} rounded={12} bg={colors.surfaceMuted} />
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="bold">
            {draft.item || t('Shipment', 'شحنة')}
          </Txt>
          {(draft.fromCity || draft.toCity) && (
            <Row gap={6} style={{ marginTop: 3 }}>
              <Txt size={13} weight="semibold" color={colors.textSecondary}>
                {draft.fromCity || '—'}
              </Txt>
              <RouteArrow size={13} />
              <Txt size={13} weight="semibold" color={colors.textSecondary}>
                {draft.toCity || '—'}
              </Txt>
            </Row>
          )}
        </View>
        {draft.mode && (
          <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Txt size={11} weight="bold" color={colors.textSecondary} style={{ textTransform: 'uppercase' }}>
              {t(cap(draft.mode), draft.mode === 'sea' ? 'بحر' : draft.mode === 'air' ? 'جو' : 'بر')}
            </Txt>
          </View>
        )}
      </Row>
      <Row gap={10} style={{ paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Att label={t('Weight', 'الوزن')} val={weight} />
        <Att label={t('Size', 'الحجم')} val={draft.size ? sizeLabel(t, draft.size) : '—'} />
        <Att label={t('Timing', 'التوقيت')} val={draft.timing || '—'} />
      </Row>
    </Card>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// Translate a shipment size token to a natural label in the active language.
function sizeLabel(t: (en: string, ar?: string) => string, size?: string | null) {
  const k = (size || '').toLowerCase();
  if (k === 'small') return t('Small', 'صغير');
  if (k === 'medium') return t('Medium', 'متوسط');
  if (k === 'large') return t('Large', 'كبير');
  return size ? cap(size) : '—';
}
function iconForCategory(c?: string | null): any {
  const k = (c || '').toLowerCase();
  if (k.includes('vehicle') || k.includes('car')) return 'car';
  if (k.includes('boat') || k.includes('yacht')) return 'boat';
  if (k.includes('doc')) return 'doc';
  return 'cube';
}

export default function AiAgentScreen({ carrierId }: { carrierId?: string }) {
  const { t, isRTL } = useI18n();
  const nav = useNav();
  const { create } = useShipments();
  const { carriers, getCarrier } = useCatalog();
  const { messages, draft, chips, ready, loading, started, carrier, send, reset, startWithCarrier } = useAiChat();
  const [input, setInput] = useState('');
  const [finding, setFinding] = useState(false);
  const scroller = useRef<ScrollView>(null);

  // Opened from a carrier's "Request a quote" → scope the chat to that carrier.
  useEffect(() => {
    if (!carrierId || carrier?.id === carrierId) return;
    const c = getCarrier(carrierId);
    if (c) startWithCarrier({ id: c.id, name: c.name });
  }, [carrierId, carrier?.id, getCarrier, startWithCarrier]);

  const submitText = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    send({ text });
  };

  const pickPhoto = useCallback(async () => {
    const launch = async (camera: boolean) => {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('Permission needed', 'الإذن مطلوب'), t('Please allow access to continue.', 'يرجى السماح بالوصول للمتابعة.'));
        return;
      }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, allowsEditing: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      send({ imageBase64: a.base64 || undefined, imageMime: a.mimeType || 'image/jpeg', uri: a.uri });
    };
    Alert.alert(t('Add a photo', 'أضف صورة'), t('Show the AI agent your item.', 'أرِ المساعد الغرض.'), [
      { text: t('Take photo', 'التقاط صورة'), onPress: () => launch(true) },
      { text: t('Choose from library', 'اختر من المعرض'), onPress: () => launch(false) },
      { text: t('Cancel', 'إلغاء'), style: 'cancel' },
    ]);
  }, [send, t]);

  const findOffers = useCallback(async () => {
    const d = draft; // capture before reset clears it
    // If this chat is scoped to a carrier, bind the order to that carrier and go
    // straight to its offer — skipping the multi-carrier pick page.
    const tc = carrierId ? getCarrier(carrierId) : null;
    setFinding(true);
    const id = await create(d, tc ? { carrier: tc.name } : undefined);
    reset();
    if (tc) {
      const offers = buildOffers(d, carriers);
      const offer = offers.find((o) => o.carrierId === tc.id) || offers[0];
      setTimeout(() => nav.replace('OfferDetail', { shipmentId: id, offer }), 1800);
    } else {
      setTimeout(() => nav.replace('Offers', { shipmentId: id, draft: d }), 1800);
    }
  }, [create, draft, reset, nav, carrierId, getCarrier, carriers]);

  if (finding) {
    const Sk = () => (
      <Card style={{ padding: 15, marginBottom: 12 }}>
        <Row gap={12}>
          <Skeleton style={{ width: 46, height: 46, borderRadius: 23 }} />
          <View style={{ flex: 1 }}>
            <Skeleton style={{ width: '55%', height: 13, marginBottom: 8 }} />
            <Skeleton style={{ width: '35%', height: 11 }} />
          </View>
          <Skeleton style={{ width: 60, height: 24, borderRadius: 12 }} />
        </Row>
      </Card>
    );
    return (
      <Screen>
        <AgentBar />
        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 22 }}>
            <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="sparkle" size={30} color="#fff" sw={2} />
            </LinearGradient>
            <Txt size={18} weight="bold">
              {t('Finding the best matches…', 'نبحث عن أفضل العروض…')}
            </Txt>
            <Txt size={13.5} color={colors.textSecondary} style={{ marginTop: 5 }}>
              {t('Comparing travellers & companies', 'نقارن المسافرين والشركات')}
            </Txt>
          </View>
          <Sk />
          <Sk />
          <Sk />
          <Sk />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <AgentBar onNew={reset} canReset={started} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 18, gap: 12, flexGrow: 1 }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) => (
            <Fade key={i} dy={6} duration={220}>
              {m.uri ? (
                <Bubble from="me">
                  <Image source={{ uri: m.uri }} style={{ width: 150, height: 112, borderRadius: 12 }} />
                </Bubble>
              ) : (
                <Bubble from={m.role === 'user' ? 'me' : 'bot'}>{m.text}</Bubble>
              )}
            </Fade>
          ))}
          {loading && <TypingBubble />}
          {ready && !loading && (
            <>
              <DraftSummary draft={draft} />
              <Button label={t('FIND BEST OFFERS', 'ابحث عن أفضل العروض')} icon="sparkle" iconColor="#fff" style={{ marginTop: 2 }} onPress={findOffers} />
              <Txt size={12} weight="semibold" color={colors.textTertiary} align="center">
                {t('Takes a few seconds', 'يستغرق ثوانٍ قليلة')}
              </Txt>
            </>
          )}
        </ScrollView>

        {/* quick-reply chips */}
        {chips.length > 0 && !loading && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' }}
          >
            {chips.map((c) => (
              <Chip key={c} label={c} onPress={() => send({ text: c })} />
            ))}
          </ScrollView>
        )}

        {/* composer */}
        <Row gap={10} style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' }}>
          <IconButton name="camera" bare bg={colors.surfaceMuted} onPress={pickPhoto} />
          <View style={{ flex: 1, minHeight: 46, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, justifyContent: 'center', paddingHorizontal: 16 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('Type a message…', 'اكتب رسالة…')}
              placeholderTextColor={colors.textTertiary}
              style={{ fontFamily: fontFor(fonts.medium, isRTL), fontSize: 14.5, color: colors.textPrimary, paddingVertical: 0, textAlign: isRTL ? 'right' : 'left' }}
              onSubmitEditing={submitText}
              returnKeyType="send"
            />
          </View>
          <Pressable onPress={submitText} disabled={!input.trim() || loading}>
            <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || loading ? 0.5 : 1 }}>
              <Icon name="send" size={18} color="#fff" fill="#fff" />
            </LinearGradient>
          </Pressable>
        </Row>
      </KeyboardAvoidingView>
    </Screen>
  );
}
