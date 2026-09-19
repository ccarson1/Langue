import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Pressable,
    Platform,
} from "react-native";

import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";

const LessonVideoPlayer = forwardRef(({
    lesson,
    token,
    serverIP,
    onWordPress,
    ShowVideoCaptions,
    startMs,
    endMs,
    continuousPlay,
    volume,
    playbackRate,
    onPlaybackFinished,
    onSentenceChanged,
}, ref) => {

    const [videoUri, setVideoUri] = useState(null);

    const [currentSentence, setCurrentSentence] = useState(null);

    const [selectedWord, setSelectedWord] = useState("");

    const [loading, setLoading] = useState(true);

    const player = useVideoPlayer(
        videoUri,
        (player) => {
            player.loop = false;
            player.volume = volume;
            player.playbackRate = playbackRate;
        }
    );

    useEffect(() => {
        if (!player) return;

        player.volume = volume;
        player.playbackRate = playbackRate;

    }, [player, volume, playbackRate]);

    useImperativeHandle(ref, () => ({
        play() {
            if (!videoUri || !player) {
                console.log("Video is not ready to play");
                return;
            }

            player.play();
            onPlaybackFinished?.();
        },

        pause() {
            player.pause();
            onPlaybackFinished?.();
        },

        seek(ms) {
            player.currentTime = ms / 1000;
        }
    }));

    useEffect(() => {
        if (!player)
            return;

        const interval = setInterval(() => {

            if (!continuousPlay &&
                endMs > 0 &&
                player.currentTime * 1000 >= endMs) {

                player.pause();
                player.currentTime = startMs / 1000;
                onPlaybackFinished?.();
            }

        }, 50);

        return () => clearInterval(interval);

    }, [player, startMs, endMs, continuousPlay]);

    useEffect(() => {

        if (!lesson || !token || !serverIP)
            return;

        console.log(token);

        const fetchVideo = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/video/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            lesson_id: lesson.id,
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`Video download failed ${response.status}`);
                }


                if (Platform.OS === "web") {

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    setVideoUri(url);

                } else {

                    const blob = await response.blob();

                    const base64 = await new Promise((resolve, reject) => {

                        const reader = new FileReader();

                        reader.onloadend = () => {
                            resolve(reader.result.split(",")[1]);
                        };

                        reader.onerror = reject;

                        reader.readAsDataURL(blob);

                    });


                    const fileUri =
                        FileSystem.cacheDirectory +
                        `lesson-video-${lesson.id}.mp4`;


                    await FileSystem.writeAsStringAsync(
                        fileUri,
                        base64,
                        {
                            encoding: FileSystem.EncodingType.Base64,
                        }
                    );


                    console.log("Saved video:", fileUri);

                    setVideoUri(fileUri);

                    const info = await FileSystem.getInfoAsync(fileUri);

                    console.log("Video exists:", info);
                }

            }
            catch (err) {
                console.error("Video fetch error:", err);
            }
            finally {
                setLoading(false);
            }
        };

        fetchVideo();

    }, [lesson]);



    function findSentence(positionMillis) {

        if (!lesson?.sentences)
            return null;

        return lesson.sentences.find(sentence =>

            positionMillis >= sentence.start_ms &&
            positionMillis < sentence.end_ms

        );

    }

    useEffect(() => {

        if (!player)
            return;

        const interval = setInterval(() => {

            const sentence = findSentence(player.currentTime * 1000);

            if (!sentence)
                return;

            if (
                !currentSentence ||
                sentence.id !== currentSentence.id
            ) {
                setCurrentSentence(sentence);
                onSentenceChanged?.(player.currentTime * 1000);
            }

        }, 150);

        return () => clearInterval(interval);

    }, [player, currentSentence, onSentenceChanged]);

    useEffect(() => {
        if (!lesson?.sentences || !currentSentence) return;

        const updatedSentence = lesson.sentences.find(
            sentence => sentence.id === currentSentence.id
        );

        if (updatedSentence) {
            setCurrentSentence(updatedSentence);
        }
    }, [lesson?.sentences]);

    const words = useMemo(() => {

        if (!currentSentence)
            return [];

        return currentSentence.sentence
            .trim()
            .split(/\s+/);

    }, [currentSentence]);

    if (loading) {

        return (

            <View style={styles.loading}>

                <ActivityIndicator
                    size="large"
                    color="#ffffff"
                />

            </View>

        );

    }

    return (

        <View style={styles.container}>

            <VideoView
                key={videoUri}
                style={styles.video}
                player={player}
                nativeControls={false}
            />
            {ShowVideoCaptions && (
                <View style={styles.overlay}>

                    <View style={styles.wordRow}>

                        {words.map((word, index) => (



                            <Pressable
                                key={index}
                                onPress={() => {

                                    console.log("VIDEO WORD PRESSED:", word);
                                    console.log("VIDEO WORD INDEX:", index);

                                    setSelectedWord(word);

                                    onWordPress(word, index);

                                }}
                            >

                                <Text
                                    style={[
                                        styles.word,

                                        selectedWord === word &&
                                        styles.selectedWord,
                                    ]}
                                >
                                    {word}{" "}
                                </Text>

                            </Pressable>

                        ))}

                    </View>

                </View>
            )}


        </View>

    );

});

export default LessonVideoPlayer;

const styles = StyleSheet.create({


    ...Platform.select({
        web: {
            video: {
                width: "100%",
                height: "100%",
                objectFit: "contain",
            },

            container: {
                width: "100%",
                height: "min(70vh, 500px)",
                maxHeight: 500,
                borderRadius: 15,
                overflow: "hidden",
                backgroundColor: "#222",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            },
            overlay: {
                position: "absolute",

                bottom: 20,
                left: 10,
                right: 10,

                backgroundColor: "rgba(0,0,0,.55)",
                borderRadius: 12,
                padding: 5,
            },

            wordRow: {
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
            },

            word: {
                color: "white",
                fontSize: 20,
                paddingHorizontal: 2,
                lineHeight: 32,
            },

            selectedWord: {
                backgroundColor: "#FFCC00",
                color: "black",
                borderRadius: 4,
                overflow: "hidden",
            },

            loading: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            },
        },
        default: {
            video: {
                width: "100%",
                height: "100%",
            },

            container: {
                width: "100%",
                aspectRatio: 16 / 9,
                borderRadius: 15,
                overflow: "hidden",
                backgroundColor: "#222",
                elevation: 5,
            },
            overlay: {
                position: "absolute",

                bottom: 20,
                left: 10,
                right: 10,

                backgroundColor: "rgba(0,0,0,.55)",
                borderRadius: 12,
                padding: 5,
            },

            wordRow: {
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
            },

            word: {
                color: "white",
                fontSize: 14,
                paddingHorizontal: 2,
                lineHeight: 32,
            },

            selectedWord: {
                backgroundColor: "#FFCC00",
                color: "black",
                borderRadius: 4,
                overflow: "hidden",
            },

            loading: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            },
        },
    }),





});