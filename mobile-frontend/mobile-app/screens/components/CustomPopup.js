import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';

const CustomPopup = ({
    visible,
    message,
    type = 'success',
    duration = 3000,
    onClose,

    // New optional caution popup props
    showButtons = false,
    acceptText = 'Accept',
    declineText = 'Decline',
    onAccept,
    onDecline,
}) => {
    const translateY = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),

                // Don't automatically close a popup that has buttons
                ...(showButtons
                    ? []
                    : [
                        Animated.delay(duration),
                        Animated.timing(translateY, {
                            toValue: -100,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]),
            ]).start(() => {
                if (!showButtons && onClose) {
                    onClose();
                }
            });
        }
    }, [visible, showButtons, duration, onClose, translateY]);

    let bgColor = '#4CAF50';

    if (type === 'error') {
        bgColor = '#F44336';
    } else if (type === 'caution') {
        bgColor = '#FFC107';
    }

    const handleAccept = () => {
        if (onAccept) {
            onAccept();
        }

        if (onClose) {
            onClose();
        }
    };

    const handleDecline = () => {
        if (onDecline) {
            onDecline();
        }

        if (onClose) {
            onClose();
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
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

