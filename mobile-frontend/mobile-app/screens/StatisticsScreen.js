import React, { useEffect, useState } from "react";

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
} from "react-native";


import {
    BarChart,
    LineChart,
    PieChart
} from "react-native-chart-kit";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Dimensions } from "react-native";
import { createStyles } from './styles/HomeStyles';
import { getServerIP } from '../utils/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';

const screenWidth = Dimensions.get("window").width;




export default function StatisticsScreen({ navigation }) {

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const [stats, setStats] = useState(null);
    const [token, setToken] = useState(null);
    const [serverIP, setServerIP] = useState('');
    const [user, setUser] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [timeRange, setTimeRange] = useState("all");
    const [periodOffset, setPeriodOffset] = useState(0);


    const decodeToken = (token) => {
        try {
            return jwtDecode(token);
        } catch (err) {
            console.error('Token decode failed:', err);
            return null;
        }
    };

    useEffect(() => {
        const init = async () => {
            try {

                const ip = await getServerIP();
                setServerIP(ip);

                const storedToken = await AsyncStorage.getItem('accessToken');
                if (storedToken) {
                    setToken(storedToken);
                    const decoded = decodeToken(storedToken);
                    if (decoded) setUser(decoded);
                }
            } catch (err) {
                console.error('Initialization error:', err);
            }
        };
        init();
    }, []);




    useEffect(() => {
        if (!serverIP || !token) return;

        const loadSettings = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/settings/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok && data.target_language) {
                    setSelectedLanguage(data.target_language);
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            }
        };

        loadSettings();
    }, [serverIP, token]);

    useEffect(() => {
        if (!serverIP || !token || !selectedLanguage) return;

        const loadStatistics = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/statistics/?language=${encodeURIComponent(selectedLanguage)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setStats(data);
                } else {
                    console.error("Failed to load statistics:", data);
                }
            } catch (err) {
                console.error(err);
            }
        };

        loadStatistics();
    }, [serverIP, token, selectedLanguage]);

    const filteredWords = (stats?.words_over_time || []).filter(item => {
        if (timeRange === "all") return true;

        const itemDate = new Date(item.date);
        const today = new Date();

        if (timeRange === "year") {
            const year = today.getFullYear() + periodOffset;
            return itemDate.getFullYear() === year;
        }

        if (timeRange === "month") {
            const date = new Date(
                today.getFullYear(),
                today.getMonth() + periodOffset,
                1
            );

            return (
                itemDate.getFullYear() === date.getFullYear() &&
                itemDate.getMonth() === date.getMonth()
            );
        }

        if (timeRange === "week") {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(
                today.getDate() - ((today.getDay() + 6) % 7)
                + periodOffset * 7
            );
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);

            return itemDate >= startOfWeek && itemDate < endOfWeek;
        }

        return true;
    });



    if (!stats) {
        return (
            <View>
                <Text>
                    Loading...
                </Text>
            </View>
        )
    }



    return (

        <ScrollView style={{ backgroundColor: "#222831" }} >
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            <Text
                style={{
                    color: "white",
                    fontSize: 28,
                    textAlign: "center",
                    margin: 20
                }}
            >
                Statistics
            </Text>

            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20
                }}
            >
                Select Language
            </Text>

            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center"
                }}
            >
                {stats.languages.map((item, index) => {
                    const language = item.word__language__lang_name;

                    const colors = [
                        "#00ADB5",
                        "#FF6B6B",
                        "#06D6A0",
                        "#6C63FF",
                        "#FFD166",
                        "#F78C6B",
                        "#C77DFF",
                        "#4D96FF",
                    ];

                    const color = colors[index % colors.length];
                    const selected = selectedLanguage === language;

                    return (
                        <TouchableOpacity
                            key={language}
                            onPress={() => setSelectedLanguage(language)}
                            style={{
                                backgroundColor: selected ? color : "#393e46",
                                borderWidth: 2,
                                borderColor: color,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                margin: 5,
                                borderRadius: 10,
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                {language}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>


            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center"
                }}
            >

                {
                    Object.entries(stats.summary)
                        .map(([key, value]) => (


                            <View
                                key={key}
                                style={{
                                    backgroundColor: "#393e46",
                                    width: 150,
                                    height: 100,
                                    margin: 10,
                                    borderRadius: 10,
                                    justifyContent: "center",
                                    alignItems: "center"
                                }}
                            >

                                <Text
                                    style={{
                                        color: "#00adb5",
                                        fontSize: 30
                                    }}
                                >
                                    {value}
                                </Text>


                                <Text
                                    style={{
                                        color: "white"
                                    }}
                                >
                                    {key}
                                </Text>


                            </View>


                        ))
                }

            </View>




            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20
                }}
            >
                Words Learned
            </Text>

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: 10
                }}
            >
                {[
                    { label: "All", value: "all" },
                    { label: "Year", value: "year" },
                    { label: "Month", value: "month" },
                    { label: "Week", value: "week" }
                ].map(option => {
                    const selected = timeRange === option.value;

                    return (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => {
                                setTimeRange(option.value);
                                setPeriodOffset(0);
                            }}
                            style={{
                                backgroundColor: selected ? "#00ADB5" : "#393e46",
                                paddingVertical: 10,
                                paddingHorizontal: 18,
                                marginHorizontal: 4,
                                marginVertical: 4,
                                borderRadius: 8
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {timeRange !== "all" && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setPeriodOffset(offset => offset - 1)}
                        style={{ padding: 10 }}
                    >
                        <AntDesign name="left" size={22} color="white" />
                    </TouchableOpacity>

                    <Text style={{ color: "white", fontSize: 16, marginHorizontal: 15 }}>
                        {timeRange === "year" &&
                            new Date().getFullYear() + periodOffset}

                        {timeRange === "month" &&
                            new Date(
                                new Date().getFullYear(),
                                new Date().getMonth() + periodOffset,
                                1
                            ).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric"
                            })}

                        {timeRange === "week" &&
                            (() => {
                                const start = new Date();
                                start.setDate(
                                    start.getDate() - ((start.getDay() + 6) % 7)
                                    + periodOffset * 7
                                );

                                const end = new Date(start);
                                end.setDate(start.getDate() + 6);

                                return `${start.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric"
                                })} - ${end.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                })}`;
                            })()}
                    </Text>

                    <TouchableOpacity
                        onPress={() => setPeriodOffset(offset => Math.min(offset + 1, 0))}
                        disabled={periodOffset === 0}
                        style={{ padding: 10, opacity: periodOffset === 0 ? 0.3 : 1 }}
                    >
                        <AntDesign name="right" size={22} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <LineChart
                data={{
                    labels: filteredWords.map(item =>
                        new Date(item.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC"
                        })
                    ),
                    datasets: [
                        {
                            data: filteredWords.length
                                ? filteredWords.map(item => item.count)
                                : [0]
                        }
                    ]
                }}
                width={screenWidth - 20}
                height={220}
                chartConfig={{
                    backgroundColor: "#393e46",
                    backgroundGradientFrom: "#393e46",
                    backgroundGradientTo: "#393e46",
                    color: () => "#00adb5",
                    labelColor: () => "#ffffff"
                }}
                style={{
                    margin: 10,
                    borderRadius: 10
                }}
            />




            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20
                }}
            >
                Languages
            </Text>




            <PieChart
                data={
                    stats.languages.map((item, index) => {
                        const colors = [
                            "#00ADB5",
                            "#FF6B6B",
                            "#06D6A0",
                            "#6C63FF",
                            "#FFD166",
                            "#F78C6B",
                            "#C77DFF",
                            "#4D96FF",
                        ];

                        return {
                            name: item.word__language__lang_name,
                            population: item.count,
                            color: colors[index % colors.length],
                        };
                    })
                }

                width={screenWidth}
                height={220}

                chartConfig={{
                    color: () => "#ffffff",
                    labelColor: () => "#ffffff",
                }}

                accessor="population"
                backgroundColor="transparent"
            />


        </ScrollView>

    )

}