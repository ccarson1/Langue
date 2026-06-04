// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
// import styles from './styles/SignupStyles'
// import AntDesign from '@expo/vector-icons/AntDesign';
// import CustomPopup from './components/CustomPopup';
// import { Picker } from '@react-native-picker/picker';
// import { getServerIP } from '../utils/config';

// export default function SignupScreen({ navigation }) {
//   const [username, setUsername] = useState('');
//   const [email, setEmail] = useState('');
//   const [native_language, setNative] = useState('');
//   const [target_language, setTarget] = useState('');
//   const [languages, setLanguages] = useState([]);
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
//   const [serverIP, setServerIP] = useState('');

//   useEffect(() => {
//     const loadIP = async () => {
//       const ip = await getServerIP();
//       setServerIP(ip);
//     };
//     loadIP();
//   }, []);

//   useEffect(() => {
//     if (!serverIP) return;
//     fetch(`http://${serverIP}:8000/api/languages/`)
//       .then((res) => res.json())
//       .then((data) => {
//         console.log('Languages:', data);
//         setLanguages(data); // Assuming you have a state variable
//       })
//       .catch((error) => console.error('Error fetching languages:', error));
//   }, []);

//   const showSuccess = (message) => {
//     setPopup({ visible: true, message: message, type: 'success' });
//   };

//   const showError = (message) => {
//     setPopup({ visible: true, message: message, type: 'error' });
//   };

//   const handleSignup = async () => {
//     if (password !== confirmPassword) {
//       showError('Error: Passwords do not match!')
//       Alert.alert('Error', 'Passwords do not match!');
//       return;
//     }

//     try {
//       const response = await fetch(`http://${serverIP}:8000/api/signup/`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, email, password, confirm_password: confirmPassword, native_language, target_language })
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         showError(`Signup failed ${data.error || 'Unknown error'}`)
//         Alert.alert('Signup failed', data.error || 'Unknown error');
//       } else {
//         showSuccess(`Signup successful! You can now log in.`)
//         Alert.alert('Success', 'Signup successful! You can now log in.');
//         navigation.navigate('Login');
//       }
//     } catch (error) {
//       showError(`Signup error ${error.message}`)
//       Alert.alert('Signup error', error.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
//         <AntDesign name="left" size={22} color="white" />
//       </TouchableOpacity>

//       <View style={styles.signupBox}>
//         <Text style={styles.heading}>Create Account</Text>

//         <Text style={styles.label}>Username</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Username"
//           placeholderTextColor="#aaa"
//           value={username}
//           onChangeText={setUsername}
//           autoCapitalize="none"
//         />

//         <Text style={styles.label}>Email address</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           placeholderTextColor="#aaa"
//           value={email}
//           onChangeText={setEmail}
//           autoCapitalize="none"
//           keyboardType="email-address"
//         />

//         <Text style={styles.label}>Native Language</Text>
//         <Picker
//           selectedValue={native_language}
//           onValueChange={(itemValue) => setNative(itemValue)}
//           style={styles.input}
//         >
//           <Picker.Item label="Select Native Language" value="" />
//           {languages.map((lang) => (
//             <Picker.Item key={lang.id} label={lang.lang_name} value={lang.id} />
//           ))}
//         </Picker>

//         <Text style={styles.label}>Target Language</Text>
//         <Picker
//           selectedValue={target_language}
//           onValueChange={(itemValue) => setTarget(itemValue)}
//           style={styles.input}
//         >
//           <Picker.Item label="Select Target Language" value="" />
//           {languages.map((lang) => (
//             <Picker.Item key={lang.id} label={lang.lang_name} value={lang.id} />
//           ))}
//         </Picker>

//         <Text style={styles.label}>Password</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Password"
//           placeholderTextColor="#aaa"
//           value={password}
//           onChangeText={setPassword}
//           secureTextEntry
//         />

//         <Text style={styles.label}>Confirm Password</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Confirm Password"
//           placeholderTextColor="#aaa"
//           value={confirmPassword}
//           onChangeText={setConfirmPassword}
//           secureTextEntry
//         />

//         <TouchableOpacity style={styles.button} onPress={handleSignup}>
//           <Text style={styles.buttonText}>Sign Up</Text>
//         </TouchableOpacity>

//         <Text style={styles.loginLink}>
//           Already have an account?{' '}
//           <Text style={styles.loginLinkText} onPress={() => navigation.navigate('Login')}>
//             Log in
//           </Text>
//         </Text>
//       </View>
//       <CustomPopup
//         visible={popup.visible}
//         message={popup.message}
//         type={popup.type}
//         onClose={() => setPopup({ ...popup, visible: false })}
//       />
//     </View>
//   );
// }



import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import styles from './styles/SignupStyles'
import AntDesign from '@expo/vector-icons/AntDesign';
import CustomPopup from './components/CustomPopup';
import { Picker } from '@react-native-picker/picker';
import { getServerIP, saveServerIP } from '../utils/config';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [native_language, setNative] = useState('');
  const [target_language, setTarget] = useState('');
  const [languages, setLanguages] = useState([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  const [serverIP, setServerIP] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Pre-fill with any previously saved IP
  useEffect(() => {
    const loadIP = async () => {
      const ip = await getServerIP();
      if (ip) setServerIP(ip);
    };
    loadIP();
  }, []);

  const showSuccess = (message) => setPopup({ visible: true, message, type: 'success' });
  const showError = (message) => setPopup({ visible: true, message, type: 'error' });

  const handleConnect = async () => {
    if (!serverIP.trim()) {
      showError('Please enter a server IP address.');
      return;
    }

    setConnecting(true);
    setConnected(false);
    setLanguages([]);

    try {
      const res = await fetch(`http://${serverIP.trim()}:8000/api/languages/`);

      if (!res.ok) throw new Error('Server responded with an error.');

      const data = await res.json();
      setLanguages(data);
      await saveServerIP(serverIP.trim()); // save it for use across the app
      setConnected(true);
      showSuccess('Connected!');
    } catch (error) {
      console.error('Error fetching languages:', error);
      showError('Could not connect to server. Check the IP and try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSignup = async () => {
    if (!connected) {
      showError('Please connect to a server first.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match!');
      return;
    }

    try {
      const response = await fetch(`http://${serverIP}:8000/api/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirm_password: confirmPassword, native_language, target_language })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(`Signup failed: ${data.error || 'Unknown error'}`);
      } else {
        showSuccess('Signup successful! You can now log in.');
        navigation.navigate('Login');
      }
    } catch (error) {
      showError(`Signup error: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>

        <View style={styles.signupBox}>
          <Text style={styles.heading}>Create Account</Text>

          {/* Server IP + Connect */}
          <Text style={styles.label}>Server IP</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="e.g. 10.6.96.21"
              placeholderTextColor="#aaa"
              value={serverIP}
              onChangeText={(val) => {
                setServerIP(val);
                setConnected(false); // reset connection if IP changes
                setLanguages([]);
              }}
              autoCapitalize="none"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.button, { marginBottom: 0, paddingHorizontal: 16, backgroundColor: connected ? '#4CAF50' : '#007AFF' }]}
              onPress={handleConnect}
              disabled={connecting}
            >
              <Text style={styles.buttonText}>
                {connecting ? '...' : connected ? '✓' : 'Connect'}
              </Text>
            </TouchableOpacity>
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

          <Text style={styles.label}>Native Language</Text>
          <Picker
            selectedValue={native_language}
            onValueChange={(itemValue) => setNative(itemValue)}
            style={styles.input}
            enabled={connected}
          >
            <Picker.Item label={connected ? "Select Native Language" : "Connect to server first"} value="" />
            {languages.map((lang) => (
              <Picker.Item key={lang.id} label={lang.lang_name} value={lang.id} />
            ))}
          </Picker>

          <Text style={styles.label}>Target Language</Text>
          <Picker
            selectedValue={target_language}
            onValueChange={(itemValue) => setTarget(itemValue)}
            style={styles.input}
            enabled={connected}
          >
            <Picker.Item label={connected ? "Select Target Language" : "Connect to server first"} value="" />
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
    </ScrollView>
  );
}