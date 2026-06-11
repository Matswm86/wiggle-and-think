/* grownups.jsx — the honest-science info layer (adult-facing) */

function Grownups({ onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-x" onClick={onClose} aria-label="Close">{I.close}</button>
        <h2>For grown-ups</h2>
        <p style={{ fontSize: 18, color: "var(--ink)" }}>
          <b>The honest version.</b> Active, playful movement helps young children feel calm,
          focused and ready to learn, builds strong bodies and coordination, and is most powerful
          when it also makes them <i>think, listen, and keep a beat</i>. Everything on this site is
          built around that single, defensible idea.
        </p>

        <h3>What the evidence supports</h3>
        <ul>
          <li><b>Thinking + moving beats plain cardio.</b> Movement that also demands attention and
            rule-following improves focus and self-control more than just running around — our
            “Try this” prompts and the listen-and-move games lean on this.</li>
          <li><b>Keeping a beat helps early reading.</b> Clapping and marching to a steady pulse links
            to the sound-skills underneath reading.</li>
          <li><b>Jumping builds strong bones.</b> The strongest claim of the set — impact play reliably
            increases bone density in children.</li>
          <li><b>Balance &amp; hand-eye skills</b> have a small but real link to attention and to maths
            and reading readiness.</li>
          <li><b>A short movement burst</b> measurably improves attention for a while afterward — great
            right before a focused task.</li>
        </ul>

        <h3>What we deliberately do <i>not</i> claim</h3>
        <div className="yes-no">
          <div className="box good">
            <h4>We say</h4>
            <ul>
              <li>“Helps kids feel calm, focused and ready to learn”</li>
              <li>“Builds strong bodies, bones and coordination”</li>
              <li>“Both sides of the body working together”</li>
              <li>“Moving to a beat helps early reading”</li>
            </ul>
          </div>
          <div className="box bad">
            <h4>We never say</h4>
            <ul>
              <li>“Connects the brain’s left &amp; right halves / corpus callosum”</li>
              <li>“Left-brain / right-brain learner”</li>
              <li>“Grows the hippocampus / boosts BDNF” (not shown for this age)</li>
              <li>Anything “Brain&nbsp;Gym”-branded, or “calms for 2 hours” dosage promises</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 10 }}>
          The cross-body moves (march, windmill, lazy-8) are kept because they’re genuinely good
          coordination challenges — framed as “both sides together,” never as brain-hemisphere wiring.
        </p>

        <h3>The music system</h3>
        <p>Tempo is matched to each move’s energy: real instrumental tracks, tempo-fitted to the
          exercise and looped on the bar, with the character’s movements locked to the beat. The
          tempo slider gently re-speeds the track (never more than ~10%), and the freeze-dance game
          stops and restarts the music on the bar line. Instrumental only, so words never compete
          with the movement.</p>
        <table className="tbl">
          <thead><tr><th>Band</th><th>Tempo</th><th>Use for</th></tr></thead>
          <tbody>
            {Object.entries(window.BANDS).map(([k, b]) =>
              <tr key={k}><td><span className={"bandtag b" + k}>♪ {b.name}</span></td><td>{b.range}</td><td>{b.feel}</td></tr>)}
          </tbody>
        </table>

        <h3>Music credits</h3>
        <p style={{ fontSize: 14 }}>
          Tracks by <b>Kevin MacLeod</b> (<a href="https://incompetech.com" target="_blank" rel="noreferrer">incompetech.com</a>),
          licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">Creative
          Commons: By Attribution 4.0</a>; tracks from <a href="https://mixkit.co" target="_blank" rel="noreferrer">Mixkit</a>
          (<a href="https://mixkit.co/license/#musicFree" target="_blank" rel="noreferrer">Mixkit Stock Music Free License</a>);
          and CC0 work from <a href="https://opengameart.org" target="_blank" rel="noreferrer">OpenGameArt</a>.
        </p>
        <ul style={{ fontSize: 13, color: "var(--ink-soft)", columns: 2 }}>
          {Object.values(window.MUSIC_TRACKS || {}).flat()
            .filter((t, i, a) => a.findIndex((x) => x.src === t.src) === i)
            .map((t) => <li key={t.src}>{t.title} — {t.artist} ({t.license})</li>)}
        </ul>

        <h3>A note on ages 4–7</h3>
        <p>That span hides a big developmental gap. Four-year-olds often can’t yet reliably cross the
          midline, do a full jumping jack, or sync precisely to a beat — that’s completely normal.
          Every move has an easier way in, and for the youngest, music is for <i>pacing and fun</i>,
          not precise beat-matching.</p>

        <div className="disclaimer" style={{ padding: "20px 0 0" }}>
          Movement is great for every child. These activities are for general wellbeing and fun —
          not medical or therapeutic treatment. Children with health, balance or developmental
          conditions should check with a professional first.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Grownups });
