import { useEffect, useMemo, useRef, useState } from "react";
import rainAudio from "./assets/sound/rain-1.mp3";
import "./App.css";

type IconName =
  | "bell"
  | "bookmark"
  | "cloud"
  | "heart"
  | "leaf"
  | "moon"
  | "pause"
  | "play"
  | "plus"
  | "rain"
  | "search"
  | "sliders"
  | "sparkle"
  | "storm"
  | "sun"
  | "wind";

type Sound = {
  id: string;
  name: string;
  description: string;
  volume: number;
  color: string;
  icon: IconName;
};

declare global {
  interface Window {
    AndroidMediaSession?: {
      setPlaying: (playing: boolean) => void;
    };
  }
}

type AudioLayer = {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};

const initialSounds: Sound[] = [
  {
    id: "rain",
    name: "Rain on window",
    description: "Soft and steady drops",
    volume: 72,
    color: "blue",
    icon: "rain",
  },
  {
    id: "wind",
    name: "Night breeze",
    description: "A quiet breath of air",
    volume: 38,
    color: "mint",
    icon: "wind",
  },
  {
    id: "storm",
    name: "Distant thunder",
    description: "Low and grounding rumble",
    volume: 18,
    color: "amber",
    icon: "storm",
  },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    bookmark: "M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V22l-6-3-6 3z",
    cloud:
      "M17.5 19H8a6 6 0 1 1 1.6-11.8A7 7 0 0 1 23 11.5 4.5 4.5 0 0 1 17.5 19Z",
    heart:
      "M20.8 8.7c0 5.4-8.8 10.2-8.8 10.2S3.2 14.1 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z",
    leaf: "M20 4C11 4 5 8 5 14a6 6 0 0 0 6 6c6 0 10-6 9-16ZM4 20c3-4 6-6 11-8",
    moon: "M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z",
    pause: "M8 5v14M16 5v14",
    play: "m8 5 11 7-11 7V5Z",
    plus: "M12 5v14M5 12h14",
    rain: "M8 14v4M12 13v6M16 14v4M18.5 11a4.5 4.5 0 0 0-8.7-1.5A3.5 3.5 0 0 0 9.5 16h8a3.5 3.5 0 0 0 1-5Z",
    search: "m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    sliders: "M4 6h16M7 6v4M4 18h16M17 14v4M4 12h16M12 10v4",
    sparkle:
      "m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3L12 3ZM19 17l-.5 2.5L16 20l2.5.5L19 23l.5-2.5L22 20l-2.5-.5L19 17Z",
    storm: "m13 2-9 11h7l-1 9 9-12h-7l1-8Z",
    sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    wind: "M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 2,
    context.sampleRate,
  );
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createLoopableBuffer(
  context: AudioContext,
  sourceBuffer: AudioBuffer,
) {
  const fadeLength = Math.min(
    Math.floor(context.sampleRate * 0.12),
    Math.floor(sourceBuffer.length / 3),
  );
  const loopBuffer = context.createBuffer(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate,
  );
  const stableLength = sourceBuffer.length - fadeLength;

  for (
    let channelIndex = 0;
    channelIndex < sourceBuffer.numberOfChannels;
    channelIndex += 1
  ) {
    const sourceChannel = sourceBuffer.getChannelData(channelIndex);
    const loopChannel = loopBuffer.getChannelData(channelIndex);
    loopChannel.set(sourceChannel.subarray(fadeLength), 0);

    for (let index = 0; index < fadeLength; index += 1) {
      const progress = index / fadeLength;
      const tail = sourceChannel[stableLength + index];
      const head = sourceChannel[index];
      loopChannel[stableLength + index] =
        tail * (1 - progress) + head * progress;
    }
  }

  return loopBuffer;
}

function App() {
  const [sounds, setSounds] = useState(initialSounds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(64);
  const [selectedTimer, setSelectedTimer] = useState("30 min");
  const [isSaved, setIsSaved] = useState(false);
  const [activeNav, setActiveNav] = useState("My mixes");
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const audioLayersRef = useRef<Record<string, AudioLayer>>({});
  const rainAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const togglePlaybackRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );

  const activeSounds = useMemo(
    () => sounds.filter((sound) => sound.volume > 0).length,
    [sounds],
  );

  const updateSoundVolume = (id: string, volume: number) => {
    setSounds((currentSounds) =>
      currentSounds.map((sound) =>
        sound.id === id ? { ...sound, volume } : sound,
      ),
    );
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (audioContextRef.current) {
      window.AndroidMediaSession?.setPlaying(isPlaying);
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        masterVolume / 100,
        audioContextRef.current?.currentTime ?? 0,
        0.04,
      );
    }

    sounds.forEach((sound) => {
      audioLayersRef.current[sound.id]?.gain.gain.setTargetAtTime(
        sound.volume / 100,
        audioContextRef.current?.currentTime ?? 0,
        0.04,
      );
    });
  }, [masterVolume, sounds]);

  useEffect(() => {
    const audioLayers = audioLayersRef.current;

    return () => {
      Object.values(audioLayers).forEach(({ source }) => source.stop());
      rainAudioRef.current?.pause();
      rainAudioRef.current = null;
      audioContextRef.current?.close();
    };
  }, []);

  const togglePlayback = async () => {
    if (!audioContextRef.current) {
      const context = new AudioContext();
      const masterGain = context.createGain();
      masterGain.gain.value = masterVolume / 100;
      masterGain.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = masterGain;

      const rainSound = sounds.find((sound) => sound.id === "rain");
      const rainAudioElement = rainAudioRef.current;
      if (rainSound && rainAudioElement) {
        rainAudioElement.loop = true;
        rainAudioElement.preload = "auto";
        const sessionSource =
          context.createMediaElementSource(rainAudioElement);
        const sessionGain = context.createGain();
        sessionGain.gain.value = 0;
        sessionSource.connect(sessionGain).connect(masterGain);
        await rainAudioElement.play();
      }

      let rainBuffer: AudioBuffer | null;
      try {
        const response = await fetch(rainAudio);
        rainBuffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
      } catch {
        rainBuffer = null;
      }
      const loopableRainBuffer = rainBuffer
        ? createLoopableBuffer(context, rainBuffer)
        : null;

      sounds.forEach((sound) => {
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer =
          sound.id === "rain" && loopableRainBuffer
            ? loopableRainBuffer
            : createNoiseBuffer(context);
        source.loop = true;
        filter.type = sound.id === "rain" ? "bandpass" : "lowpass";
        filter.frequency.value =
          sound.id === "storm" ? 260 : sound.id === "wind" ? 700 : 1800;
        filter.Q.value = sound.id === "rain" ? 0.7 : 0.4;
        gain.gain.value = sound.volume / 100;
        source.connect(filter).connect(gain).connect(masterGain);
        source.start();
        audioLayersRef.current[sound.id] = { source, filter, gain };
      });

      setIsPlaying(true);
      return;
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      await context.resume();
      await rainAudioRef.current?.play();
      setIsPlaying(true);
    } else {
      rainAudioRef.current?.pause();
      await context.suspend();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    togglePlaybackRef.current = togglePlayback;
  });

  useEffect(() => {
    const handleNativePlay = () => {
      if (!isPlayingRef.current) {
        void togglePlaybackRef.current();
      }
    };
    const handleNativePause = () => {
      if (isPlayingRef.current) {
        void togglePlaybackRef.current();
      }
    };

    window.addEventListener("native-media-play", handleNativePlay);
    window.addEventListener("native-media-pause", handleNativePause);

    return () => {
      window.removeEventListener("native-media-play", handleNativePlay);
      window.removeEventListener("native-media-pause", handleNativePause);
    };
  }, []);

  useEffect(() => {
    if (
      !("mediaSession" in navigator) ||
      typeof MediaMetadata === "undefined"
    ) {
      return;
    }

    const mediaSession = navigator.mediaSession;
    mediaSession.metadata = new MediaMetadata({
      title: "Rainy window ritual",
      artist: "포포쿨쿨",
      album: "Sleep sounds",
    });

    const setActionHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        return;
      }
    };

    setActionHandler("play", () => {
      if (!isPlayingRef.current) {
        void togglePlaybackRef.current();
      }
    });
    setActionHandler("pause", () => {
      if (isPlayingRef.current) {
        void togglePlaybackRef.current();
      }
    });
    setActionHandler("stop", () => {
      if (isPlayingRef.current) {
        void togglePlaybackRef.current();
      }
    });

    return () => {
      mediaSession.metadata = null;
      setActionHandler("play", null);
      setActionHandler("pause", null);
      setActionHandler("stop", null);
    };
  }, []);

  return (
    <div className="app-shell">
      <audio
        ref={rainAudioRef}
        className="media-audio"
        src={rainAudio}
        preload="auto"
        loop
        playsInline
        aria-hidden="true"
      />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="moon" size={19} />
          </div>
          <span>포포쿨쿨</span>
        </div>

        <div className="profile-card">
          <div className="avatar">P</div>
          <div>
            <strong>Good evening, Popo</strong>
            <span>Ready to wind down?</span>
          </div>
          <button
            className="icon-button subtle"
            type="button"
            aria-label="알림"
          >
            <Icon name="bell" size={17} />
          </button>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {[
            ["My mixes", "heart"],
            ["Sound library", "leaf"],
            ["Sleep history", "bookmark"],
          ].map(([label, icon]) => (
            <button
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              key={label}
              type="button"
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon as IconName} size={18} />
              <span>{label}</span>
              {label === "My mixes" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="tip-card">
            <div className="tip-icon">
              <Icon name="sparkle" size={16} />
            </div>
            <div>
              <strong>Small ritual</strong>
              <span>Consistency helps your body slow down.</span>
            </div>
          </div>
          <button className="settings-link" type="button">
            <Icon name="sliders" size={17} /> Settings
          </button>
          <span className="version">v0.1 · prototype</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="top-actions">
            <button className="search-button" type="button">
              <Icon name="search" size={17} />
              <span>Search sounds</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
            >
              <Icon name="bell" size={18} />
            </button>
            <div className="mini-avatar">P</div>
          </div>
        </header>

        <div className="content-wrap">
          <section className="intro-row">
            <div>
              <p className="eyebrow">
                <span className="live-dot"></span> Your quiet space
              </p>
              <h1>
                Settle!! in,
                <br />
                <em>sleep softly.</em>
              </h1>
              <p className="intro-copy">
                A little sound can make a big difference.
                <br />
                Build the atmosphere that feels right tonight.
              </p>
            </div>
            <div className="date-note">
              <span>Tuesday, September 5</span>
              <strong>9:42 PM</strong>
            </div>
          </section>

          <section className="player-card" aria-label="Current mix">
            <div className="player-visual">
              <div className="constellation constellation-one"></div>
              <div className="constellation constellation-two"></div>
              <div className="moon-visual">
                <Icon name="moon" size={48} />
              </div>
              <div className="visual-caption">
                <span>Currently playing</span>
                <strong>
                  {isPlaying ? "Drifting into quiet" : "Your mix is ready"}
                </strong>
              </div>
            </div>
            <div className="player-controls">
              <div className="player-head">
                <div>
                  <span className="section-kicker">Tonight's mix</span>
                  <h2>Rainy window ritual</h2>
                </div>
                <button
                  className={`save-button ${isSaved ? "saved" : ""}`}
                  type="button"
                  onClick={() => setIsSaved(!isSaved)}
                >
                  <Icon name="bookmark" size={17} />{" "}
                  {isSaved ? "Saved" : "Save mix"}
                </button>
              </div>
              <div className="progress-track">
                <span style={{ width: isPlaying ? "38%" : "12%" }}></span>
              </div>
              <div className="progress-meta">
                <span>{isPlaying ? "08:26" : "00:00"}</span>
                <span>30:00</span>
              </div>
              <div className="control-row">
                <div className="master-volume">
                  <Icon name="sun" size={17} />
                  <input
                    aria-label="Master volume"
                    type="range"
                    min="0"
                    max="100"
                    value={masterVolume}
                    onChange={(event) =>
                      setMasterVolume(Number(event.target.value))
                    }
                  />
                  <span>{masterVolume}%</span>
                </div>
                <button
                  className="play-button"
                  type="button"
                  onClick={() => void togglePlayback()}
                  aria-label={isPlaying ? "Pause mix" : "Play mix"}
                >
                  <Icon
                    name={isPlaying ? ("pause" as IconName) : "play"}
                    size={22}
                  />
                  <span>{isPlaying ? "Pause mix" : "Play mix"}</span>
                </button>
              </div>
            </div>
          </section>

          <div className="section-heading">
            <div>
              <span className="section-kicker">Sound layers</span>
              <h2>Shape your atmosphere</h2>
            </div>
            <button className="text-button" type="button">
              <Icon name="plus" size={17} /> Add sound
            </button>
          </div>
          <section className="sound-grid">
            {sounds.map((sound) => (
              <article
                className={`sound-card ${sound.volume > 0 ? "selected" : ""}`}
                key={sound.id}
              >
                <div className={`sound-icon ${sound.color}`}>
                  <Icon name={sound.icon} size={24} />
                </div>
                <div className="sound-info">
                  <h3>{sound.name}</h3>
                  <p>{sound.description}</p>
                </div>
                <button
                  className={`toggle ${sound.volume > 0 ? "on" : ""}`}
                  type="button"
                  aria-label={`${sound.name} ${sound.volume > 0 ? "끄기" : "켜기"}`}
                  onClick={() =>
                    updateSoundVolume(sound.id, sound.volume > 0 ? 0 : 50)
                  }
                >
                  <span></span>
                </button>
                <div className="sound-slider">
                  <input
                    aria-label={`${sound.name} volume`}
                    type="range"
                    min="0"
                    max="100"
                    value={sound.volume}
                    onChange={(event) =>
                      updateSoundVolume(sound.id, Number(event.target.value))
                    }
                    style={
                      { "--value": `${sound.volume}%` } as React.CSSProperties
                    }
                  />
                  <span>{sound.volume}%</span>
                </div>
              </article>
            ))}
          </section>

          <section className="bottom-grid">
            <div className="timer-panel">
              <div className="panel-title">
                <div>
                  <span className="section-kicker">Wind down</span>
                  <h2>Sleep timer</h2>
                </div>
                <div className="timer-icon">
                  <Icon name="moon" size={19} />
                </div>
              </div>
              <p>Let the sound fade away when you are ready.</p>
              <div className="timer-options">
                {["15 min", "30 min", "1 hour", "Until morning"].map(
                  (timer) => (
                    <button
                      className={selectedTimer === timer ? "selected" : ""}
                      type="button"
                      key={timer}
                      onClick={() => setSelectedTimer(timer)}
                    >
                      {timer}
                    </button>
                  ),
                )}
              </div>
              <div className="fade-row">
                <span className="fade-status">
                  <span></span> Fade out gently
                </span>
                <button
                  className="toggle on"
                  type="button"
                  aria-label="Fade out toggle"
                >
                  <span></span>
                </button>
              </div>
            </div>
            <div className="stats-panel">
              <div className="panel-title">
                <div>
                  <span className="section-kicker">Your rhythm</span>
                  <h2>Rest, measured softly</h2>
                </div>
                <Icon name="heart" size={21} />
              </div>
              <div className="stat-main">
                <strong>4.2</strong>
                <span>
                  hours
                  <br />
                  this week
                </span>
                <div className="stat-trend">↗ 18%</div>
              </div>
              <div className="week-bars">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <div className="bar-item" key={`${day}-${index}`}>
                    <div className="bar">
                      <span
                        style={{
                          height: `${[42, 62, 36, 80, 54, 68, 27][index]}%`,
                        }}
                      ></span>
                    </div>
                    <small>{day}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="main-footer">
            <span>
              <Icon name="cloud" size={15} /> Your mix is saved locally
            </span>
            <span>
              {activeSounds} active layers · {selectedTimer} timer
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
