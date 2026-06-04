import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from './styles/LoginStyles';
import LoadingOverlay from './components/LoadingOverlay';
import CustomPopup from './components/CustomPopup';
import config, { getServerIP, saveServerIP } from '../utils/config';

export default function LoginScreen({ navigation }) {
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [serverIP, setServerIP] = useState(config.SERVER_IP); // pre-fill with default
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });

  // Load saved IP on mount
  useEffect(() => {
    getServerIP().then(ip => setServerIP(ip));
  }, []);

  const showError = (message) => {
    setPopup({ visible: true, message, type: 'error' });
  };

  const handleLogin = async () => {
    if (!serverIP.trim()) {
      showError('Please enter a server IP address.');
      return;
    }

    setLoading(true);
    try {
      // Save the IP before attempting login
      await saveServerIP(serverIP.trim());

      const response = await fetch(`http://${serverIP.trim()}:8000/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        await AsyncStorage.setItem('accessToken', data.access);
        await AsyncStorage.setItem('refreshToken', data.refresh);
        Alert.alert('Success', 'Login successful!');
        navigation.replace('Home');
      } else {
        showError(`Error: ${data.error || 'Login failed.'}`);
      }
    } catch (err) {
      setLoading(false);
      showError(`Login error: ${err}`);
      console.error('Login error:', err);
      Alert.alert('Error', 'An error occurred during login.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="left" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.loginBox}>
        <Text style={styles.heading}>Login</Text>

        {/* Server IP input */}
        <Text style={styles.label}>Server IP</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 10.6.96.21"
          placeholderTextColor="#ccc"
          autoCapitalize="none"
          keyboardType="numeric"
          value={serverIP}
          onChangeText={setServerIP}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="#ccc"
          autoCapitalize="none"
          value={username}
          onChangeText={setUser}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="#ccc"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ResetPasswordScreen')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.forgot}>Sign up now</Text>
        </TouchableOpacity>
      </View>

      <CustomPopup
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ ...popup, visible: false })}
      />
      <LoadingOverlay visible={loading} />
    </View>
  );
}