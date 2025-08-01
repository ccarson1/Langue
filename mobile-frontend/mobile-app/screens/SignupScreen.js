import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import styles from './styles/SignupStyles'
import AntDesign from '@expo/vector-icons/AntDesign';
import CustomPopup from './components/CustomPopup';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });

  const showSuccess = (message) => {
    setPopup({ visible: true, message: message, type: 'success' });
  };

  const showError = (message) => {
    setPopup({ visible: true, message: message, type: 'error' });
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      showError('Error: Passwords do not match!')
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/signup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirm_password: confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(`Signup failed ${data.error || 'Unknown error'}`)
        Alert.alert('Signup failed', data.error || 'Unknown error');
      } else {
        showSuccess(`Signup successful! You can now log in.`)
        Alert.alert('Success', 'Signup successful! You can now log in.');
        navigation.navigate('Login');
      }
    } catch (error) {
      showError(`Signup error ${error.message}`)
      Alert.alert('Signup error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="back" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.signupBox}>
        <Text style={styles.heading}>Create Account</Text>

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
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <Text style={styles.loginLink}>
          Already have an account?{' '}
          <Text style={styles.loginLinkText} onPress={() => navigation.navigate('Login')}>
            Log in
          </Text>
        </Text>
      </View>
      <CustomPopup
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ ...popup, visible: false })}
      />
    </View>
  );
}



