import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ButtonGroup({
    options,           // Array of { label, value }
    selectedValue,
    onValueChange,
    style,
    buttonStyle,
    selectedButtonStyle,
    textStyle,
    selectedTextStyle,
}) {
    return (
        <View style={[styles.container, style]}>
            {options.map((option, index) => {
                const isSelected = option.value === selectedValue;

                return (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.button,
                            buttonStyle,
                            isSelected && styles.selectedButton,
                            isSelected && selectedButtonStyle,
                            // Round corners for first and last button
                            index === 0 && styles.firstButton,
                            index === options.length - 1 && styles.lastButton,
                        ]}
                        onPress={() => onValueChange(option.value)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.text,
                                textStyle,
                                isSelected && styles.selectedText,
                                isSelected && selectedTextStyle,
                            ]}
                        >
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#2c3a4a',
        borderRadius: 30,
        padding: 4,
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    firstButton: {
        borderTopLeftRadius: 26,
        borderBottomLeftRadius: 26,
    },
    lastButton: {
        borderTopRightRadius: 26,
        borderBottomRightRadius: 26,
    },
    selectedButton: {
        backgroundColor: '#00adb5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    text: {
        color: '#aaa',
        fontSize: 15,
        fontWeight: '500',
    },
    selectedText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});