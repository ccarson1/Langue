// const config = {
//   SERVER_IP: '10.6.96.21', // update as needed
// };

// export default config;


import AsyncStorage from '@react-native-async-storage/async-storage';

const config = {
  SERVER_IP: '0.0.0.0', // default fallback
};

export const getServerIP = async () => {
  try {
    const savedIP = await AsyncStorage.getItem('serverIP');
    return savedIP || config.SERVER_IP;
  } catch {
    return config.SERVER_IP;
  }
};

export const saveServerIP = async (ip) => {
  await AsyncStorage.setItem('serverIP', ip);
};

export default config;