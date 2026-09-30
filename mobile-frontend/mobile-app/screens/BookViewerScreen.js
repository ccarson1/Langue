import { useEffect, useRef, useState } from "react";

import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Pressable,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createStyles } from './styles/BookViewerStyles';

import { getServerIP } from '../utils/config';


// ============================================================
// BOOK VIEWER
// ============================================================

export default function BookViewer({ route }) {
    const navigation = useNavigation();
    const { bookId } = route.params;

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);


    // ============================================================
    // CONNECTION
    // ============================================================

    const [token, setToken] = useState(null);

    const [serverIP, setServerIP] = useState('');


    // ============================================================
    // BOOK DATA
    // ============================================================

    const [bookPages, setBookPages] = useState([]);

    const [tocEntries, setTocEntries] = useState([]);


    // ============================================================
    // CURRENT PAGE
    // ============================================================

    const [currentPageIndex, setCurrentPageIndex] =
        useState(0);


    // ============================================================
    // SIDEBAR
    // ============================================================

    const [sidebarOpen, setSidebarOpen] =
        useState(true);


    // ============================================================
    // LOADING
    // ============================================================

    const [loading, setLoading] =
        useState(true);


    // ============================================================
    // ERROR
    // ============================================================

    const [error, setError] =
        useState(null);


    // ============================================================
    // VIEWER SIZE
    // ============================================================

    const [viewerWidth, setViewerWidth] =
        useState(0);


    // ============================================================
    // REFERENCES
    // ============================================================

    const pageRef =
        useRef(null);

    const viewerRef =
        useRef(null);


    // ============================================================
    // CURRENT PAGE
    // ============================================================

    const currentPage =
        bookPages[currentPageIndex];


    // ============================================================
    // PAGE SCALE
    // ============================================================

    // const pageScale =
    //     currentPage &&
    //         currentPage.width &&
    //         viewerWidth
    //         ? Math.min(
    //             viewerWidth / currentPage.width,
    //             1
    //         )
    //         : 1;


    // ============================================================
    // INITIALIZATION
    // ============================================================

    useEffect(() => {

        const init = async () => {

            try {

                const ip =
                    await getServerIP();

                setServerIP(ip);


                const storedToken =
                    await AsyncStorage.getItem(
                        'accessToken'
                    );


                if (storedToken) {

                    setToken(
                        storedToken
                    );

                }

            } catch (err) {

                console.error(
                    'BookViewer initialization error:',
                    err
                );

                setError(
                    'Unable to initialize book viewer.'
                );

            }

        };


        init();

    }, []);


    // ============================================================
    // LOAD BOOK
    // ============================================================

    useEffect(() => {

        if (
            serverIP &&
            token &&
            bookId
        ) {

            loadBook();

        }

    }, [
        serverIP,
        token,
        bookId
    ]);


    // ============================================================
    // LOAD BOOK DATA
    // ============================================================

    async function loadBook() {

        try {

            setLoading(true);

            setError(null);


            const response =
                await fetch(
                    `http://${serverIP}:8000/api/books/${encodeURIComponent(bookId)}/`,
                    {
                        method: 'GET',

                        headers: {
                            Authorization:
                                `Bearer ${token}`,

                            'Content-Type':
                                'application/json',
                        },
                    }
                );


            // ====================================================
            // HTTP ERROR
            // ====================================================

            if (!response.ok) {

                let errorMessage =
                    `Failed to load book (${response.status}).`;


                try {

                    const errorData =
                        await response.json();


                    if (errorData.error) {

                        errorMessage =
                            errorData.error;

                    } else if (
                        errorData.detail
                    ) {

                        errorMessage =
                            errorData.detail;

                    }

                } catch (error) {

                    // Response wasn't JSON

                }


                throw new Error(
                    errorMessage
                );

            }


            // ====================================================
            // BOOK DATA
            // ====================================================

            const bookData =
                await response.json();


            // ====================================================
            // TABLE OF CONTENTS
            // ====================================================

            const loadedToc =
                Array.isArray(
                    bookData.toc
                )
                    ? bookData.toc
                    : [];


            setTocEntries(
                loadedToc
            );


            // ====================================================
            // PAGES
            // ====================================================

            const loadedPages =
                Array.isArray(
                    bookData.pages
                )
                    ? bookData.pages
                    : [];


            // ====================================================
            // PROCESS PAGE ELEMENTS
            // ====================================================

            loadedPages.forEach(
                function (pageData) {

                    const elements =
                        pageData.elements || [];


                    elements.forEach(
                        function (element) {

                            const bbox =
                                element.bbox;


                            if (
                                bbox &&
                                bbox.length >= 4
                            ) {

                                const x1 =
                                    bbox[0];

                                const y1 =
                                    bbox[1];

                                const x2 =
                                    bbox[2];

                                const y2 =
                                    bbox[3];


                                element.x =
                                    x1;

                                element.y =
                                    y1;

                                element.width =
                                    x2 - x1;

                                element.height =
                                    y2 - y1;

                            }


                            // ====================================================
                            // NORMALIZE IMAGE FILENAME
                            // ====================================================

                            if (
                                element.type === "image" &&
                                element.filename
                            ) {
                                console.log("IMAGE ELEMENT:", element);
                                console.log("CURRENT PAGE:", currentPage);
                                element.filename =
                                    element.filename.replace(
                                        /\\/g,
                                        "/"
                                    );

                            }

                        }
                    );

                }
            );


            // ====================================================
            // SAVE BOOK PAGES
            // ====================================================

            setBookPages(
                loadedPages
            );


            console.log(
                "Book loaded:",
                bookData.name
            );


            console.log(
                "Pages loaded:",
                loadedPages.length
            );


            console.log(
                "TOC entries:",
                loadedToc.length
            );


            if (
                !loadedPages.length
            ) {

                throw new Error(
                    "No book pages were found."
                );

            }

        } catch (loadError) {

            console.error(
                "Failed to load book:",
                loadError
            );


            setError(
                loadError.message
            );

        } finally {

            setLoading(false);

        }

    }


    // ============================================================
    // DISPLAY PAGE
    // ============================================================

    function displayPage(index) {

        if (
            !bookPages.length
        ) {

            return;

        }


        // --------------------------------------------------------
        // Clamp index
        // --------------------------------------------------------

        index =
            Math.max(
                0,
                Math.min(
                    index,
                    bookPages.length - 1
                )
            );


        // --------------------------------------------------------
        // Change page
        // --------------------------------------------------------

        setCurrentPageIndex(
            index
        );


        // --------------------------------------------------------
        // Reset viewer scroll
        // --------------------------------------------------------

        if (
            viewerRef.current
        ) {

            viewerRef.current.scrollTo({
                x: 0,
                y: 0,
                animated: false,
            });

        }

    }


    // ============================================================
    // GO TO BOOK PAGE
    // ============================================================

    function goToBookPage(
        bookPageNumber
    ) {

        let pageIndex = -1;


        // --------------------------------------------------------
        // Find actual book page
        // --------------------------------------------------------

        for (
            let i = 0;
            i < bookPages.length;
            i++
        ) {

            if (
                Number(
                    bookPages[i].page
                ) ===
                Number(
                    bookPageNumber
                )
            ) {

                pageIndex =
                    i;

                break;

            }

        }


        // --------------------------------------------------------
        // Try array index
        // --------------------------------------------------------

        if (
            pageIndex === -1
        ) {

            pageIndex =
                Number(
                    bookPageNumber
                ) - 1;

        }


        // --------------------------------------------------------
        // Validate
        // --------------------------------------------------------

        if (
            pageIndex < 0 ||
            pageIndex >= bookPages.length
        ) {

            console.warn(
                "Could not find book page:",
                bookPageNumber
            );

            return;

        }


        displayPage(
            pageIndex
        );

    }


    // ============================================================
    // NEXT PAGE
    // ============================================================

    function nextPage() {

        if (
            currentPageIndex <
            bookPages.length - 1
        ) {

            displayPage(
                currentPageIndex + 1
            );

        }

    }


    // ============================================================
    // PREVIOUS PAGE
    // ============================================================

    function previousPage() {

        if (
            currentPageIndex > 0
        ) {

            displayPage(
                currentPageIndex - 1
            );

        }

    }


    // ============================================================
    // PAGE INPUT
    // ============================================================

    function handlePageInput(
        value
    ) {

        let pageNumber =
            parseInt(
                value,
                10
            );


        if (
            Number.isNaN(
                pageNumber
            )
        ) {

            return;

        }


        pageNumber =
            Math.max(
                1,
                Math.min(
                    pageNumber,
                    bookPages.length
                )
            );


        displayPage(
            pageNumber - 1
        );

    }


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <View style={styles.loading}>

                <Text style={styles.loadingText}>
                    Loading book...
                </Text>

            </View>

        );

    }


    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (

            <View style={styles.error}>

                <Text style={styles.errorTitle}>
                    Unable to load book
                </Text>


                <Text style={styles.errorText}>
                    {error}
                </Text>

            </View>

        );

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <View style={styles.container}>


            {/* ====================================================
                TOOLBAR
            ==================================================== */}

            <View style={styles.toolbar}>
                <Pressable
                    style={({ hovered, pressed }) => [
                        styles.backButton,
                        hovered && styles.backButtonHovered,
                        pressed && styles.backButtonPressed,
                    ]}
                    onPress={() => navigation.goBack()}
                ></Pressable>

                <TouchableOpacity
                    style={
                        styles.contentsButton
                    }

                    onPress={() =>
                        setSidebarOpen(
                            !sidebarOpen
                        )
                    }
                >

                    <Text
                        style={
                            styles.contentsButtonText
                        }
                    >
                        Contents
                    </Text>

                </TouchableOpacity>


                <View
                    style={
                        styles.pageNavigation
                    }
                >

                    <Text
                        style={
                            styles.pageLabel
                        }
                    >
                        Book page
                    </Text>


                    <TextInput
                        style={
                            styles.pageInput
                        }

                        keyboardType="numeric"

                        value={
                            String(
                                currentPageIndex + 1
                            )
                        }

                        onChangeText={
                            handlePageInput
                        }
                    />


                    <Text
                        style={
                            styles.pageLabel
                        }
                    >
                        of {bookPages.length}
                    </Text>

                </View>

            </View>


            {/* ====================================================
                MAIN AREA
            ==================================================== */}

            <View
                style={
                    styles.mainArea
                }
            >


                {/* =================================================
                    SIDEBAR
                ================================================= */}

                <View
                    style={[
                        styles.sidebar,

                        !sidebarOpen &&
                        styles.sidebarClosed
                    ]}
                >

                    <View
                        style={
                            styles.sidebarHeader
                        }
                    >

                        <Text
                            style={
                                styles.sidebarHeaderText
                            }
                        >
                            Contents
                        </Text>

                    </View>


                    <ScrollView
                        style={
                            styles.tocList
                        }
                    >

                        {
                            tocEntries.length === 0

                                ? (

                                    <Text
                                        style={{
                                            padding: 20,
                                            color: '#aaaaaa'
                                        }}
                                    >
                                        No table of contents
                                        found.
                                    </Text>

                                )

                                : (

                                    tocEntries.map(
                                        function (
                                            entry,
                                            index
                                        ) {

                                            if (
                                                entry.page === null ||
                                                entry.page === undefined
                                            ) {

                                                return null;

                                            }


                                            const level =
                                                entry.level || 1;


                                            const currentBookPage =
                                                currentPage
                                                    ? Number(
                                                        currentPage.page
                                                    )
                                                    : null;


                                            const tocPage =
                                                Number(
                                                    entry.page
                                                );


                                            const active =
                                                tocPage ===
                                                currentBookPage;


                                            return (

                                                <TouchableOpacity
                                                    key={index}

                                                    style={[
                                                        styles.tocEntry,

                                                        active &&
                                                        styles.tocEntryActive
                                                    ]}

                                                    onPress={() =>
                                                        goToBookPage(
                                                            entry.page
                                                        )
                                                    }
                                                >

                                                    <Text
                                                        style={[
                                                            styles.tocEntryText,

                                                            {
                                                                paddingLeft:
                                                                    (level - 1) * 15
                                                            }
                                                        ]}
                                                    >

                                                        {
                                                            entry.title ||
                                                            entry.text ||
                                                            ""
                                                        }

                                                    </Text>


                                                    <Text
                                                        style={
                                                            styles.tocPageNumber
                                                        }
                                                    >

                                                        {
                                                            entry.page
                                                        }

                                                    </Text>

                                                </TouchableOpacity>

                                            );

                                        }
                                    )

                                )
                        }

                    </ScrollView>

                </View>


                {/* =================================================
                    VIEWER
                ================================================= */}

                <ScrollView
                    ref={viewerRef}
                    style={styles.viewer}
                    contentContainerStyle={styles.pageContainer}
                    horizontal={true}
                    onLayout={(event) => {
                        setViewerWidth(
                            event.nativeEvent.layout.width
                        );
                    }}
                >
                    <ScrollView
                        style={styles.pageVerticalScroll}
                        contentContainerStyle={styles.pageVerticalContainer}
                        nestedScrollEnabled={true}
                    >
                        {
                            currentPage && (
                                <View
                                    // style={{
                                    //     width:
                                    //         currentPage.width *
                                    //         pageScale,

                                    //     height:
                                    //         currentPage.height *
                                    //         pageScale,
                                    // }}
                                >
                                    <View
                                        ref={pageRef}
                                        style={[
                                            styles.page,
                                            {
                                                width:
                                                    currentPage.width,

                                                height:
                                                    currentPage.height,

                                                // transform: [
                                                //     {
                                                //         scale:
                                                //             pageScale
                                                //     }
                                                // ],
                                            }
                                        ]}
                                    >
                                        {
                                            (
                                                currentPage.elements ||
                                                []
                                            ).map(
                                                function (
                                                    element,
                                                    index
                                                ) {

                                                    if (
                                                        element.type ===
                                                        "text"
                                                    ) {
                                                        return (
                                                            <Text
                                                                key={index}
                                                                style={[
                                                                    styles.text,
                                                                    {
                                                                        left:
                                                                            element.x,

                                                                        top:
                                                                            element.y,

                                                                        width:
                                                                            element.width,

                                                                        minHeight:
                                                                            element.height
                                                                    }
                                                                ]}
                                                            >
                                                                {
                                                                    element.text ||
                                                                    ""
                                                                }
                                                            </Text>
                                                        );
                                                    }


                                                    if (
                                                        element.type ===
                                                        "image"
                                                    ) {

                                                        const imagePath =
                                                            `http://${serverIP}:8000/api/books/` +
                                                            `${encodeURIComponent(bookId)}/` +
                                                            `pages/${currentPage.id}/images/${element.filename}`;

                                                        return (
                                                            <Image
                                                                key={index}
                                                                style={[
                                                                    styles.pageImage,
                                                                    {
                                                                        left:
                                                                            element.x,

                                                                        top:
                                                                            element.y,

                                                                        width:
                                                                            element.width,

                                                                        height:
                                                                            element.height
                                                                    }
                                                                ]}
                                                                source={{
                                                                    uri:
                                                                        imagePath,

                                                                    headers: {
                                                                        Authorization:
                                                                            `Bearer ${token}`
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    }


                                                    return null;

                                                }
                                            )
                                        }
                                    </View>
                                </View>
                            )
                        }
                    </ScrollView>
                </ScrollView>

            </View>


            {/* ====================================================
                BOTTOM NAVIGATION
            ==================================================== */}

            <View
                style={
                    styles.bottomNavigation
                }
            >

                <TouchableOpacity
                    style={[
                        styles.navigationButton,

                        currentPageIndex === 0 &&
                        styles.navigationButtonDisabled
                    ]}

                    onPress={
                        previousPage
                    }

                    disabled={
                        currentPageIndex === 0
                    }
                >

                    <Text
                        style={
                            styles.navigationButtonText
                        }
                    >
                        ‹ Previous
                    </Text>

                </TouchableOpacity>


                <TouchableOpacity
                    style={[
                        styles.navigationButton,

                        currentPageIndex ===
                        bookPages.length - 1 &&
                        styles.navigationButtonDisabled
                    ]}

                    onPress={
                        nextPage
                    }

                    disabled={
                        currentPageIndex ===
                        bookPages.length - 1
                    }
                >

                    <Text
                        style={
                            styles.navigationButtonText
                        }
                    >
                        Next ›
                    </Text>

                </TouchableOpacity>

            </View>

        </View>

    );

}