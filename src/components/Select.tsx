import React, { useState } from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { colors, radius } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { Icon } from './Icon';
import { Txt, Row } from './ui';

export type Option = { key: string; label: string };

// Tappable field that opens a bottom-sheet list to pick a single option.
export function Select({
  label,
  value,
  placeholder,
  options,
  onChange,
  icon,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  options: Option[];
  onChange: (key: string) => void;
  icon?: 'clock';
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
          {label}
        </Txt>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        style={{ minHeight: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surfaceMuted, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        {icon && <Icon name={icon} size={18} color={colors.textTertiary} />}
        <Txt size={15} weight="medium" color={selected ? colors.textPrimary : colors.textTertiary} style={{ flex: 1 }} numberOfLines={1}>
          {selected?.label || placeholder || t('Select…', 'اختر…')}
        </Txt>
        <Icon name="chevD" size={16} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,24,31,0.45)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, maxHeight: '70%' }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 6, marginBottom: 14 }} />
          {label && (
            <Txt size={18} weight="bold" align="center" style={{ marginBottom: 8 }}>
              {label}
            </Txt>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((o) => {
              const on = o.key === value;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                >
                  <Row justify="space-between" style={{ paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Txt size={15} weight={on ? 'bold' : 'medium'} color={on ? colors.textPrimary : colors.textSecondary}>
                      {o.label}
                    </Txt>
                    {on && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandTeal, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={13} color="#fff" sw={2.6} />
                      </View>
                    )}
                  </Row>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
