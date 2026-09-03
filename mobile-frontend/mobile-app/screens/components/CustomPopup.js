
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    View,
    TouchableOpacity
} from 'react-native';

const CustomPopup = ({
    visible,
    message,
    type = 'success',
    duration = 3000,
    onClose,

    showButtons = false,
    acceptText = 'Accept',
    declineText = 'Decline',
    onAccept,
    onDecline,
}) => {
    const translateY = useRef(new Animated.Value(-170)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // Controls whether the popup is actually displayed
    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        if (visible) {
            // Make sure the popup is mounted before animating
            setShouldRender(true);

            translateY.setValue(-170);
            opacity.setValue(0);

            // Slide down + fade in
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Normal popup automatically disappears
            if (!showButtons) {
                const timer = setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: -170,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start(({ finished }) => {
                        if (finished) {
                            setShouldRender(false);

                            if (onClose) {
                                onClose();
                            }
                        }
                    });
                }, duration + 300);

                return () => clearTimeout(timer);
            }
        } else {
            // Fade out + move up when visible becomes false
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -170,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) {
                    setShouldRender(false);
                }
            });
        }
    }, [visible, showButtons, duration, onClose, translateY, opacity]);

    let bgColor = '#4CAF50';

    if (type === 'error') {
        bgColor = '#F44336';
    } else if (type === 'caution') {
        bgColor = '#FFC107';
    }

    const handleAccept = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -170,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setShouldRender(false);

                if (onAccept) {
                    onAccept();
                }

                if (onClose) {
                    onClose();
                }
            }
        });
    };

    const handleDecline = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -170,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setShouldRender(false);

                if (onDecline) {
                    onDecline();
                }

                if (onClose) {
                    onClose();
                }
            }
        });
    };

    if (!shouldRender) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
                    opacity,
                    backgroundColor: bgColor,
                },
            ]}
        >
            <Text
                style={[
                    styles.text,
                    type === 'caution' && styles.cautionText,
                ]}
            >
                {message}
            </Text>

            {showButtons && (
                <View style={styles.buttonRow}>

                    <TouchableOpacity
                        style={styles.declineButton}
                        onPress={handleDecline}
                    >
                        <Text style={styles.buttonText}>
                            {declineText}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={handleAccept}
                    >
                        <Text style={styles.buttonText}>
                            {acceptText}
                        </Text>
                    </TouchableOpacity>

                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 8,
        zIndex: 1000,
        elevation: 4,
        minWidth: 280,
        maxWidth: '90%',
    },

    text: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },

    cautionText: {
        color: '#222',
    },

    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 10,
    },

    declineButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },

    acceptButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
    },

    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default CustomPopup;

