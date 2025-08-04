import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/SignupStyles';
import AntDesign from '@expo/vector-icons/AntDesign';
import LogoutButton from './components/LogoutButton';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(null);

useEffect(() => {
  const fetchToken = async () => {
    const storedToken = await AsyncStorage.getItem('accessToken');
    setToken(storedToken);

    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        console.log('User info from token:', decoded);
      } catch (err) {
        console.error('Failed to decode token:', err);
      }
    }
  };

  const fetchAccountInfo = async () => {
    await fetchToken(); // <-- wait for token before continuing

    const accessToken = await AsyncStorage.getItem('accessToken');
    try {
      const response = await fetch('http://192.168.1.5:8000/api/account/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }

      const data = await response.json();
      setUsername(data.username);
      setEmail(data.email);
      console.log('Account info:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  fetchAccountInfo();
}, []);

  const handleSignup = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    try {
      const response = await fetch('http://192.168.1.5:8000/api/account', {
        method: 'PUT', // This should be PUT if you're updating the account
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Update failed', data.error || 'Unknown error');
      } else {
        Alert.alert('Success', 'Account updated successfully!');
        navigation.navigate('Login');
      }
    } catch (error) {
      Alert.alert('Update error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="back" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.signupBox}>
        <Text style={styles.heading}>Account</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#aaa"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Update Account</Text>
        </TouchableOpacity>

        <Text style={styles.loginLink}>
          Want to log out?{' '}
          <Text style={styles.loginLinkText}>
            <LogoutButton style={styles.loginLinkText} />
          </Text>
        </Text>
      </View>
    </View>
  );
}
