import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { getServerIP } from '../utils/config';

export default function ResetPasswordConfirmScreen({ navigation, route }) {
    const { email } = route.params;

    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [serverIP, setServerIP] = useState('');

    useEffect(() => {
        const loadIP = async () => {
            const ip = await getServerIP();
            setServerIP(ip);
        };

        loadIP();
    }, []);

    const handleConfirmReset = async () => {
        if (!token.trim()) {
            Alert.alert('Validation Error', 'Please enter the reset token.');
            return;
        }

        if (!password.trim()) {
            Alert.alert('Validation Error', 'Please enter a new password.');
            return;
        }

        try {
            const response = await fetch(
                `http://${serverIP}:8000/api/password_reset/confirm/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    data.password ||
                    data.token ||
                    'Password reset failed.'
                );
            }

            Alert.alert('Success', 'Your password has been updated.');

            navigation.reset({ index: 0, routes: [{ name: 'Login' }], });
            
        } catch (error) {
            console.error(error);
            Alert.alert(
                'Error',
                error.message || 'Failed to reset password.'
            );
        }
    };

    return (
        <View style={styles.container}>

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
            >
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            <View style={styles.box}>

                <Text style={styles.title}>
                    Enter Reset Token
                </Text>

                <Text style={styles.subtitle}>
                    A reset token was sent to:
                </Text>

                <Text style={styles.email}>
                    {email}
                </Text>

                <Text style={styles.label}>
                    Reset Token
                </Text>

                <TextInput
                    style={styles.input}
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>
                    New Password
                </Text>

                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleConfirmReset}
                >
                    <Text style={styles.buttonText}>
                        Change Password
                    </Text>
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
        justifyContent: 'center',
        alignItems: 'center',
    },

    box: {
        backgroundColor: '#393e46',
        width: 320,
        padding: 24,
        borderRadius: 10,
    },

    title: {
        color: '#eeeeee',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },

    subtitle: {
        color: '#eeeeee',
    },

    email: {
        color: '#00adb5',
        marginBottom: 20,
        marginTop: 4,
    },

    label: {
        color: '#eeeeee',
        marginBottom: 6,
        marginTop: 12,
    },

    input: {
        backgroundColor: '#222831',
        color: '#eeeeee',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 6,
    },

    button: {
        backgroundColor: '#00adb5',
        paddingVertical: 12,
        borderRadius: 6,
        marginTop: 24,
    },

    buttonText: {
        textAlign: 'center',
        fontWeight: '600',
        color: '#222831',
        fontSize: 18,
    },

    backLink: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
});