import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useDotAnimation } from '../static/js/useDotAnimation';
import "../static/css/index.css";
import "../static/css/spinner.css";



export default function Home() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const [partOfSpeechText, setPartOfSpeechText] = useState(".");
  const [wordDefinitionText, setWordDefinitionText] = useState(".");
  const { startAnimation, stopAnimation } = useDotAnimation(
    [setTranslatedText, setPartOfSpeechText, setWordDefinitionText]
  );




  useEffect(() => {
    let index = 0;
    let lessonLength = 0;
    let rows = [];
    let currentAudio;
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);

    // let button = document.getElementById("language-button");
    // let menu = document.getElementById("language-menu");


    console.log("page is fully loaded");
    currentAudio = document.getElementById("current-audio").textContent;


    fetch('http://localhost:8000/media/data/metadata.csv').then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
      .then(csvText => {
        console.log(csvText)
        rows = csvText.trim().split('\n').map(row => row.split(','));

        populateLessonWords();
        let btnPlayAudio = document.getElementById("btn-play-audio");
        currentAudio = document.getElementById("current-audio").textContent;
        let btnBack = document.getElementById('btn-back');
        let btnNext = document.getElementById('btn-next');
        lessonLength = rows.length;

        btnBack.addEventListener("click", function () {
          indexBack();
        })

        btnNext.addEventListener("click", function () {
          indexNext();
        })

        btnPlayAudio.addEventListener("click", function () {
          playAudio();
        });

      })
      .catch(error => {
        console.error('Error fetching CSV:', error);
      });


    function populateLessonWords() {
      let wordContainer = document.getElementById("lesson-word-container");
      let audioContainer = document.getElementById("current-audio")

      wordContainer.innerHTML = '';
      let rowText = rows[index].join(', ').split("|")[2].split(" ");
      let audioFileName = rows[index].join(', ').split("|")[0].split(" ");
      audioContainer.textContent = audioFileName;
      for (let r = 0; r < rowText.length; r++) {
        let tempDiv = document.createElement("div");
        tempDiv.setAttribute("class", "word");
        tempDiv.textContent = rowText[r];
        tempDiv.addEventListener("click", function () {
          console.log(this.textContent)
          document.getElementById('target-word').textContent = this.textContent
          document.getElementById('source-text').textContent = this.textContent
          callTranslation(this.textContent);
        });
        wordContainer.appendChild(tempDiv);

      }
    }

    function playAudio() {

      fetch(`http://localhost:8000/media/data/audio/${currentAudio}`)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.blob();
        })
        .then(blob => {
          const audioURL = URL.createObjectURL(blob);
          const audio = new Audio(audioURL);
          audio.play();
        })
        .catch(error => {
          console.error('Error fetching or playing audio:', error);
        });
    }

    function indexBack() {
      if (index > 0) {
        index--
        populateLessonWords()
        currentAudio = document.getElementById("current-audio").textContent;
      }
      console.log(index)

    }

    function indexNext() {
      if (index < lessonLength) {
        index++
        populateLessonWords()
        currentAudio = document.getElementById("current-audio").textContent;
      }

      console.log(index)
    }

    function callTranslation(text) {
      document.getElementById("overlay").classList.remove("hidden");
      // animating = true;
      // animateDots();
      startAnimation();
      fetch('http://localhost:8000/api/translate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text, native_id: 1, target_id: 2 })
      })
        .then(response => {
          if (!response.ok) {

            document.getElementById("overlay").classList.add("hidden");
            throw new Error('Translation failed');
          }
          return response.json();
        })
        .then(data => {
          console.log(data);
          document.getElementById("overlay").classList.add("hidden");
          // animating = false;
          stopAnimation();
          if (data.translated) {
            console.log(data.inDatabase)
            if (data.inDatabase == 0) {
              document.documentElement.style.setProperty('--status-active', 'var(--status-red)');
              document.documentElement.style.setProperty('--status-active-shadow-1', 'var(--status-red-shadow-1)');
              document.documentElement.style.setProperty('--status-active-shadow-2', 'var(--status-red-shadow-2)');
            }
            else if (data.inDatabase == 1) {
              document.documentElement.style.setProperty('--status-active', 'var(--status-green)');
              document.documentElement.style.setProperty('--status-active-shadow-1', 'var(--status-green-shadow-1)');
              document.documentElement.style.setProperty('--status-active-shadow-2', 'var(--status-green-shadow-2)');
            }
            setTranslatedText(data.translated);
          } else {
            console.error('Unexpected response:', data);
          }
        })
        .catch(error => {
          document.getElementById("overlay").classList.add("hidden");
          console.error('Error:', error);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const username = localStorage.getItem('username');
      if (isLoggedIn) {
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('profile-link').style.display = 'display';
        document.getElementById('profile-link').textContent = username;
      }
      else {
        document.getElementById('login-link').style.display = 'display';
        document.getElementById('profile-link').style.display = 'none';

      }
    });

    document.getElementById("save-btn").addEventListener("click", function () {
      document.getElementById("overlay").classList.remove("hidden");
      this.disabled = true;
      let word = document.getElementById("source-text").textContent;
      let definition = document.getElementById("translated-text").textContent;
      let user = JSON.parse(localStorage.getItem('user'));
      // let userId = user.id
      let userId = 1;
      let nat_id = 1;
      let tar_id = 2

      if (!user) {
        document.getElementById("overlay").classList.add("hidden");
        alert("You must be logged in to save words.");
        return;
      }

      let payload = {
        word: word,
        definition: definition,
        user_id: userId,
        nat_id: 1,
        tar_id: 2
      };

      fetch("/api/save_word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            document.getElementById("overlay").classList.add("hidden");
            alert("Error: " + data.error);
          } else {
            document.getElementById("overlay").classList.add("hidden");
            alert("Word saved successfully!");
            document.documentElement.style.setProperty('--status-active', 'var(--status-green)');
            document.documentElement.style.setProperty('--status-active-shadow-1', 'var(--status-green-shadow-1)');
            document.documentElement.style.setProperty('--status-active-shadow-2', 'var(--status-green-shadow-2)');
            console.log(data);
          }
        })
        .catch(error => {
          document.getElementById("overlay").classList.add("hidden");
          console.error("Error saving word:", error);
        });
      this.disabled = false;
    });




    // button.addEventListener("click", () => {
    //   menu.classList.toggle("hidden");
    // });

    // Optional: Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!button.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add("hidden");
      }
    });

  }, []);


  // Save button handler
  const onSave = () => {
    // Implement save logic here
    alert("Save clicked: " + translatedText);
  };

  const handleSignOut = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate('/login');
  };


  return (
    <div className="main-container">
      <div id="overlay" className="overlay hidden">
        <div className="spinner"></div>
      </div>
      <div id="logo">
        Langue
      </div>
      {isLoggedIn ? (
        <a href="#" onClick={(e) => { e.preventDefault(); handleSignOut(); }} className="nav-link" style={{ position: 'fixed', top: '2%', right: '5%' }} > Sign Out </a>
      ) : (
        <a href="/login" id="login-link" className="nav-link" style={{ position: 'fixed', top: '2%', right: '5%' }} > Login </a>
      )}
      <div
        style={{ position: 'fixed', top: '2%', right: 0, justifyItems: 'flex-end', width: '40%', alignItems: 'end', gap: '22px', display: "flex" }} >
        <a href="/login" id="login-link" className="nav-link" style={{ display: 'none' }} > Login </a>
        <a href="/account" id="account-link" className="nav-link"> Account </a>
        <a href="/settings" id="settings-link" className="nav-link"> Settings </a>
        <a href="/lessons" id="lessons-link" className="nav-link"> Lessons </a>
        <a href="/import" id="import-link" className="nav-link"> Import </a>
      </div>

      {/* <a href="" id="account-link" className="nav-link" style={{ position: "fixed", top: "2%"}} >Account</a>
      <a href="" id="lessons-link" className="nav-link" style={{ position: "fixed", top: "2%"}} >Lessons</a>
      <a href="" id="setting-link" className="nav-link" style={{ position: "fixed", top: "2%"}} >Settings</a>
      <a href="" id="import-link" className="nav-link" style={{ position: "fixed", top: "2%" }} >Import</a> */}

      <div id="audio-container">
        <div>
          <p id="current-audio"></p>
          <i className="fa-solid fa-play" id="btn-play-audio"></i>
        </div>
      </div>

      <div id="lesson-word-container"></div>

      <div id="def-container">
        <div className="status-indicator"></div>
        <button id="save-btn" onClick={onSave}>
          Save
        </button>
        <div className="entry-header">
          <h1 id="target-word">Mean</h1>
          <h3 id="part-of-speech">{partOfSpeechText}</h3>
        </div>
        <div className="translation-pair">
          <span className="source-lang">Lithuanian:</span>
          <span id="source-text">Mean</span>
        </div>
        <div className="translation-pair">
          <span className="target-lang">English:</span>
          <span
            id="translated-text"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setTranslatedText(e.currentTarget.textContent)}
          >
            {translatedText}
          </span>
        </div>
        <div>
          <p id="word-definition">
            {wordDefinitionText}
          </p>
        </div>
      </div>

      <div id="pagination-container">
        <div>
          <i className="fa-solid fa-chevron-left" id="btn-back"></i>
          <i className="fa-solid fa-chevron-right" id="btn-next"></i>
        </div>
      </div>

    </div>
  );


}
