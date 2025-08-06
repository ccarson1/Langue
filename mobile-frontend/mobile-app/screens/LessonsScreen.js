import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Alert } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from "./styles/LessonsStyles"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import config from '../utils/config';




export default function LessonsScreen({ navigation }) {
    const [languages, setLanguages] = useState([]);
    const [token, setToken] = useState(null);
    const [nativeLanguage, setNativeLanguage] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('');
    const [lessons, setLessons] = useState([]);
    const server = config.SERVER_IP;

    const fetchLessons = async () => {
        try {
            const res = await fetch(`http://${server}:8000/api/lessons/`);
            const data = await res.json();
            setLessons(data);
        } catch (err) {
            console.error('Failed to fetch Lessons:', err);
            Alert.alert('Error', 'Failed to load Lesson options.');
        }
    };

    const fetchLanguages = async () => {
        try {
            const res = await fetch(`http://${server}:8000/api/languages/`);
            const data = await res.json();
            setLanguages(data); // assuming data is an array of { id, lang_name }
        } catch (err) {
            console.error('Failed to fetch languages:', err);
            Alert.alert('Error', 'Failed to load language options.');
        }
    };

    useEffect(() => {
        const loadTokenAndSettings = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('accessToken');
                if (!storedToken) {
                    Alert.alert('Error', 'No access token found. Please log in.');
                    return;
                }
                setToken(storedToken);

                const decoded = jwtDecode(storedToken);
                console.log('Decoded token:', decoded);

                const response = await fetch(`http://${server}:8000/api/settings/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${storedToken}`,
                    },
                });

                const settings = await response.json();
                setNativeLanguage(settings.native_language);
                setTargetLanguage(settings.target_language);
                setNotificationsEnabled(settings.notifications ?? false);
                setProfilePrivate(settings.privacy ?? false);

            } catch (err) {
                Alert.alert('Error', 'Failed to load settings: ' + err.message);
            }
        };

        fetchLessons();
        fetchLanguages(); // <--- fetch language options
        loadTokenAndSettings(); // <--- fetch user settings
    }, []);




    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="back" size={22} color="white" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.gridWrapper}>
                {lessons.map((lesson) => (
                    <View key={lesson.id} style={styles.card}>
                        <Text style={styles.title}>{lesson.id}</Text>
                        <Text style={styles.title}>{lesson.title}</Text>
                        {/* <Text style={styles.title}>{lesson.title}</Text>
                        {lesson.image && (
                            <Image source={{ uri: lesson.image }} style={styles.image} resizeMode="cover" />
                        )} */}
                        <Image source='https://media.istockphoto.com/id/1396814518/vector/image-coming-soon-no-photo-no-thumbnail-image-available-vector-illustration.jpg?s=612x612&w=0&k=20&c=hnh2OZgQGhf0b46-J2z7aHbIWwq8HNlSDaNp2wn_iko=' style={styles.image} resizeMode="cover" />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={async () => {
                                try {
                                    const storedToken = await AsyncStorage.getItem('accessToken');
                                    console.log(storedToken);
                                    if (!storedToken) {
                                        Alert.alert("Error", "No access token found.");
                                        return;
                                    }

                                    const res = await fetch(`http://${server}:8000/api/change-lesson/`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            Authorization: `Bearer ${storedToken}`
                                        },
                                        body: JSON.stringify({
                                            lesson_id: parseInt(lesson.id)
                                        })
                                    });

                                    if (!res.ok) {
                                        const errorData = await res.json();
                                        throw new Error(errorData.detail || 'Failed to update progress');
                                    }
                                    else {
                                        const data = await res.json();
                                        console.log(data);
                                        // Navigate to lesson screen
                                        navigation.navigate("Home");
                                    }


                                } catch (error) {
                                    console.error("Progress update error:", error);
                                    Alert.alert("Error", error.message);
                                }
                            }}
                        >
                            <Text style={styles.buttonText}>Click</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );

};





