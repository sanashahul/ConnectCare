import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  showLabel = true,
  label,
}) => {
  const progress = (current / total) * 100;

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>
          {label || `${current} of ${total}`}
        </Text>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  track: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
});
