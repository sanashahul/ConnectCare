import React, { useState, useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

interface ScrollToTopButtonProps {
  scrollRef: React.RefObject<ScrollView | null>;
  /**
   * Scroll offset at which the button becomes visible (default 400).
   * Below this, the button is hidden so it doesn't clutter short views.
   */
  threshold?: number;
}

/**
 * Small floating "back to top" button.
 *
 * Expects to be paired with a ScrollView whose onScroll handler calls
 * the exposed `handleScroll` — returned by the hook below so the parent
 * can wire it up in one line:
 *
 *   const { button, handleScroll } = useScrollToTop(scrollRef);
 *   <ScrollView ref={scrollRef} onScroll={handleScroll} scrollEventThrottle={16}>
 *     ...
 *   </ScrollView>
 *   {button}
 */
export const useScrollToTop = (
  scrollRef: React.RefObject<ScrollView | null>,
  threshold: number = 400,
) => {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setVisible(y > threshold);
    },
    [threshold],
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollRef]);

  const button = visible ? (
    <TouchableOpacity
      style={styles.fab}
      onPress={scrollToTop}
      activeOpacity={0.85}
    >
      <Text style={styles.fabIcon}>↑</Text>
    </TouchableOpacity>
  ) : null;

  return { button, handleScroll };
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 20,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
});
