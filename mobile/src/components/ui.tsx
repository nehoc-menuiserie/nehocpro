import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCatalog } from '../catalog';
import { isUndefinedColor, ralHex, WOOD_GRADIENTS } from '../constants';
import { colors, radius } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressScale({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress?: () => void;
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={[anim, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const palette = {
    primary: { bg: colors.silverSoft, color: colors.bg, border: 'transparent' },
    secondary: { bg: colors.surface2, color: colors.text, border: colors.border },
    ghost: { bg: 'transparent', color: colors.silver, border: 'transparent' },
    danger: { bg: colors.dangerBg, color: colors.danger, border: '#5A2A2A' },
    outline: { bg: 'transparent', color: colors.text, border: colors.border },
  }[variant];
  return (
    <PressScale onPress={onPress} disabled={disabled} style={style}>
      <View
        style={[
          styles.btn,
          { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : 1 },
        ]}
      >
        <Text style={[styles.btnText, { color: palette.color }]}>{title}</Text>
      </View>
    </PressScale>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted2}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Sélectionner',
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o || placeholder } : o));
  const current = items.find((i) => i.value === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <PressScale onPress={() => setOpen(true)}>
        <View style={styles.select}>
          <Text style={[styles.selectText, !value && { color: colors.muted2 }]}>
            {current?.label || placeholder}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </View>
      </PressScale>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label || 'Choisir'}</Text>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {items.map((item) => (
                <Pressable
                  key={item.value || 'empty'}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[styles.option, item.value === value && styles.optionActive]}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function ColorSwatch({ value, size = 36 }: { value: string; size?: number }) {
  const catalog = useCatalog();
  const wood = WOOD_GRADIENTS[value];
  const hex = catalog.colorHex(value) || ralHex(value);
  const undefinedColor = isUndefinedColor(value);
  if (wood) {
    return (
      <LinearGradient
        colors={wood}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.swatch, { width: size, height: size, borderRadius: size * 0.22 }]}
      />
    );
  }
  return (
    <View
      style={[
        styles.swatch,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: undefinedColor ? '#2A2A2E' : hex || '#fff',
        },
      ]}
    >
      {undefinedColor ? <Text style={styles.swatchQ}>?</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  field: { marginBottom: 12 },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  select: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { color: colors.text, fontSize: 16, flex: 1, paddingRight: 8 },
  chevron: { color: colors.silver, fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 32,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetScroll: { maxHeight: 420 },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  option: {
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionActive: { backgroundColor: colors.surface2, borderRadius: 10, borderBottomWidth: 0 },
  optionText: { color: colors.silverSoft, fontSize: 16 },
  optionTextActive: { color: colors.text, fontWeight: '700' },
  swatch: {
    borderWidth: 1,
    borderColor: '#6A6A70',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchQ: { color: colors.muted, fontWeight: '800' },
});
