# Wiggle & Think

Movement breaks for children aged 4 to 7, in the browser. Free, no account, no ads,
nothing to install.

Live at **[wiggle.mwmai.no](https://wiggle.mwmai.no)**.

![The Wiggle & Think home page](docs/home.png)

Twenty-eight moves, each with its own beat, its own animated demonstration and a step by
step pose breakdown. Press "Start a session" for a guided nine-move run that warms up,
gets loud, then settles back down. Or tap any single move and do that one.

## The moves

| Group | Moves |
|---|---|
| Animal Walks | Bear Crawl, Crab Walk, Inchworm, Flamingo Hop |
| Two Sides Together | Cross-Crawl March, Windmill Toe-Touch |
| Yoga & Balance | Tree Pose, Airplane Pose, Cat-Cow, Downward Dog |
| Balance & Steady | Tightrope Walk |
| Listen & Move Games | Freeze Dance |
| Rhythm & Body Drum | Clap & Echo, Body Drum |
| Jumps & Bursts | Kangaroo Jumps, Star Jumps, Jumping Jacks |
| Clever Hands | Two Beaks Talking, Piano Fingers, Palm & Beak Switch, Fist & Palm Switch, Point & Palm Switch, Peace & Palm Switch, Beak & Fist Switch, Fist & Flat Swap, Finger Counting, Rock Paper Scissors |
| Calm & Breathe | Starfish Breathing |

The Clever Hands moves are the finger and coordination drills. Nine of the ten are shown on
a real rigged 3D hand so a child can see exactly which finger goes where, which a flat
drawing cannot do. Fist & Flat Swap is an arm move and is shown on the 3D character.

## Honest about the science

There is a "For grown-ups" page, and it is deliberately unexciting. The site claims only
what the research actually supports:

- Movement that also demands attention and rule-following does more for focus and
  self-control than running around alone.
- Keeping a steady beat is linked to the sound skills underneath early reading.
- Jumping builds bone density. That is the strongest claim on the page.
- Balance and hand-eye skills have a small but real link to attention and to maths and
  reading readiness.
- A short movement burst measurably improves attention for a while afterwards.

It does not claim hemisphere balancing, Brain Gym, or that any of this raises a test
score. The three source briefs the content and animations were written from live in
`src/_research/`.

## How it is built

Plain React (the production UMD build, self-hosted), JSX transpiled ahead of time, no
bundler and no framework beyond that. The page ships under a strict Content Security
Policy with `script-src 'self'` and no `unsafe-eval`, which is why the JSX is transpiled
at build time rather than in the browser.

```
src/
  index.html              shell
  assets/
    data.js               the 28 moves, session order, tempo bands, music tracks, phases
    pip.js                Pip, the articulated SVG mascot (biped, quadruped and crab rigs),
                          the fallback for any move without a 3D rig
    sonic3d.js            3D character rig: poses a skeleton from baked animation clips
    hands3d.js            3D hands for the Clever Hands moves, rigged 69-bone glTF
    floor3d.js            3D Pip creature for the all-fours moves, built in code
    audio.js              Web Audio engine: music loops, a synth groove, per-move sound effects
    anim.css / char.css   per-move keyframes, rig pivots, blink, breathing belly
    app.css               site styling
    music/                13 bar-aligned music loops
    vendor/               React and Three.js, self-hosted
  _research/              the three source briefs
build.mjs                 JSX to JS, copies vendor, models, animation and music, writes dist/
verify.mjs                headless render of dist/ with console-error capture
live-verify.mjs           the same check against the live domain
rwd.mjs                   headless render of dist/ at eight screen sizes, flags sideways overflow
```

Each of the three 3D rigs (hands, character, floor creature) draws through **one**
offscreen WebGL renderer into plain 2D canvases. Browsers cap live WebGL contexts at
around sixteen, and the move grid alone wants twenty-eight, so the player stage animates
live while every card and thumbnail gets a single rendered frame.

```bash
npm install
node build.mjs     # writes dist/
node verify.mjs    # headless render plus screenshots plus error capture
```

Deploying is an rsync of `dist/` to any static host:

```bash
rsync -az --delete dist/ user@your-server:/var/www/play/
```

One serving note: glTF textures are decoded through a blob URL, so the host's CSP needs
`blob:` in `connect-src`, `img-src` and `worker-src`. Without it the models load but
render black.

## Editing it later

[`HOW_TO_ADJUST.md`](HOW_TO_ADJUST.md) is the plain-language guide: how to change a move's
wording, its tempo, its animation or its sound without reading the whole codebase.
[`tools/`](tools/) holds the 3D pipeline notes, including how a new character animation
gets baked and wired in.

## Credits

Music is Kevin MacLeod (CC BY 4.0), Mixkit and OpenGameArt (CC0). Full list in
[CREDITS.md](CREDITS.md). Sound effects are synthesised in the browser, so there are no
sound-effect files to license. The two fonts, Baloo 2 and Fredoka, load from Google Fonts.

The 3D character model in the hero and on half of the move cards is third-party fan-model
content and is not covered by this repository's licence. The project's own code is MIT.

## Licence

MIT for the code in this repository. Third-party models, music and fonts keep their own
licences, described under Credits above.
