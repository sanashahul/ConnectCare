/**
 * Collapsible - a tappable section header that shows/hides its content.
 * Children are only mounted while open, so expensive content (like Casy's
 * generated picks) loads lazily on first expand.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Collapsible: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        {!!icon && <Text style={styles.icon}>{icon}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  icon: { fontSize: 22 },
  title: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 12.5, color: '#64748B', marginTop: 2 },
  chevron: { fontSize: 16, color: '#94A3B8', fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingBottom: 8 },
});
