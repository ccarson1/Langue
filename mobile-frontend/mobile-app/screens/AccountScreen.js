import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import styles from './styles/SignupStyles'
import AntDesign from '@expo/vector-icons/AntDesign';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    try {
      const response = await fetch('https://your-api.com/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirm_password: confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Signup failed', data.error || 'Unknown error');
      } else {
        Alert.alert('Success', 'Signup successful! You can now log in.');
        navigation.navigate('Login');
      }
    } catch (error) {
      Alert.alert('Signup error', error.message);
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
          <Text style={styles.loginLinkText} onPress={() => navigation.navigate('Login')}>
            Sign out
          </Text>
        </Text>
      </View>
    </View>
  );
}



