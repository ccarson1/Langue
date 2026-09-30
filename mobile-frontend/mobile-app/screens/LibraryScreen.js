import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Pressable,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerIP } from '../utils/config';
import { createStyles } from './styles/LibraryStyles';


function LibraryScreen() {

    const navigation = useNavigation();

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [token, setToken] = useState(null);
    const [serverIP, setServerIP] = useState('');


    // ============================================================
    // INITIALIZATION
    // ============================================================

    useEffect(() => {

        const init = async () => {

            try {

                const ip = await getServerIP();
                setServerIP(ip);

                const storedToken =
                    await AsyncStorage.getItem('accessToken');

                if (storedToken) {
                    setToken(storedToken);
                }

            } catch (err) {

                console.error(
                    'Library initialization error:',
                    err
                );

                setError(
                    'Unable to initialize library.'
                );
            }
        };

        init();

    }, []);


    // ============================================================
    // LOAD BOOK LIST
    // ============================================================

    useEffect(() => {

        if (!serverIP || !token) {
            return;
        }

        async function loadBooks() {

            try {

                setLoading(true);
                setError(null);

                const response = await fetch(
                    `http://${serverIP}:8000/api/books/`,
                    {
                        method: 'GET',

                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {

                    throw new Error(
                        `Unable to load library (${response.status})`
                    );
                }

                const data = await response.json();

                setBooks(
                    Array.isArray(data)
                        ? data
                        : []
                );

            } catch (error) {

                console.error(
                    'Failed to load library:',
                    error
                );

                setError(
                    error.message ||
                    'Unable to load library.'
                );

            } finally {

                setLoading(false);
            }
        }

        loadBooks();

    }, [serverIP, token]);


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (
            <View style={styles.library}>

                <Text style={styles.libraryTitle}>
                    Library
                </Text>

                <ActivityIndicator
                    size="large"
                />

                <Text>
                    Loading books...
                </Text>

            </View>
        );
    }


    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (
            <View style={styles.library}>

                <Text style={styles.libraryTitle}>
                    Library
                </Text>

                <Text style={styles.libraryError}>
                    {error}
                </Text>

            </View>
        );
    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <View style={styles.library}>

            {/* HEADER */}
            <Pressable
                style={({ hovered, pressed }) => [
                    styles.backButton,
                    hovered && styles.backButtonHovered,
                    pressed && styles.backButtonPressed,
                ]}
                onPress={() => navigation.goBack()}
            ></Pressable>
            <View style={styles.libraryHeader}>

                <Text style={styles.libraryTitle}>
                    Library
                </Text>

                <Text style={styles.libraryCount}>
                    {books.length} books
                </Text>

            </View>


            {/* BOOK LIST */}

            <View style={styles.libraryList}>

                {books.map((book) => (

                    <TouchableOpacity
                        key={book.id}
                        style={styles.libraryItem}
                        activeOpacity={0.7}
                        onPress={() =>
                            navigation.navigate(
                                'BookViewer',
                                {
                                    bookId: book.id,
                                    bookName: book.name,
                                }
                            )
                        }
                    >

                        <Text style={styles.libraryItemIcon}>
                            📖
                        </Text>


                        <View style={styles.libraryItemContent}>

                            <Text style={styles.libraryItemTitle}>
                                {book.name}
                            </Text>

                        </View>


                        <Text style={styles.libraryItemArrow}>
                            →
                        </Text>

                    </TouchableOpacity>

                ))}

            </View>


            {/* EMPTY */}

            {books.length === 0 && (

                <Text style={styles.libraryEmpty}>
                    No books found.
                </Text>

            )}

        </View>
    );
}


export default LibraryScreen;