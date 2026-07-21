import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

import { SafeAreaProvider } from 'react-native-safe-area-context';

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
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ResetPasswordConfirmScreen from './screens/ResetPasswordConfirmScreen';
import AddSentenceScreen from './screens/AddSentenceScreen';
import AlphabetScreen from './screens/AlphabetScreen';
import StatisticsScreen from './screens/StatisticsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await Font.loadAsync({});
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
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Lessons" component={LessonsScreen} />
          <Stack.Screen name="LessonEdit" component={LessonEditScreen} />
          <Stack.Screen name="AddSentence" component={AddSentenceScreen} />
          <Stack.Screen name="Listening" component={ListeningScreen} />
          <Stack.Screen name="Import" component={ImportScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="Alphabet" component={AlphabetScreen} />
          <Stack.Screen name="Statistics" component={StatisticsScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
          <Stack.Screen name="LiveTVScreen" component={LiveTVScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}