import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

function timeToMilliseconds(time) {
  // Split the time string into components
  let parts = time.split(":");
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  let secondsAndMilliseconds = parts[2].split(",");
  let seconds = parseInt(secondsAndMilliseconds[0], 10);
  let milliseconds = parseInt(secondsAndMilliseconds[1], 10);

  // Calculate the total milliseconds
  let totalMilliseconds =
    hours * 3600 * 1000 + minutes * 60 * 1000 + seconds * 1000 + milliseconds;

  return totalMilliseconds;
}

function parseSrt(str) {
  //SRT format
  var pattern =
    /(\d+)\n([\d:,]+)\s+-{2}\>\s+([\d:,]+)\n([\s\S]*?(?=\n{2}|$))/gm;
  var _regExp = new RegExp(pattern);

  var toLineObj = function (group) {
    return {
      line: group[1],
      startTime: timeToMilliseconds(group[2]),
      endTime: timeToMilliseconds(group[3]),
      text: group[4],
    };
  };
  if (typeof str != "string") throw "Sorry, Parser accept string only.";

  var result = [];

  str = str.replace(/\r\n|\r|\n/g, "\n");
  let matches;
  while ((matches = pattern.exec(str)) != null) {
    result.push(toLineObj(matches));
  }
  return result;
}

async function getSubtitle(url) {
  const result = await (await fetch(url)).text();
  return parseSrt(result);
}
function findCurrentSubtitleText(subtitles, time, skipOffset) {
  for (let i = skipOffset || 0; i < subtitles.length; i++) {
    let subtitle = subtitles[i];
    if (time >= subtitle.startTime && time <= subtitle.endTime) {
      return { text: subtitle.text, index: i };
    }
  }
  return { text: "", index: skipOffset };
}
function App() {
  // { "url": "http://185.81.98.76/Click_2006_10bit_720p_x265_BrRip_30nama_30NAMA.mkv", "srt": "http://185.81.98.76/06. Click (2006).srt"}
  const [video, setVideo] = useState(null);
  const [subtitle, setSubtitle] = useState([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState("");
  const [inputSrc, setInputSrc] = useState("");
  const videoElem = useRef(null);
  const skipSubOffsetIndex = useRef(null);

  useEffect(() => {
    const input = localStorage.getItem("inputSrc");
    if (input) {
      setInputSrc(input);
    }
  }, []);

  useEffect(() => {
    if (!video?.srt) return;
    async function load() {
      const sub = await getSubtitle(video?.srt);
      setSubtitle(sub);
    }
    load();
  }, [video?.srt]);

  useEffect(() => {
    if (!videoElem.current || !subtitle) return;

    function timeupdate({ target }) {
      const currentTimeInSeconds = target.currentTime;
      const currentTimeInMilliseconds = currentTimeInSeconds * 1000;
      const { text, index } = findCurrentSubtitleText(
        subtitle,
        currentTimeInMilliseconds,
        skipSubOffsetIndex.current
      );
      setCurrentSubtitleText(text);
      skipSubOffsetIndex.current = index;
    }
    function seeked({ target }) {
      skipSubOffsetIndex.current = 0;
    }
    videoElem.current.addEventListener("timeupdate", timeupdate);
    videoElem.current.addEventListener("seeked", seeked);

    return () => {
      videoElem.current.removeEventListener("timeupdate", timeupdate);
      videoElem.current.removeEventListener("seeked", seeked);
    };
  }, [videoElem.current, subtitle]);

  const play = useCallback(() => {
    try {
      localStorage.setItem("inputSrc", inputSrc);
      const inputs = JSON.parse(inputSrc);
      setVideo(inputs);
      const url = new URL(window.location.href);
      url.searchParams.set("src", btoa(inputSrc));

      window.history.pushState(null, "", url);
    } catch (error) {
      window.alert(error.toString());
    }
  });

  if (!video?.url) {
    return (
      <div className="form">
        <textarea
          rows="4"
          cols="50"
          onChange={(e) => setInputSrc(e.target.value)}
          defaultValue={inputSrc}
        />
        <div className="btn" onClick={(e) => play()}>
          Play!
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="video-container">
        <video ref={videoElem} controls autoPlay>
          <source src={video.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      {currentSubtitleText?.length > 0 && (
        <div className="subtitle-wrapper">
          <div
            className="subtitle"
            dangerouslySetInnerHTML={{ __html: currentSubtitleText }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default App;
