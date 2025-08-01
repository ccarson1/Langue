import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ResetPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');

    const handleReset = async () => {
    if (!email) {
        Alert.alert('Validation Error', 'Please enter your email address.');
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/api/password_reset/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to reset password.');
        }

        Alert.alert('Success', 'Check your email for a password reset link.');
    } catch (err) {
        console.error(err);
        Alert.alert('Error', err.message || 'Something went wrong.');
    }
};

    return (

        <View style={styles.container}>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="back" size={22} color="white" />
            </TouchableOpacity>

            <View style={styles.loginBox}>

                <Text style={styles.label}>Enter your email to reset password</Text>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder=""
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                />


                <TouchableOpacity style={styles.button} onPress={handleReset}>
                    <Text style={styles.buttonText}>Reset Password</Text>
                </TouchableOpacity>



            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
        alignItems: 'center',
        justifyContent: 'center',

    },
    loginBox: {
        backgroundColor: '#393e46',
        padding: 24,
        borderRadius: 10,
        width: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    label: {
        color: '#eeeeee',
        marginBottom: 6,
        marginTop: 12,
        fontSize: 14,
    },
    input: {
        backgroundColor: '#222831',
        color: '#eeeeee',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        fontSize: 16,

    },
    button: {
        backgroundColor: '#00adb5',
        paddingVertical: 12,
        borderRadius: 6,
        marginTop: 20,
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
        flexDirection: 'row',
        alignItems: 'center',
    },
});
