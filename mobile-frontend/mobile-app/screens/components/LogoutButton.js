import React from 'react';
import { Text, Alert, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const LogoutButton = ({ style = {}, label = "Sign out" }) => {
    const navigation = useNavigation();

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('refreshToken');
            navigation.navigate('Login');
        } catch (error) {
            Alert.alert('Logout error', error.message);
        }
    };

    return (
        <Pressable onPress={handleLogout}>
            <Text style={style}>{label}</Text>
        </Pressable>
    );
};

export default LogoutButton;
