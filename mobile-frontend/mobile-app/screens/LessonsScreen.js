import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from "./styles/LessonsStyles"

const lessons = [
    {
        id: 1,
        title: 'Card 1',
        image: 'https://i.ytimg.com/vi/RA302mO6OHE/hqdefault.jpg?sqp=-oaymwEnCNACELwBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLCANB16_gr1GxgeRqtmpUMiIQMSFw',
        link: 'http://localhost:3002/',
    },
    {
        id: 2,
        title: 'Card 2',
        image: 'https://i.ytimg.com/vi/gyJ61lLDFUg/hqdefault.jpg?sqp=-oaymwEmCKgBEF5IWvKriqkDGQgBFQAAiEIYAdgBAeIBCggYEAIYBjgBQAE=&rs=AOn4CLAKE6FLDR775b4l_k6T8et0e9YIog',
        link: null,
    },
    {
        id: 3,
        title: 'Card 3',
        image: 'https://media.istockphoto.com/id/1396814518/vector/image-coming-soon-no-photo-no-thumbnail-image-available-vector-illustration.jpg?s=612x612&w=0&k=20&c=hnh2OZgQGhf0b46-J2z7aHbIWwq8HNlSDaNp2wn_iko=',
        link: null,
    },
];

export default function LessonsScreen({ navigation }) {




    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="back" size={22} color="white" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.gridWrapper}>
                {lessons.map((lesson) => (
                    <View key={lesson.id} style={styles.card}>
                        <Text style={styles.title}>{lesson.title}</Text>
                        {lesson.image && (
                            <Image source={{ uri: lesson.image }} style={styles.image} resizeMode="cover" />
                        )}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                // if (lesson.link) Linking.openURL(lesson.link);
                                if (lesson.link) alert(lesson.link);
                                navigation.navigate("Home");
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





