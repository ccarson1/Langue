import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import styles from './styles/SignupStyles'
import AntDesign from '@expo/vector-icons/AntDesign';
import CustomPopup from './components/CustomPopup';
import { Picker } from '@react-native-picker/picker';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [native_language, setNative] = useState('');
  const [target_language, setTarget] = useState('');
  const [languages, setLanguages] = useState([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  const server = 'localhost';

  useEffect(() => {
    fetch(`http://${server}:8000/api/languages/`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Languages:', data);
        setLanguages(data); // Assuming you have a state variable
      })
      .catch((error) => console.error('Error fetching languages:', error));
  }, []);

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
      const response = await fetch(`http://${server}:8000/api/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirm_password: confirmPassword, native_language, target_language })
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

        <Text style={styles.label}>Native Language</Text>
        <Picker
          selectedValue={native_language}
          onValueChange={(itemValue) => setNative(itemValue)}
          style={styles.input}
        >
          <Picker.Item label="Select Native Language" value="" />
          {languages.map((lang) => (
            <Picker.Item key={lang.id} label={lang.lang_name} value={lang.id} />
          ))}
        </Picker>

        <Text style={styles.label}>Target Language</Text>
        <Picker
          selectedValue={target_language}
          onValueChange={(itemValue) => setTarget(itemValue)}
          style={styles.input}
        >
          <Picker.Item label="Select Target Language" value="" />
          {languages.map((lang) => (
            <Picker.Item key={lang.id} label={lang.lang_name} value={lang.id} />
          ))}
        </Picker>

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



