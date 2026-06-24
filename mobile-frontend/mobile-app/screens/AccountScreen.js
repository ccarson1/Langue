import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import AntDesign from '@expo/vector-icons/AntDesign';
import LogoutButton from './components/LogoutButton';
import { getServerIP } from '../utils/config';

export default function AccountScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(null);
  const [serverIP, setServerIP] = useState('');
  
  // Storage state
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(1024); // Default: 1GB in MB

  useEffect(() => {
    const loadIP = async () => {
      const ip = await getServerIP();
      setServerIP(ip);
    };
    loadIP();
  }, []);

  useEffect(() => {
    if (!serverIP) return;

    const fetchAccountInfo = async () => {
      const storedToken = await AsyncStorage.getItem('accessToken');
      setToken(storedToken);

      if (!storedToken) return;

      try {
        const response = await fetch(`http://${serverIP}:8000/api/account/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch account info');
        }

        const data = await response.json();
        
        setUsername(data.username || '');
        setEmail(data.email || '');
        
        // Storage data from backend (adjust property names to match your API)
        setStorageUsed(data.storage_used || 30);
        setStorageTotal(data.storage_total || 125); // e.g., in MB

        console.log('Account info:', data);
      } catch (error) {
        console.error('Error fetching account info:', error);
      }
    };

    fetchAccountInfo();
  }, [serverIP]);

  const handleUpdate = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    try {
      const response = await fetch(`http://${serverIP}:8000/api/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Update failed', data.error || 'Unknown error');
      } else {
        Alert.alert('Success', 'Account updated successfully!');
        // Optionally navigate or refresh
      }
    } catch (error) {
      Alert.alert('Update error', error.message);
    }
  };

  // Calculate storage percentage
  const storagePercentage = storageTotal > 0 
    ? Math.min(Math.max(Math.round((storageUsed / storageTotal) * 100), 0), 100) 
    : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="left" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.accountBox}>
        <Text style={styles.heading}>Account</Text>

        {/* Storage Capacity Bar */}
        <View style={styles.storageSection}>
          <Text style={styles.label}>Storage</Text>
          <View style={styles.storageBarContainer}>
            <View style={styles.storageBarBackground}>
              <View 
                style={[
                  styles.storageBarFill, 
                  { width: `${storagePercentage}%` }
                ]} 
              />
            </View>
          </View>
          <View style={styles.storageInfo}>
            <Text style={styles.storageText}>
              {storageUsed} MB of {storageTotal} MB used
            </Text>
            <Text style={styles.storagePercentage}>
              {storagePercentage}%
            </Text>
          </View>
        </View>

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

        <Text style={styles.label}>New Password</Text>
        <TextInput 
          style={styles.input} 
          placeholder="New Password (optional)" 
          placeholderTextColor="#aaa" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Confirm New Password" 
          placeholderTextColor="#aaa" 
          value={confirmPassword} 
          onChangeText={setConfirmPassword} 
          secureTextEntry 
        />

        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Update Account</Text>
        </TouchableOpacity>

        <Text style={styles.loginLink}>
          Want to log out?{' '}
          <LogoutButton style={styles.loginLinkText} />
        </Text>
      </View>
    </View>
  );
}

// Updated styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222831',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLink: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  accountBox: {
    backgroundColor: '#393e46',
    padding: 24,
    marginTop: Platform.select({ web: 80, default: 40 }),
    marginBottom: Platform.select({ web: 80, default: 40 }),
    borderRadius: 10,
    width: "80%",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  heading: {
    fontSize: 24,
    color: '#eeeeee',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#eeeeee',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#222831',
    color: '#eeeeee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#00adb5',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    textAlign: 'center',
    color: '#222831',
    fontWeight: '600',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 16,
    fontSize: 14,
    color: '#eeeeeecc',
    textAlign: 'center',
  },
  loginLinkText: {
    color: '#00adb5',
    textDecorationLine: 'underline',
  },

  // Storage Bar Styles
  storageSection: {
    marginBottom: 20,
    backgroundColor: '#2c3239',
    padding: 12,
    borderRadius: 8,
  },
  storageBarContainer: {
    marginVertical: 8,
  },
  storageBarBackground: {
    height: 12,
    backgroundColor: '#555',
    borderRadius: 6,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: '#00adb5',
    borderRadius: 6,
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  storageText: {
    color: '#eeeeee',
    fontSize: 14,
  },
  storagePercentage: {
    color: '#00adb5',
    fontSize: 14,
    fontWeight: '600',
  },
});