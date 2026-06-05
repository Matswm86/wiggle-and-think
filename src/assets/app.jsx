/* app.jsx — App shell, Home, tweaks, routing of overlays */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "warm",
  "charSkin": "sticker",
  "speed": 1
}/*EDITMODE-END*/;

const GROUPS = ["All", ...Array.from(new Set(EXERCISES.map(e => e.group)))];

function Card({ ex, onOpen }) {
  return (
    <div className="card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      aria-label={ex.name + " — " + ex.group}
      style={{ background: `color-mix(in srgb, ${ex.theme.accent} 7%, #fff)` }}>
      <div className="top" style={{ background: `color-mix(in srgb, ${ex.theme.accent} 14%, #fff)` }}>
        <span className="num">{ex.n}</span>
        <div className="bandtag-pos" style={{ position: "absolute", top: 14, right: 14 }}><BandPill band={ex.band} small /></div>
        <PipStage ex={ex} className="stage" speed={window.__spd || 1} />
      </div>
      <div className="meta">
        <h3>{ex.name}</h3>
        <div className="g">{ex.group}</div>
      </div>
    </div>
  );
}

function Home({ soundOn, setSoundOn, openSingle, openSession, openGrownups, speed }) {
  const [filter, setFilter] = React.useState("All");
  const shown = filter === "All" ? EXERCISES : EXERCISES.filter(e => e.group === filter);
  window.__spd = speed;
  return (
    <React.Fragment>
      <header className="hdr">
        <div className="brand" onClick={() => setFilter("All")}><Mark /> Wiggle&nbsp;&amp;&nbsp;Think</div>
        <div className="sp" style={{ flex: 1 }} />
        <button className="btn ghost icon-btn" title={soundOn ? "Sound on" : "Sound off"}
          onClick={() => setSoundOn(s => !s)}>{soundOn ? I.sound : I.mute}</button>
        <button className="btn ghost sm" onClick={openGrownups} aria-label="For grown-ups">{I.book}<span className="lbl-grown"> For grown-ups</span></button>
      </header>

      <div className="wrap">
        <section className="hero">
          <Confetti />
          <div style={{ position: "relative", zIndex: 2 }}>
            <h1>Wake up your<br />body &amp; brain!</h1>
            <p>28 playful moves with their own matching beat. Wiggle with Pip, then settle down calm and ready.</p>
            <div className="cta-row">
              <button className="btn green big" onClick={openSession}>{I.play} Start a session</button>
              <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>or pick a move below ↓</span>
            </div>
          </div>
          <div className="hero-stage">
            <div className="hero-blob"><PipStage ex={EXERCISES.find(e => e.id === "jacks")} className="stage" speed={speed} /></div>
          </div>
        </section>

        <div className="sec-h">
          <h2>All 28 moves</h2>
          <div className="chips">
            {GROUPS.map(g =>
              <button key={g} className={"chip" + (filter === g ? " on" : "")} onClick={() => setFilter(g)}>{g}</button>)}
          </div>
        </div>

        <div className="grid">
          {shown.map(ex => <Card key={ex.id} ex={ex} onOpen={() => openSingle(EXERCISES.indexOf(ex))} />)}
        </div>

        <footer className="footer">
          <div className="disclaimer">
            Movement is great for every child. These activities are for general wellbeing and fun —
            not medical or therapeutic treatment. Children with health, balance or developmental
            conditions should check with a professional first. &nbsp;·&nbsp;
            <a href="#" onClick={e => { e.preventDefault(); openGrownups(); }} style={{ color: "var(--ink)", fontWeight: 600 }}>The honest science →</a>
          </div>
        </footer>
      </div>
    </React.Fragment>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [soundOn, setSoundOn] = React.useState(true);
  const [single, setSingle] = React.useState(null);   // index | null
  const [session, setSession] = React.useState(false);
  const [grown, setGrown] = React.useState(false);

  React.useEffect(() => { if (!soundOn) window.PipAudio.stop(); }, [soundOn]);

  React.useEffect(() => { window.__app = { openSingle: setSingle, openSession: () => setSession(true) }; }, []);

  // lock the home page behind any full-screen overlay so it can't scroll or
  // peek through on a phone (the overlay owns the scroll while open)
  const overlayOpen = single !== null || session || grown;
  React.useEffect(() => {
    document.documentElement.style.overflow = overlayOpen ? "hidden" : "";
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; document.body.style.overflow = ""; };
  }, [overlayOpen]);

  const cls = [
    t.palette !== "warm" ? "pal-" + t.palette : "",
    t.charSkin !== "sticker" ? "skin-" + t.charSkin : ""
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} style={{ minHeight: "100vh" }}>
      <Home
        soundOn={soundOn} setSoundOn={setSoundOn} speed={t.speed}
        openSingle={i => setSingle(i)}
        openSession={() => setSession(true)}
        openGrownups={() => setGrown(true)}
      />

      {single !== null &&
        <Player ex={EXERCISES[single]} index={single} total={EXERCISES.length}
          soundOn={soundOn} speed={t.speed}
          onNav={d => setSingle(i => Math.max(0, Math.min(EXERCISES.length - 1, i + d)))}
          onClose={() => { setSingle(null); window.PipAudio.stop(); }} />}

      {session &&
        <Session soundOn={soundOn} speed={t.speed}
          onClose={() => { setSession(false); window.PipAudio.stop(); }} />}

      {grown && <Grownups onClose={() => setGrown(false)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Look" />
        <TweakRadio label="Colour theme" value={t.palette}
          options={["warm", "cool", "candy", "forest"]}
          onChange={v => setTweak("palette", v)} />
        <TweakSection label="Pip" />
        <TweakRadio label="Character finish" value={t.charSkin}
          options={["sticker", "soft", "inky"]}
          onChange={v => setTweak("charSkin", v)} />
        <TweakSlider label="Animation speed" value={t.speed} min={0.6} max={1.6} step={0.1} unit="×"
          onChange={v => setTweak("speed", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
