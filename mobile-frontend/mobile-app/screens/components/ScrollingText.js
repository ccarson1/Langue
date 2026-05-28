// import React, { useEffect, useRef, useState } from 'react';
// import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';

// export default function ScrollingText({ text, isPlaying, width = 200, speed = 50 }) {
//   const scrollAnim = useRef(new Animated.Value(0)).current;
//   const [textWidth, setTextWidth] = useState(0);

//   useEffect(() => {
//     if (!isPlaying || textWidth <= width) {
//       scrollAnim.setValue(0);
//       return;
//     }

//     const distance = textWidth; // width of single text
//     const duration = (distance + 50) / speed * 1000; // 50px extra spacing

//     const animate = () => {
//       scrollAnim.setValue(0); // start from 0
//       Animated.timing(scrollAnim, {
//         toValue: -distance - 50, // scroll past first copy + spacing
//         duration,
//         easing: Easing.linear,
//         useNativeDriver: true,
//       }).start(({ finished }) => {
//         if (finished) animate(); // loop seamlessly
//       });
//     };

//     animate();
//   }, [isPlaying, textWidth, width, speed]);

//   return (
//     <View style={[styles.container, { width, overflow: 'hidden' }]}>
//       <Animated.View
//         style={{
//           flexDirection: 'row',
//           transform: [{ translateX: scrollAnim }],
//         }}
//       >
//         <Text
//           onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
//           numberOfLines={1}
//           style={{ whiteSpace: Platform.OS === 'web' ? 'nowrap' : 'normal' }}
//         >
//           {text}
//         </Text>
//         <Text
//           numberOfLines={1}
//           style={{ marginLeft: 50, whiteSpace: Platform.OS === 'web' ? 'nowrap' : 'normal' }}
//         >
//           {text}
//         </Text>
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
// });


import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';

export default function ScrollingText({ text, isPlaying, width = 200, speed = 50 }) {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);

  // Set a minimum word count before duplicating
  const MIN_WORD_COUNT = 5;
  const wordCount = text.trim().split(/\s+/).length;
  const shouldDuplicate = wordCount >= MIN_WORD_COUNT;

useEffect(() => {

    if (!isPlaying || textWidth <= width) {
        return;
    }

    const spacing = 50;

    const distance = textWidth + spacing;

    const duration = (distance / speed) * 1000;

    scrollAnim.stopAnimation();

    scrollAnim.setValue(0);

    const animation = Animated.loop(
        Animated.timing(scrollAnim, {
            toValue: -distance,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
        })
    );

    animation.start();

    return () => {
        animation.stop();
        scrollAnim.stopAnimation();
    };

}, [isPlaying, textWidth]);

  return (
    <View style={[styles.container, { width, overflow: 'hidden' }]}>
      <Animated.View
        style={{
          flexDirection: 'row',
          transform: [{ translateX: scrollAnim }],
          color: 'white'
        }}
      >
        <Text
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          numberOfLines={1}
          style={{color: 'white', whiteSpace: Platform.OS === 'web' ? 'nowrap' : 'normal' }}
        >
          {text}
        </Text>
        {shouldDuplicate && (
          <Text
            numberOfLines={1}
            style={{color: 'white', marginLeft: 50, whiteSpace: Platform.OS === 'web' ? 'nowrap' : 'normal' }}
          >
            {text}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    color: 'white'
  },
});
