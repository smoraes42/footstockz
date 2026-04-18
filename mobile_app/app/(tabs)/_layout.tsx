import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.tint,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111', // Solid dark
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.05)',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Cartera',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "briefcase" : "briefcase-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "stats-chart" : "stats-chart-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "trophy" : "trophy-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="player/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="team/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
