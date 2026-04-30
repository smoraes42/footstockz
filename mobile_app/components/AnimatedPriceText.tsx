import React, { useEffect, useRef } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
  prefix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const AnimatedPriceText: React.FC<Props> = ({
  value,
  style,
  suffix = ' €',
  prefix = '',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    scale.value = withSequence(
      withTiming(1.03, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 450, easing: Easing.in(Easing.ease) })
    );

    glow.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 450, easing: Easing.in(Easing.ease) })
    );
  }, [value, scale, glow]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      textShadowColor: `rgba(57, 255, 20, ${glow.value * 0.4})`,
      textShadowRadius: glow.value * 20,
      textShadowOffset: { width: 0, height: 0 },
    };
  });

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {prefix}{value.toLocaleString('es-ES', { minimumFractionDigits, maximumFractionDigits })}{suffix}
    </Animated.Text>
  );
};
