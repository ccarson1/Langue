// screens/LoginScreen.js
import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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
import CustomPopup from './components/CustomPopup';
import config from '../utils/config';



export default function LoginScreen({ navigation }) {
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  const server = config.SERVER_IP;

  const showSuccess = (message) => {
    setPopup({ visible: true, message: message, type: 'success' });
  };

  const showError = (message) => {
    setPopup({ visible: true, message: message, type: 'error' });
  };

  const handleLogin = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://${server}:8000/api/token/`, {
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
        showError(`Error: ${data.error || 'Login failed.'}`)
        Alert.alert('Error', data.error || 'Login failed.');
      }
    } catch (err) {
      showError(`Login error: ${err}`)
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

        <TouchableOpacity onPress={() => navigation.navigate('ResetPasswordScreen')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity  onPress={() => navigation.navigate('Signup')} >
          <Text style={styles.forgot} >Sign up now</Text>
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


