import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ColorValue } from 'react-native';

type Props = {
  name: string;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = 22, color = '#162035' }: Props) {
  return <Ionicons name={name as never} size={size} color={color} />;
}

