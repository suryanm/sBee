// A burst of stars and confetti when the child spells a word right.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const PIECES = ['⭐', '🌟', '✨', '🎉', '💛', '🍯', '⭐', '🌈'];

export default function Celebration({ trigger }: { trigger: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        emoji: PIECES[i % PIECES.length],
        angle: (i / 18) * Math.PI * 2 + Math.random() * 0.3,
        dist: 110 + Math.random() * 90,
        size: 22 + Math.random() * 16,
      })),
    // new random burst each time
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger],
  );

  useEffect(() => {
    if (!trigger) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger, progress]);

  if (!trigger) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.center}>
        {pieces.map((p, i) => {
          const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] });
          const ty = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, Math.sin(p.angle) * p.dist, Math.sin(p.angle) * p.dist + 80] });
          const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
          const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.3, 0.9] });
          return (
            <Animated.Text key={i} style={[styles.piece, { fontSize: p.size, opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}>
              {p.emoji}
            </Animated.Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: '35%', left: '50%' },
  piece: { position: 'absolute' },
});

