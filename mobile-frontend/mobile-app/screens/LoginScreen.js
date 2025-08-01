// screens/LoginScreen.js
import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from './styles/LoginStyles';
import LoadingOverlay from './components/LoadingOverlay';

export default function LoginScreen({ navigation }) {
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setLoading(false)
      if (response.ok) {
        
        await AsyncStorage.setItem('accessToken', data.access);
        await AsyncStorage.setItem('refreshToken', data.refresh);
        Alert.alert('Success', 'Login successful!');
        navigation.replace('Home');
        // Simulate saving and redirect
        // AsyncStorage.setItem(...), navigation.navigate('Home'), etc.
      } else {
        Alert.alert('Error', data.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An error occurred during login.');
    }
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="back" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.loginBox}>
        <Text style={styles.heading}>Login</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          placeholderTextColor="#ccc"
          autoCapitalize="none"
          keyboardType="text"
          value={username}
          onChangeText={setUser}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          placeholderTextColor="#ccc"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Alert.alert('Reset password flow coming soon!')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <Text style={styles.signup}>
          Sign up now{' '}
          <Text style={{ color: 'white' }} onPress={() => Linking.openURL('/signup')}>
            Signup
          </Text>
        </Text>
      </View>
      <LoadingOverlay visible={loading} />
    </View>
  );
}


