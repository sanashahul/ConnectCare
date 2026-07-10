/**
 * CasyAvatar - a small, friendly brand mark for the AI case manager "Casy".
 * A rounded badge with a simple smiling face and a little antenna, drawn with
 * plain Views (no image asset or SVG dependency), so it stays crisp at any size.
 */
import React from 'react';
import { View } from 'react-native';

interface Props {
  size?: number;
  /** Badge background. Use 'transparent' when placing on an already-colored button. */
  bg?: string;
  /** Face color (eyes, smile, antenna). */
  face?: string;
}

export const CasyAvatar: React.FC<Props> = ({ size = 40, bg = '#0D9488', face = '#FFFFFF' }) => {
  const eye = Math.max(3, Math.round(size * 0.11));
  const eyeGap = Math.round(size * 0.2);
  const mouthW = Math.round(size * 0.44);
  const mouthH = Math.round(mouthW * 0.5);
  const stroke = Math.max(2, Math.round(size * 0.07));
  const antenna = Math.max(3, Math.round(size * 0.1));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* antenna */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          width: antenna,
          height: antenna,
          borderRadius: antenna / 2,
          backgroundColor: face,
        }}
      />
      {/* eyes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: size * 0.14, marginBottom: size * 0.09 }}>
        <View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: face }} />
        <View style={{ width: eyeGap }} />
        <View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: face }} />
      </View>
      {/* smile */}
      <View
        style={{
          width: mouthW,
          height: mouthH,
          borderBottomWidth: stroke,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderTopWidth: 0,
          borderColor: face,
          borderBottomLeftRadius: mouthW,
          borderBottomRightRadius: mouthW,
        }}
      />
    </View>
  );
};
