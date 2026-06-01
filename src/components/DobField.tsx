import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { colors, fonts, radius } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { Icon } from './Icon';
import { Txt, Row, Button } from './ui';

// Dependency-free date-of-birth picker (no native datetimepicker). A tappable
// field that opens a bottom sheet with three scroll columns: Day · Month · Year.
// Stores/returns a "DD/MM/YYYY" string.

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function parse(value?: string): { d: number; m: number; y: number } | null {
  if (!value) return null;
  const mm = value.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
  if (!mm) return null;
  return { d: +mm[1], m: +mm[2], y: +mm[3] };
}

const ROW = 40;
const COL_H = 200; // 5 rows; selection band is the centre row
const PAD = (COL_H - ROW) / 2;

// Scroll-snapping wheel column: the value centred under the band is selected.
function Column({
  items,
  selected,
  onSelect,
  width,
  render,
}: {
  items: number[];
  selected: number;
  onSelect: (n: number) => void;
  width: number;
  render?: (n: number) => string;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, items.indexOf(selected));

  // Align the scroll position to the selected value when the picker opens.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: idx * ROW, animated: false }), 0);
    return () => clearTimeout(id);
  }, []);

  const onEnd = (y: number) => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(y / ROW)));
    if (items[i] !== selected) onSelect(items[i]);
    ref.current?.scrollTo({ y: i * ROW, animated: true });
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width, height: COL_H }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PAD }}
      onMomentumScrollEnd={(e) => onEnd(e.nativeEvent.contentOffset.y)}
    >
      {items.map((n) => {
        const on = n === selected;
        return (
          <Pressable key={n} onPress={() => onEnd(items.indexOf(n) * ROW)} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: on ? fonts.bold : fonts.medium, fontSize: on ? 18 : 16, color: on ? colors.brandTeal : colors.textTertiary }}>
              {render ? render(n) : String(n).padStart(2, '0')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function DobField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const now = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: now - 13 - 1935 + 1 }, (_, i) => now - 13 - i), [now]); // 13..90 yrs old
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const init = parse(value) || { d: 1, m: 1, y: now - 25 };
  const [d, setD] = useState(init.d);
  const [m, setM] = useState(init.m);
  const [y, setY] = useState(init.y);

  const daysInMonth = new Date(y, m, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const monthName = (n: number) => (lang === 'ar' ? MONTHS_AR : MONTHS_EN)[n - 1];

  const openPicker = () => {
    const p = parse(value);
    if (p) {
      setD(p.d);
      setM(p.m);
      setY(p.y);
    }
    setOpen(true);
  };

  const confirm = () => {
    const dd = String(Math.min(d, daysInMonth)).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange(`${dd}/${mm}/${y}`);
    setOpen(false);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
        {label}
      </Txt>
      <Pressable
        onPress={openPicker}
        style={{
          minHeight: 50,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: radius.input,
          backgroundColor: colors.surfaceMuted,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon name="clock" size={18} color={colors.textTertiary} />
        <Txt size={15} weight="medium" color={value ? colors.textPrimary : colors.textTertiary} style={{ flex: 1 }}>
          {value || 'DD / MM / YYYY'}
        </Txt>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,24,31,0.45)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 6, marginBottom: 14 }} />
          <Txt size={18} weight="bold" align="center" style={{ marginBottom: 12 }}>
            {t('Date of birth', 'تاريخ الميلاد')}
          </Txt>
          <View style={{ position: 'relative' }}>
            {/* selection guide band */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 80, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,180,196,0.08)' }} />
            <Row justify="space-around" align="flex-start">
              <Column key={`d${daysInMonth}`} items={days} selected={Math.min(d, daysInMonth)} onSelect={setD} width={64} />
              <Column items={months} selected={m} onSelect={setM} width={120} render={monthName} />
              <Column items={years} selected={y} onSelect={setY} width={80} />
            </Row>
          </View>
          <Button label={t('Done', 'تم')} style={{ marginTop: 12 }} onPress={confirm} />
        </View>
      </Modal>
    </View>
  );
}
