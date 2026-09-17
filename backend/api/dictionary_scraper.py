
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
import time



class DictionaryScraper():

    def __init__(self, text, target_language, native_language):
        self.text = text
        self.target_language = target_language
        self.native_language = native_language


    def scrape_lingea_dict(self, word, target_language, native_language):

        # --------------------------------------------------
        # Clean input
        # --------------------------------------------------

        target_language = target_language.strip().lower()
        native_language = native_language.strip().lower()
        word = word.strip()

        print("REQUESTED WORD:", self.text)
        print("SCRAPED WORD:", word)

        if word.lower() != self.text.lower():
            print("WARNING: SCRAPED WORD DOES NOT MATCH REQUESTED WORD")

        if not target_language:
            raise ValueError("target_language cannot be empty")

        if not native_language:
            raise ValueError("native_language cannot be empty")

        if not word:
            raise ValueError("word cannot be empty")



        encoded_word = quote(word, safe="")
        print("Encoded Word:", encoded_word)

        url = ( f"https://dict.com/" f"{target_language}-{native_language}/" f"{encoded_word}" )

        # --------------------------------------------------
        # Request headers
        # --------------------------------------------------

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/140.0.0.0 Safari/537.36"
            ),
            "Accept": (
                "text/html,application/xhtml+xml,"
                "application/xml;q=0.9,image/avif,image/webp,"
                "image/apng,*/*;q=0.8"
            ),
            "Accept-Language": "lt,en-US;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": "https://dict.com/",
        }

        # --------------------------------------------------
        # Download page
        # --------------------------------------------------


        encoded_word = quote(word, safe="")

        url = (
            f"https://dict.com/"
            f"{target_language}-{native_language}/"
            f"{encoded_word}"
        )

        response = requests.get(
            url,
            headers=headers,
            timeout=15,
            allow_redirects=True,
        )

        print(response)
        print("COOKIES SENT:", response.request.headers.get("Cookie"))
        print("COOKIES RECEIVED:", response.cookies.get_dict())
        print("STATUS:", response.status_code)
        print("URL:", response.url)
        print("LENGTH:", len(response.text))
        print("REQUESTED URL:", url)
        print("FINAL URL:", response.url)
        print("REDIRECT HISTORY:", response.history)

        print("REQUEST HEADERS:")
        print(response.request.headers)

        print("RESPONSE HEADERS:")
        print(response.headers)

        print("\n--- RESPONSE START ---")
        print(response.text[:5000])
        print("--- RESPONSE END ---")

        print("Contains savo:", "savo" in response.text.lower())
        print("Contains lang:", "lt-en" in response.text.lower())

        position = response.text.find("lex_ful_entr")

        if position != -1:
            print(response.text[position - 500:position + 1000])

        print("ENTRY HEADER:")
        entry_header = BeautifulSoup(response.text, "html.parser").select_one("#entry-header")

        if entry_header:
            print(entry_header)
        else:
            print("NOT FOUND")

        # --------------------------------------------------
        # Parse HTML
        # --------------------------------------------------

        soup = BeautifulSoup( response.text, "html.parser" )


        print("TITLE:", soup.title.get_text(strip=True) if soup.title else None)

        print("\nTEXT:")
        print(soup)

        # --------------------------------------------------
        # Find dictionary entry
        # --------------------------------------------------

        word_element = soup.select_one( "#entry-header .lex_ful_entr" )

        if not word_element:
            return None

        dictionary_word = word_element.get_text( " ", strip=True )

        # --------------------------------------------------
        # Pronunciation
        # --------------------------------------------------

        pronunciation_element = soup.select_one( "#entry-header .lex_ful_pron" )

        pronunciation = None

        if pronunciation_element:
            pronunciation = pronunciation_element.get_text( " ", strip=True )
        # --------------------------------------------------
        # Result structure
        # --------------------------------------------------

        result = { "word": dictionary_word, "pronunciation": pronunciation, "parts_of_speech": [], "phrases": [], "examples": [] }

        # --------------------------------------------------
        # Find main dictionary body
        # --------------------------------------------------

        entry_rest = soup.select_one("#entry-rest")

        if entry_rest:
            morf = entry_rest.select_one(".lex_ful_morf")
            pos_element = morf.select_one(".adv-exp") if morf else None

            if pos_element:
                tooltip = pos_element.select_one(".ex-tooltip")

                full_name = tooltip.get_text(" ", strip=True) if tooltip else None

                abbreviation = ""

                for child in pos_element.children:
                    if getattr(child, "name", None) == "span":
                        continue

                    text = getattr(
                        child,
                        "get_text",
                        lambda **kwargs: str(child)
                    )(strip=True)

                    if text:
                        abbreviation += text

                abbreviation = abbreviation.strip()

                current_part_of_speech = {
                    "part_of_speech": full_name,
                    "abbreviation": abbreviation,
                    "definitions": []
                }

                result["parts_of_speech"].append(current_part_of_speech)
            else:
                current_part_of_speech = None
        else:
            current_part_of_speech = None

        main_body = soup.select_one( "section.main-body" )

        print("MAIN BODY:", main_body)

        if main_body:
            print("SENSES:", main_body.find_all("sense", recursive=False))

        if not main_body:
            return result


        for element in main_body.find_all( ["group", "sense"], recursive=False ):

            # ==================================================
            # GROUP
            # ==================================================

            if element.name == "group":

                morf = element.select_one( ".lex_ful_morf" )

                if not morf:
                    continue

                pos_element = morf.select_one( ".adv-exp" )

                if not pos_element:
                    continue

                # ----------------------------------------------
                # Get full part-of-speech name BEFORE modifying
                # the element.
                # ----------------------------------------------

                tooltip = pos_element.select_one( ".ex-tooltip" )

                full_name = None

                if tooltip:
                    full_name = tooltip.get_text( " ", strip=True )

                # ----------------------------------------------
                # Get abbreviation.
                #
                # For:
                #
                # <span class="adv-exp group">
                #     prep
                #     <span class="ex-tooltip">
                #         Preposition
                #     </span>
                # </span>
                #
                # We want:
                #
                # prep
                # ----------------------------------------------

                abbreviation = ""

                for child in pos_element.children:

                    if getattr(child, "name", None) == "span":
                            continue

                    text = getattr( child, "get_text", lambda **kwargs: str(child) )( strip=True )

                    if text:
                        abbreviation += text

                abbreviation = abbreviation.strip()

                # ----------------------------------------------
                # "phr" is dict.com's phrase/entry section,
                # not a grammatical part of speech.
                # ----------------------------------------------

                if abbreviation == "phr":
                    current_part_of_speech = None

                else:
                    current_part_of_speech = { "part_of_speech": full_name, "abbreviation": abbreviation, "definitions": [] }

                    result["parts_of_speech"].append( current_part_of_speech )

            # ==================================================
            # SENSE
            # ==================================================

            elif element.name == "sense":

                # ----------------------------------------------
                # Definition
                # ----------------------------------------------

                translation = element.select_one( ".lex_ful_tran" )

                if translation and current_part_of_speech:
                    definition = translation.get_text( " ", strip=True )

                    if definition: current_part_of_speech[ "definitions" ].append(definition)

                # ----------------------------------------------
                # Phrases
                # ----------------------------------------------

                phrase_elements = element.select( ".lex_ful_coll2" )

                for phrase in phrase_elements:
                    source = phrase.select_one( ".lex_ful_coll2s" )
                    translation = phrase.select_one( ".lex_ful_coll2t" )

                    if not source or not translation:
                        continue

                    source_text = source.get_text( " ", strip=True )
                    translation_text = translation.get_text( " ", strip=True )

                    if source_text or translation_text:

                        result["phrases"].append({ "source": source_text, "translation": translation_text })

                # ----------------------------------------------
                # Examples
                # ----------------------------------------------

                example_elements = element.select( ".lex_ful_samp2" )

                for example in example_elements:

                    source = example.select_one( ".lex_ful_samp2s" )
                    translation = example.select_one( ".lex_ful_samp2t" )

                    if not source or not translation:
                        continue

                    source_text = source.get_text( " ", strip=True )
                    translation_text = translation.get_text( " ", strip=True )

                    if source_text or translation_text:

                        result["examples"].append({ "source": source_text, "translation": translation_text })
                print(result)

        return result
