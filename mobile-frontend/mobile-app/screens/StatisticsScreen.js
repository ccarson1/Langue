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




export default function StatisticsScreen({navigation}) {

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const [stats, setStats] = useState(null);
    const [token, setToken] = useState(null);
    const [serverIP, setServerIP] = useState('');
    const [user, setUser] = useState(null);


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

        if (!serverIP || !token) {
            return;
        }

        const loadStatistics = async () => {

            try {

                console.log("Loading statistics from:", `http://${serverIP}:8000/api/statistics/`);

                const response = await fetch(
                    `http://${serverIP}:8000/api/statistics/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                    }
                );

                const data = await response.json();

                setStats(data);

            } catch (err) {
                console.error(err);
            }

        };

        loadStatistics();

    }, [serverIP, token]);



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



            <LineChart

                data={{
                    labels:
                        stats.words_over_time.map(
                            x => x.date
                        ),

                    datasets: [
                        {
                            data:
                                stats.words_over_time.map(
                                    x => x.count
                                )
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
                    stats.languages.map(
                        item => ({

                            name:
                                item.word__language__lang_name,

                            population:
                                item.count,

                            color: "#00adb5"

                        })
                    )
                }


                width={screenWidth}

                height={220}

                chartConfig={{
                    color: () => "#ffffff"
                }}

                accessor="population"

                backgroundColor="transparent"

            />


        </ScrollView>

    )

}