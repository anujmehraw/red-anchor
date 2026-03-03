import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function App() {
  const [text, setText] = useState("");
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(
    Number(localStorage.getItem("speed")) || 300
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgAnimated, setBgAnimated] = useState(true);
  const [sessionWords, setSessionWords] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [showStats, setShowStats] = useState(false);

  const startTimeRef = useRef(null);

  const animationStyles = `
    @keyframes fadeIn {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;

  function processText(input) {
    const cleanWords = input.trim().split(/\s+/);
    setText(input);
    setWords(cleanWords);
    setIndex(0);
    setIsPlaying(false);
    setShowStats(false);
    setSessionWords(0);
    setSessionTime(0);
  }

  function handleChange(e) {
    processText(e.target.value);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;

    // TXT
    if (fileType === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => processText(event.target.result);
      reader.readAsText(file);
      return;
    }

    // PDF
    if (fileType === "application/pdf") {
      const reader = new FileReader();

      reader.onload = async function () {
        try {
          const typedArray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;

          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join(" ") + " ";
          }

          processText(fullText);
        } catch (error) {
          console.error("PDF parsing error:", error);
        }
      };

      reader.readAsArrayBuffer(file);
    }
  }

  useEffect(() => {
    localStorage.setItem("speed", speed);
  }, [speed]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setIsPlaying(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!isPlaying || words.length === 0) return;

    if (!startTimeRef.current)
      startTimeRef.current = Date.now();

    const currentWord = words[index];
    let delay = 60000 / speed;

    if (/[.!?]$/.test(currentWord)) delay *= 2;
    else if (/,$/.test(currentWord)) delay *= 1.5;

    const timeout = setTimeout(() => {
      setIndex((prev) => {
        if (prev < words.length - 1) {
          setSessionWords((w) => w + 1);
          return prev + 1;
        } else {
          setIsPlaying(false);
          const totalTime =
            (Date.now() - startTimeRef.current) / 1000;
          setSessionTime(totalTime);
          setShowStats(true);
          startTimeRef.current = null;
          return prev;
        }
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [isPlaying, speed, index, words]);

  function highlightWord(word) {
    if (!word) return "";
    const pivot = Math.round(word.length * 0.35);

    return (
      <>
        {word.slice(0, pivot)}
        <span style={{ color: "red" }}>
          {word[pivot]}
        </span>
        {word.slice(pivot + 1)}
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        fontFamily: "Arial",
        background:
          "linear-gradient(-45deg, #0f172a, #1e293b, #111827, #1f2937)",
        backgroundSize: "400% 400%",
        animation: bgAnimated
          ? "gradientMove 15s ease infinite"
          : "none",
        color: "#e2e8f0"
      }}
    >
      <style>{animationStyles}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        {/* BRAND TITLE */}
        <h1 style={{ fontSize: "36px", fontWeight: "bold", letterSpacing: "3px" }}>
          Red <span style={{ color: "red" }}>A</span>nchor
        </h1>

        <textarea
          rows="4"
          value={text}
          onChange={handleChange}
          style={{ width: "100%", padding: "10px" }}
        />

        <input
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileUpload}
          style={{ marginTop: "10px" }}
        />

        <div
          style={{
            fontSize: "70px",
            fontWeight: "bold",
            height: "150px",
            width: "100%",
            maxWidth: "600px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "2px solid #334155",
            borderBottom: "2px solid #334155",
            marginTop: "40px"
          }}
        >
          <div
            key={index}
            style={{ animation: "fadeIn 0.25s ease-in-out" }}
          >
            {highlightWord(words[index])}
          </div>
        </div>

        {words.length > 0 && (
          <>
            <p>{index + 1} / {words.length}</p>

            <input
              type="range"
              min="0"
              max={words.length - 1}
              value={index}
              onChange={(e) => {
                setIndex(Number(e.target.value));
                setIsPlaying(false);
              }}
              style={{ width: "100%" }}
            />
          </>
        )}

        <div style={{ marginTop: "20px" }}>
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? "Pause" : "Start"}
          </button>

          <button
            onClick={() =>
              setIndex((prev) => Math.max(prev - 1, 0))
            }
            style={{ marginLeft: "10px" }}
          >
            ⬅ Prev
          </button>

          <button
            onClick={() =>
              setIndex((prev) =>
                Math.min(prev + 1, words.length - 1)
              )
            }
            style={{ marginLeft: "10px" }}
          >
            Next ➡
          </button>

          <button
            onClick={() => setBgAnimated((prev) => !prev)}
            style={{ marginLeft: "10px" }}
          >
            Toggle Background
          </button>
        </div>

        {showStats && (
          <div style={{ marginTop: "20px" }}>
            <h3>Session Complete 🎉</h3>
            <p>Words Read: {sessionWords}</p>
            <p>Time Spent: {sessionTime.toFixed(2)} sec</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;