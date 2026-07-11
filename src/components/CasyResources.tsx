/**
 * CasyResources - shows resources Casy has saved or recommended for the user,
 * used inside each screen's "For You" section. Tappable phone and website.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { PlanRecommendation } from '../types';
import { CasyAvatar } from './CasyAvatar';

interface Props {
  resources: PlanRecommendation[];
  isSpanish: boolean;
}

export const CasyResources: React.FC<Props> = ({ resources, isSpanish }) => {
  if (!resources || resources.length === 0) return null;

  // De-dupe by org name / title.
  const seen = new Set<string>();
  const items = resources.filter((r) => {
    const k = `${r.resourceName || r.title}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <CasyAvatar size={22} />
        <Text style={styles.label}>{isSpanish ? 'DE CASY, PARA TI' : 'FROM CASY, FOR YOU'}</Text>
      </View>
      {items.map((r, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.name}>{r.resourceName || r.title}</Text>
          {!!r.address && <Text style={styles.addr}>📍 {r.address}</Text>}
          {!!r.why && <Text style={styles.why}>{r.why}</Text>}
          {(!!r.phone || !!r.website) && (
            <View style={styles.links}>
              {!!r.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${r.phone!.replace(/[^0-9]/g, '')}`)}
                >
                  <Text style={styles.link}>📞 {r.phone}</Text>
                </TouchableOpacity>
              )}
              {!!r.website && (
                <TouchableOpacity onPress={() => Linking.openURL(r.website!)}>
                  <Text style={styles.link}>🌐 {isSpanish ? 'Sitio web' : 'Website'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '800', color: '#0D9488', letterSpacing: 0.8 },
  card: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  name: { fontSize: 15.5, fontWeight: '700', color: '#0F172A' },
  addr: { fontSize: 13, color: '#475569', marginTop: 3 },
  why: { fontSize: 13, color: '#475569', lineHeight: 19, marginTop: 3 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  link: { fontSize: 14, color: '#0D9488', fontWeight: '800' },
});
