import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';


import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ResetPasswordConfirmScreen from './screens/ResetPasswordConfirmScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import LessonsScreen from './screens/LessonsScreen';
import ListeningScreen from './screens/ListeningScreen';
import ImportScreen from './screens/ImportScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccountScreen from './screens/AccountScreen';
import LiveTVScreen from './screens/LiveTVScreen';

import LessonEditScreen from './screens/LessonEditScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await Font.loadAsync({});
        // any other startup tasks here
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setAppIsReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [appIsReady]);

  if (!appIsReady) return null;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#222831" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Lessons" component={LessonsScreen} />
          <Stack.Screen name="LessonEdit" component={LessonEditScreen} />
          <Stack.Screen name="Listening" component={ListeningScreen} />
          <Stack.Screen name="Import" component={ImportScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
          <Stack.Screen name="LiveTVScreen" component={LiveTVScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}