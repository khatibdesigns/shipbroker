import React from 'react';
import { View, Pressable } from 'react-native';
import { colors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { Icon, IconName } from '../components/Icon';
import { Card, Row, Txt, Avatar, ModeBadge, Button, Rating, RouteArrow } from '../components/ui';

export function CarrierRow({
  initials,
  name,
  rating,
  delivered,
  modes,
  onPress,
}: {
  initials: string;
  name: string;
  rating: string;
  delivered: string;
  modes: ('air' | 'road' | 'sea')[];
  onPress?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress}>
      <Row gap={12} style={{ paddingVertical: 11 }}>
        <Avatar initials={initials} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={14.5} weight="bold" numberOfLines={1}>
            {name}
          </Txt>
          <Row gap={8} style={{ marginTop: 3 }}>
            <Rating value={rating} />
            <Txt size={12} weight="semibold" color={colors.textTertiary}>
              · {t('Delivered', 'تم التوصيل')}: {delivered}
            </Txt>
          </Row>
        </View>
        <Row gap={5}>
          {modes.map((m) => (
            <ModeBadge key={m} mode={m} small style={{ paddingHorizontal: 7 }} />
          ))}
        </Row>
      </Row>
    </Pressable>
  );
}

// Available-package card (Carry feed + Home carry). Tap → detail.
export function PackageCard({
  icon,
  item,
  from,
  to,
  weight,
  fit,
  eta,
  urgent,
  onPress,
}: {
  icon: IconName;
  item: string;
  from: string;
  to: string;
  weight: string;
  fit: string;
  eta: string;
  urgent?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ padding: 15, marginBottom: 12 }}>
        <Row gap={13} align="flex-start">
          <Avatar icon={icon} size={48} rounded={13} bg={colors.surfaceMuted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row justify="space-between">
              <Txt size={15} weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                {item}
              </Txt>
              <ModeBadge
                label={eta}
                small
                bg={urgent ? 'rgba(255,77,79,0.12)' : colors.surfaceMuted}
                color={urgent ? colors.error : colors.textSecondary}
              />
            </Row>
            <Row gap={6} style={{ marginTop: 4 }}>
              <Txt size={13} weight="semibold" color={colors.textSecondary}>
                {from}
              </Txt>
              <RouteArrow size={13} />
              <Txt size={13} weight="semibold" color={colors.textSecondary}>
                {to}
              </Txt>
            </Row>
            <Row gap={8} style={{ marginTop: 9 }}>
              <Pill label={weight} />
              <Pill label={fit} />
            </Row>
          </View>
        </Row>
      </Card>
    </Pressable>
  );
}

// Non-interactive attribute pill (so it never steals a tap from the parent cell).
function Pill({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Txt size={12.5} weight="semibold">
        {label}
      </Txt>
    </View>
  );
}
