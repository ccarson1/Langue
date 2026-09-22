import React, { useState, forwardRef, useImperativeHandle, } from "react";
import * as Clipboard from "expo-clipboard";
import { AntDesign } from "@expo/vector-icons";
import { createPortal } from "react-dom";
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Platform,
    Modal,
} from "react-native";

const SentencePopupMenu = forwardRef(({
    isLessonOwner,
    sentence,
    children,
    onTranslate,
    onEdit,
    onDelete,
    longPressTriggeredRef,
}, ref) => {
    const [visible, setVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({
        x: 0,
        y: 0,
    });

    const showMenu = (x, y) => {
        console.log("SHOW MENU:", x, y);

        setMenuPosition({ x, y });
        setVisible(true);
    };

    useImperativeHandle(ref, () => ({
        showMenu,
    }));

    const hideMenu = () => {
        setVisible(false);
    };

    const handleContextMenu = (event) => {
        if (Platform.OS !== "web") {
            return;
        }

        event.preventDefault();

        console.log("RIGHT CLICK FIRED");

        showMenu(
            event.clientX,
            event.clientY
        );
    };

    const handleLongPress = (event) => {
        if (Platform.OS === "web") {
            return;
        }

        console.log("LONG PRESS FIRED");

        if (longPressTriggeredRef) {
            longPressTriggeredRef.current = true;
        }

        const { pageX, pageY } = event.nativeEvent;

        showMenu(pageX, pageY);
    };

    const handleTranslate = () => {
        hideMenu();

        if (!sentence) {
            return;
        }

        onTranslate(sentence);
    };

    const handleEdit = () => {
        hideMenu();

        if (!sentence) {
            return;
        }

        onEdit(sentence);
    };

    const handleDelete = () => {
        hideMenu();

        if (!sentence) {
            return;
        }

        onDelete(sentence);
    };

    const copySentence = async () => {
        hideMenu();

        if (!sentence) {
            return;
        }

        console.log("COPY SENTENCE:", sentence);

        await Clipboard.setStringAsync(sentence);
    };

    return (
        <>
            {Platform.OS === "web" ? (
                <div
                    onContextMenu={handleContextMenu}
                    style={{ width: "100%" }}
                >
                    {children}
                </div>
            ) : (
                <Pressable
                    onPressIn={() => console.log("PRESS IN FIRED")}
                    onLongPress={handleLongPress}
                    delayLongPress={500}
                    style={styles.trigger}
                >
                    {children}
                </Pressable>
            )}

            {console.log("RENDER VISIBLE:", visible)}

            {/* WEB POPUP */}
            {visible &&
                Platform.OS === "web" &&
                createPortal(
                    <>
                        <div
                            onClick={hideMenu}
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 9998,
                            }}
                        />

                        <div
                            style={{
                                position: "fixed",
                                left: menuPosition.x,
                                top: menuPosition.y,
                                minWidth: 140,
                                backgroundColor: "#242938",
                                borderRadius: 10,
                                paddingTop: 6,
                                paddingBottom: 6,
                                zIndex: 9999,
                                boxShadow: "0px 4px 8px rgba(0,0,0,0.35)",
                                border: "1px solid #2c3244",
                            }}
                        >
                            <div
                                onClick={hideMenu}
                                style={{
                                    position: "absolute",
                                    top: 5,
                                    right: 5,
                                    cursor: "pointer",

                                }}
                            >
                                <AntDesign
                                    name="close-circle"
                                    size={24}
                                    color="#ff3333"

                                />
                            </div>
                            <div
                                onClick={handleTranslate}
                                style={{
                                    padding: "11px 18px",
                                    cursor: "pointer",
                                    fontSize: 15,
                                    color: "#ffffff",
                                }}
                            >
                                Translate
                            </div>
                            {isLessonOwner && (
                                <div
                                    onClick={handleEdit}
                                    style={{
                                        padding: "11px 18px",
                                        cursor: "pointer",
                                        fontSize: 15,
                                        color: "#ffffff",
                                    }}
                                >
                                    Edit
                                </div>
                            )}


                            <div
                                onClick={copySentence}
                                style={{
                                    padding: "11px 18px",
                                    cursor: "pointer",
                                    fontSize: 15,
                                    color: "#ffffff",
                                }}
                            >
                                Copy
                            </div>

                            {isLessonOwner && (
                                <div
                                    onClick={handleDelete}
                                    style={{
                                        padding: "11px 18px",
                                        cursor: "pointer",
                                        fontSize: 15,
                                        color: "#ffffff",
                                    }}
                                >
                                    Delete
                                </div>
                            )}

                        </div>
                    </>,
                    document.body
                )}

            {/* MOBILE POPUP */}
            {visible &&
                Platform.OS !== "web" && (
                    <Modal
                        transparent={true}
                        visible={visible}
                        animationType="none"
                        onRequestClose={hideMenu}
                    >
                        <Pressable
                            style={styles.mobileModal}
                            onPress={hideMenu}
                        >
                            <Pressable
                                onPress={() => { }}
                                style={[
                                    styles.menu,
                                    {
                                        left: Math.max(
                                            10,
                                            menuPosition.x - 80
                                        ),
                                        top: menuPosition.y,
                                    },
                                ]}
                            >
                                <Pressable
                                    onPress={hideMenu}
                                    style={styles.closeButton}
                                >
                                    <AntDesign
                                        name="close-circle"
                                        size={24}
                                        color="#ff3333"
                                    />
                                </Pressable>
                                <Pressable
                                    style={styles.menuItem}
                                    onPress={handleTranslate}
                                >
                                    <Text style={styles.menuText}>
                                        Translate
                                    </Text>
                                </Pressable>

                                {isLessonOwner && (
                                    <Pressable
                                        style={styles.menuItem}
                                        onPress={handleEdit}
                                    >
                                        <Text style={styles.menuText}>
                                            Edit
                                        </Text>
                                    </Pressable>
                                )}

                                <Pressable
                                    style={styles.menuItem}
                                    onPress={copySentence}
                                >
                                    <Text style={styles.menuText}>
                                        Copy
                                    </Text>
                                </Pressable>

                                {isLessonOwner && (
                                    <Pressable
                                        style={styles.menuItem}
                                        onPress={handleDelete}
                                    >
                                        <Text style={styles.menuText}>
                                            Delete
                                        </Text>
                                    </Pressable>
                                )}

                            </Pressable>
                        </Pressable>
                    </Modal>
                )}
        </>
    );
});

export default SentencePopupMenu;

const styles = StyleSheet.create({
    trigger: {
        width: "100%",
    },

    overlay: {
        position: Platform.OS === "web" ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },

    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    menu: {
        position: "absolute",
        minWidth: 160,
        backgroundColor: "#242938",
        borderRadius: 10,
        paddingVertical: 6,

        borderWidth: 1,
        borderColor: "#2c3244",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.35,
        shadowRadius: 8,

        elevation: 10,
        zIndex: 10000,
    },

    menuItem: {
        paddingVertical: 11,
        paddingHorizontal: 18,
    },

    menuText: {
        fontSize: 15,
        color: "#ffffff",
    },
    mobileModal: {
        flex: 1,
    },
    closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 10,
},
});