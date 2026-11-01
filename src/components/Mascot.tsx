// "Buzzy" the bee: drawn with plain views and animated, so no image assets are needed.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export type Mood = 'idle' | 'listening' | 'happy' | 'oops';

export default function Mascot({ mood = 'idle', size = 160 }: { mood?: Mood; size?: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  const wing = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const wingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wing, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(wing, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]),
    );
    bobLoop.start();
    wingLoop.start();
    return () => {
      bobLoop.stop();
      wingLoop.stop();
    };
  }, [bob, wing]);

  useEffect(() => {
    if (mood === 'happy') {
      jump.setValue(0);
      Animated.sequence([
        Animated.timing(jump, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(jump, { toValue: 0, duration: 350, easing: Easing.bounce, useNativeDriver: true }),
        Animated.timing(jump, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(jump, { toValue: 0, duration: 350, easing: Easing.bounce, useNativeDriver: true }),
      ]).start();
    } else if (mood === 'oops') {
      tilt.setValue(0);
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 160, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [mood, jump, tilt]);

  const s = size / 160; // all measurements below are for a 160px bee
  const translateY = Animated.add(
    bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8 * s] }),
    jump.interpolate({ inputRange: [0, 1], outputRange: [0, -40 * s] }),
  );
  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const wingScale = wing.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

  const eyeH = mood === 'happy' ? 6 * s : 16 * s;
  const mouthStyle =
    mood === 'oops'
      ? { width: 22 * s, height: 11 * s, borderTopLeftRadius: 11 * s, borderTopRightRadius: 11 * s, borderTopWidth: 3 * s, borderBottomWidth: 0 }
      : mood === 'listening'
        ? { width: 16 * s, height: 16 * s, borderRadius: 8 * s, borderWidth: 3 * s, backgroundColor: '#B23A48' }
        : { width: 30 * s, height: 15 * s, borderBottomLeftRadius: 15 * s, borderBottomRightRadius: 15 * s, borderBottomWidth: 3 * s, borderTopWidth: 0 };

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY }, { rotate }] }}>
      {/* wings */}
      <Animated.View style={[styles.wing, { left: 34 * s, top: 6 * s, width: 44 * s, height: 56 * s, borderRadius: 28 * s, transform: [{ rotate: '-20deg' }, { scaleY: wingScale }] }]} />
      <Animated.View style={[styles.wing, { left: 82 * s, top: 6 * s, width: 44 * s, height: 56 * s, borderRadius: 28 * s, transform: [{ rotate: '20deg' }, { scaleY: wingScale }] }]} />
      {/* antennae */}
      <View style={[styles.antenna, { left: 62 * s, top: 22 * s, height: 26 * s, width: 3 * s, transform: [{ rotate: '-25deg' }] }]} />
      <View style={[styles.antenna, { left: 95 * s, top: 22 * s, height: 26 * s, width: 3 * s, transform: [{ rotate: '25deg' }] }]} />
      <View style={[styles.dot, { left: 54 * s, top: 18 * s, width: 10 * s, height: 10 * s, borderRadius: 5 * s }]} />
      <View style={[styles.dot, { left: 96 * s, top: 18 * s, width: 10 * s, height: 10 * s, borderRadius: 5 * s }]} />
      {/* body */}
      <View style={[styles.body, { left: 20 * s, top: 40 * s, width: 120 * s, height: 105 * s, borderRadius: 55 * s, borderWidth: 4 * s }]}>
        <View style={[styles.stripe, { top: 62 * s, height: 13 * s }]} />
        <View style={[styles.stripe, { top: 84 * s, height: 11 * s }]} />
        {/* eyes */}
        <View style={[styles.eye, { left: 30 * s, top: 26 * s, width: 14 * s, height: eyeH, borderRadius: 8 * s }]} />
        <View style={[styles.eye, { right: 30 * s, top: 26 * s, width: 14 * s, height: eyeH, borderRadius: 8 * s }]} />
        {/* cheeks */}
        <View style={[styles.cheek, { left: 14 * s, top: 44 * s, width: 16 * s, height: 9 * s, borderRadius: 5 * s }]} />
        <View style={[styles.cheek, { right: 14 * s, top: 44 * s, width: 16 * s, height: 9 * s, borderRadius: 5 * s }]} />
        {/* mouth */}
        <View style={{ alignSelf: 'center', marginTop: 44 * s, borderColor: '#3B2A1A', ...mouthStyle }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wing: { position: 'absolute', backgroundColor: 'rgba(200,235,255,0.9)', borderWidth: 2, borderColor: '#9CCFEA' },
  antenna: { position: 'absolute', backgroundColor: '#3B2A1A', borderRadius: 2 },
  dot: { position: 'absolute', backgroundColor: '#3B2A1A' },
  body: { position: 'absolute', backgroundColor: '#FFD23F', borderColor: '#3B2A1A', overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, right: 0, backgroundColor: '#3B2A1A' },
  eye: { position: 'absolute', backgroundColor: '#3B2A1A' },
  cheek: { position: 'absolute', backgroundColor: '#FF9AA2' },
});
