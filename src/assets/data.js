/* ============================================================
   data.js — the 20 exercises. window.EXERCISES
   Limbs stay color-coded everywhere (left=orange, right=blue);
   themes only change body / belly / accent / ears (the "morph").
   Music bands A–E map to BPM in audio.js.
   ============================================================ */
window.EXERCISES = [
  { id:"bear", n:1, name:"Bear Crawl", group:"Animal Walks", rig:"quad", anim:"ex-bear",
    theme:{body:"#c08a4e",belly:"#f3dcae",accent:"#835225",ears:"bear",tail:"#835225"},
    kid:"Walk like a strong bear — hands and feet on the floor, knees up!",
    steps:["Hands flat on the floor, bottom up high","Move your same-side hand and foot together","Walk forward 5–10 steps, then backwards","Keep your knees off the floor"],
    activates:"Shoulders, arms, core & whole-body coordination ('heavy work' that helps kids feel calm and organised).",
    evidence:"MODERATE", band:"C", bpm:[100,120], duration:"1–2 min",
    safety:"Clear a path. Slow and controlled — no racing. Sore wrists? Crawl on fists.",
    think:"Call out a colour for Pip to 'walk to'." },

  { id:"crab", n:2, name:"Crab Walk", group:"Animal Walks", rig:"crab", anim:"ex-crab",
    theme:{body:"#e35d4b",belly:"#ffd9c9",accent:"#b23a2e",ears:"none"},
    kid:"Tummy up like a table, scuttle sideways like a crab!",
    steps:["Sit, hands behind you, fingers toward your feet","Push your hips up so your tummy is flat","Walk sideways: hand and foot together","Keep your bottom up the whole time"],
    activates:"Triceps, core, glutes and shoulder stability.",
    evidence:"MODERATE", band:"C", bpm:[100,120], duration:"1–2 min",
    safety:"Look where you're going. Not on slippery floors. Stop if wrists ache." },

  { id:"inch", n:3, name:"Inchworm", group:"Animal Walks", rig:"quad", anim:"ex-inch",
    theme:{body:"#9bcf53",belly:"#e7f3cf",accent:"#5f9322",ears:"antennae",tail:"#5f9322"},
    kid:"Stretch long, then scrunch up small like a wiggly inchworm.",
    steps:["Stand tall, then fold and touch the floor","Walk your hands out to a long plank","Keep hands still, walk your feet up close","Stand up — that's one! Do 4–6"],
    activates:"Core, shoulders, hamstrings and calves; full-body coordination.",
    evidence:"MODERATE", band:"C", bpm:[100,110], duration:"1–2 min",
    safety:"Keep your tummy tight so your back stays flat. Go at your own pace." },

  { id:"flamingo", n:4, name:"Flamingo Hop", group:"Animal Walks", rig:"biped", anim:"ex-flamingo",
    theme:{body:"#ff8fb0",belly:"#ffe0ea",accent:"#e85d86",ears:"flamingo"},
    kid:"Wings out, one leg up — hop like a pink flamingo!",
    steps:["Stand tall, arms out like wings","Lift one foot and bend that knee","Take 5 small light hops","Switch to the other foot"],
    activates:"Single-leg balance, ankle stabilisers, hip strength.",
    evidence:"MODERATE", band:"C", bpm:[100,120], duration:"~1 min",
    safety:"Land soft on the ball of your foot. Wobbly? Touch a wall with one finger." },

  { id:"march", n:5, name:"Cross-Crawl March", group:"Two Sides Together", rig:"biped", anim:"ex-march",
    theme:{body:"#7e7be0",belly:"#e7e6fb",accent:"#f4b740",ears:"crown"},
    kid:"March and tap your knee with the opposite hand — both sides working together!",
    steps:["Stand tall and march on the spot","Lift your right knee, tap it with your left hand","Switch: left knee, right hand","Keep a steady beat, about 20 taps"],
    activates:"Both sides of the body working together, crossing the middle, core & focus.",
    evidence:"MODERATE", band:"B", bpm:[90,105], duration:"1–2 min",
    safety:"Start slow to find the opposite-hand-to-knee match. Too tricky? Just march — crossing comes with practice.",
    think:"Speed up or slow down on a grown-up's call." },

  { id:"windmill", n:6, name:"Windmill Toe-Touch", group:"Two Sides Together", rig:"biped", anim:"ex-windmill",
    theme:{body:"#66c0a6",belly:"#e2f3ec",accent:"#2e7d5b",ears:"leaf"},
    kid:"Big arms like a windmill — reach one hand across to the opposite foot.",
    steps:["Feet wide, arms out in a big T","Reach your right hand down to your left foot","Come back up to the T","Now left hand to right foot — 10 times"],
    activates:"Crossing the middle, core rotation, hamstring & shoulder stretch.",
    evidence:"MODERATE", band:"B", bpm:[80,100], duration:"1–2 min",
    safety:"Slow and smooth — no bouncing. Dizzy upside-down? Do a sitting opposite-knee touch instead." },

  { id:"beaktalk", n:7, name:"Two Beaks Talking", group:"Clever Hands", rig:"hands", anim:"ex-beaktalk",
    theme:{body:"#8ab4f0",belly:"#e4eefb",accent:"#4d96ff",ears:"antennae"},
    kid:"Make two bird beaks with your hands and let them chat — open, close, open!",
    steps:["Make a beak with each hand — all fingertips together","Open one beak while the other one closes","Now switch — like two birds taking turns to talk","Keep them chatting back and forth"],
    easy:"Open and close one beak at a time.",
    tricky:"Make them talk faster, taking turns.",
    activates:"Each hand opening and closing on its own beat — fine-motor control and bilateral timing.",
    evidence:"MODERATE", band:"B", bpm:[80,95], duration:"1–2 min",
    think:"When one beak opens, the other one closes — that's the brain part." },

  { id:"tree", n:8, name:"Tree Pose", group:"Yoga & Balance", rig:"biped", anim:"ex-tree",
    theme:{body:"#67c587",belly:"#e3f4e8",accent:"#2e7d5b",ears:"leaf",tail:"none"},
    kid:"Stand tall and still like a strong tree in the breeze.",
    steps:["Stand tall, eyes on one spot on the wall","Rest one foot on your other ankle or calf","Hands together or up like branches","Hold for 3–5 breaths, then switch"],
    activates:"Single-leg balance, ankle & core stability, focused attention.",
    evidence:"MODERATE", band:"A", bpm:[55,75], duration:"30–60s each side",
    safety:"Foot above or below the knee — never on the knee. Finger on a wall if you need it." },

  { id:"airplane", n:9, name:"Airplane Pose", group:"Yoga & Balance", rig:"biped", anim:"ex-airplane",
    theme:{body:"#74c4e0",belly:"#e2f2f8",accent:"#2b8cc0",ears:"none"},
    kid:"Wings out, one leg back — get ready for take-off!",
    steps:["Stand tall, arms out like wings","Lean your chest forward","Lift one leg straight out behind you","Make engine sounds and hold, then switch"],
    activates:"Single-leg balance, glutes, core, hip strength and focus.",
    evidence:"MODERATE", band:"A", bpm:[55,75], duration:"30–60s each side",
    safety:"Move in slowly, no leg-swinging. Hold a chair or wall to start." },

  { id:"catcow", n:10, name:"Cat-Cow", group:"Yoga & Balance", rig:"quad", anim:"ex-catcow",
    theme:{body:"#9aa7b3",belly:"#e9eef2",accent:"#5f6b76",ears:"cat",tail:"#5f6b76"},
    kid:"Moo like a cow, then meow like a cat — round and curve your back.",
    steps:["Get on hands and knees like a table","Breathe in: drop your belly, look up (moo!)","Breathe out: round your back up high (meow!)","Do 5 slow rounds"],
    activates:"Spine bending, breath-with-movement, core.",
    evidence:"MODERATE", band:"A", bpm:[55,70], duration:"~1 min",
    safety:"Wrists under shoulders, on a soft mat or carpet." },

  { id:"dog", n:11, name:"Downward Dog", group:"Yoga & Balance", rig:"quad", anim:"ex-dog",
    theme:{body:"#d6a15e",belly:"#f3e2c6",accent:"#9c6a2c",ears:"dog",tail:"#9c6a2c"},
    kid:"Make an upside-down V and wag your tail like a happy dog.",
    steps:["From hands and knees, tuck your toes","Push your bottom up to the sky","Make an upside-down V, let your head hang","Hold 3–5 breaths and wag your tail"],
    activates:"Whole-body stretch — hamstrings, calves and shoulder strength.",
    evidence:"MODERATE", band:"A", bpm:[55,75], duration:"30–45s",
    safety:"Keep elbows soft (not locked). Your heels don't need to touch the floor." },

  { id:"freeze", n:12, name:"Freeze Dance", group:"Listen & Move Games", rig:"biped", anim:"ex-freeze",
    theme:{body:"#6ec6c9",belly:"#e2f4f5",accent:"#2aa6b0",ears:"snow"},
    kid:"Dance with your whole body — when the music stops, FREEZE like a statue!",
    steps:["Dance any way you like while the music plays","When it stops — freeze and hold still!","Take one big breath","Dance again when the music starts"],
    activates:"Stopping on cue (self-control), listening and lots of happy movement.",
    evidence:"STRONG", band:"D", bpm:[120,145], duration:"3–5 min",
    safety:"Give everyone an arm's length of space. Stop if anyone runs or bumps.",
    think:"This stop-and-go is exactly the skill that builds self-control." },

  { id:"piano", n:13, name:"Piano Fingers", group:"Clever Hands", rig:"hands", anim:"ex-piano",
    theme:{body:"#8ab4f0",belly:"#e4eefb",accent:"#4d96ff",ears:"antennae"},
    kid:"Tap your fingers down one at a time, like playing a tiny piano!",
    steps:["Hold both hands up, fingers spread wide","Tap one finger down at a time: 1–2–3–4","Then tap back the other way: 4–3–2–1","Keep a steady beat with both hands"],
    easy:"Use one hand and go slow — one clear finger at a time.",
    tricky:"Both hands together, then speed the beat up.",
    activates:"Finger isolation and control (fine-motor skill) and steady timing.",
    evidence:"MODERATE", band:"B", bpm:[80,100], duration:"1–2 min",
    think:"Moving just one finger while the others wait is real brain-and-hand work." },

  { id:"clap", n:14, name:"Clap & Echo", group:"Rhythm & Body Drum", rig:"biped", anim:"ex-clap",
    theme:{body:"#e8b04a",belly:"#faecc9",accent:"#b9831f",ears:"none"},
    kid:"Listen to the clapping pattern, then clap it right back!",
    steps:["A leader claps a short pattern","Everyone echoes it exactly","Grow the patterns longer","Mix in thigh-pats, stomps and snaps"],
    activates:"Keeping a beat, listening, two-hand coordination (beat skills help early reading).",
    evidence:"MODERATE-STRONG", band:"E", bpm:[90,110], duration:"2–3 min",
    safety:"On hard floors, swap stomps for quiet knee-pats." },

  { id:"drum", n:15, name:"Body Drum", group:"Rhythm & Body Drum", rig:"biped", anim:"ex-drum",
    theme:{body:"#c98ad0",belly:"#f1e2f3",accent:"#8a4f92",ears:"none"},
    kid:"Stomp, clap and pat to make a drum with your whole body!",
    steps:["Learn 3 sounds: STOMP, CLAP, PAT","Try the pattern: stomp-stomp-clap-pat","Repeat it 4 times","Speed up, slow down, try eyes closed"],
    activates:"Remembering a rhythm (working memory), two-side coordination.",
    evidence:"MODERATE", band:"E", bpm:[90,110], duration:"2–3 min",
    safety:"Knee-pats instead of stomps on hard floors." },

  { id:"kanga", n:16, name:"Kangaroo Jumps", group:"Jumps & Bursts", rig:"biped", anim:"ex-kanga",
    theme:{body:"#e0975a",belly:"#f5dcc0",accent:"#b06a2e",ears:"round"},
    kid:"Little paws up — jump as high as you can like a kangaroo!",
    steps:["Paws at your chest, squat down a little","Jump straight up, both feet together","Land soft with bendy knees","Bounce again — 8 to 10 jumps"],
    activates:"Springy leg power and landing control — and the strongest benefit of all: building strong bones.",
    evidence:"STRONG", band:"D", bpm:[120,140], duration:"30–60s",
    safety:"Land on the balls of your feet, knees soft (never locked). Clear space above you." },

  { id:"starjump", n:17, name:"Star Jumps", group:"Jumps & Bursts", rig:"biped", anim:"ex-starjump",
    theme:{body:"#ffd166",belly:"#fff3d0",accent:"#e0a91e",ears:"star"},
    kid:"Jump up and make a big bright STAR in the air!",
    steps:["Feet together, knees soft","Jump up and throw arms and legs out wide","Make a star shape in the air","Land soft, feet together — 8 to 12 times"],
    activates:"Whole-body springy coordination and bone-strengthening.",
    evidence:"STRONG", band:"D", bpm:[120,140], duration:"30–60s",
    safety:"Soft landings. Best after you can already do basic jumps." },

  { id:"jacks", n:18, name:"Jumping Jacks", group:"Jumps & Bursts", rig:"biped", anim:"ex-jacks",
    theme:{body:"#6ab0e8",belly:"#e3f0fb",accent:"#2e6fb0",ears:"star"},
    kid:"Arms and legs out, then back together — jump along!",
    steps:["Feet together, arms down","Jump feet apart, swing arms up to clap","Jump back together","Do 10–20 at a comfy pace"],
    activates:"Whole-body two-side coordination and a great warm-up.",
    evidence:"MODERATE", band:"D", bpm:[120,125], duration:"30–60s",
    safety:"New to it? Try feet-only first, then arms-only, then together. Soft landings." },

  { id:"tightrope", n:19, name:"Tightrope Walk", group:"Balance & Steady", rig:"biped", anim:"ex-tightrope",
    theme:{body:"#b97fd6",belly:"#efe2f5",accent:"#7a4f92",ears:"none"},
    kid:"Arms out — walk the tightrope heel to toe without falling off!",
    steps:["Walk along a line on the floor","Arms out like a tightrope walker","Step heel-to-toe, eyes looking forward","Try it backwards, or with a beanbag on your head"],
    activates:"Steady moving balance, your inner-ear balance sense, heel-toe control.",
    evidence:"MODERATE", band:"B", bpm:[80,95], duration:"1–2 min",
    safety:"Flat, non-slip floor. Go slow. Beanbag only once your balance is steady." },

  { id:"breathe", n:20, name:"Starfish Breathing", group:"Calm & Breathe", rig:"biped", anim:"ex-breathe",
    theme:{body:"#8fd0c4",belly:"#e6f5f1",accent:"#3f9e8c",ears:"leaf"},
    kid:"Trace your hand and take five slow, calm breaths.",
    steps:["Spread one hand wide like a starfish","Trace up a finger as you breathe in","Trace down as you breathe out","Do all five fingers — five calm breaths"],
    activates:"Slow calming breaths and focused attention — the perfect way to finish.",
    evidence:"MODERATE", band:"A", bpm:[55,70], duration:"1–2 min",
    safety:"Never force big breaths. Feeling dizzy? Just breathe normally. Gentle tracing only." },

  /* ---------------- CLEVER HANDS — bimanual coordination drills (two hands swap shapes) ---------------- */
  { id:"palmbeak", n:21, name:"Palm & Beak Switch", group:"Clever Hands", rig:"hands", anim:"ex-palmbeak",
    theme:{body:"#8ab4f0",belly:"#e4eefb",accent:"#4d96ff",ears:"antennae"},
    kid:"One hand flat, one hand a bird beak — now switch them!",
    steps:["Left hand flat and open like a leaf","Right hand a bird beak — all fingertips and thumb together","Switch both hands at the same time","Beak becomes flat, flat becomes beak — keep swapping"],
    easy:"Go slow — make a clear beak, then a clear flat hand.",
    tricky:"Speed up and keep a steady beat.",
    activates:"Both hands doing different jobs and swapping together — bilateral coordination and focus.",
    evidence:"MODERATE", band:"B", bpm:[80,95], duration:"1–2 min",
    think:"Both hands change at the very same moment — that's the brain part." },

  { id:"fistpalm", n:22, name:"Fist & Palm Switch", group:"Clever Hands", rig:"hands", anim:"ex-fistpalm",
    theme:{body:"#7ec8a6",belly:"#e6f5ee",accent:"#2cb6a3",ears:"antennae"},
    kid:"One hand a fist, one hand flat — switch them at the same time!",
    steps:["Left hand a closed fist","Right hand a flat open palm","Switch both hands together","Fist opens, palm closes — back and forth"],
    easy:"Switch slowly, one clear shape at a time.",
    tricky:"Faster and faster, but keep both hands together.",
    activates:"Two hands doing opposite things at once — bilateral coordination and self-control.",
    evidence:"MODERATE", band:"B", bpm:[85,100], duration:"1–2 min",
    think:"Whisper “fist… palm…” to keep them opposite." },

  { id:"pointpalm", n:23, name:"Point & Palm Switch", group:"Clever Hands", rig:"hands", anim:"ex-pointpalm",
    theme:{body:"#c98ad0",belly:"#f1e2f3",accent:"#8a4f92",ears:"antennae"},
    kid:"One hand points with one finger, one hand is flat — now swap!",
    steps:["Left hand points — just your pointer finger up","Right hand flat and open","Switch both hands together","Pointer becomes flat, flat becomes pointer"],
    easy:"Make a big clear point, then a big flat hand.",
    tricky:"Keep a steady rhythm and don't peek at your hands.",
    activates:"Finger control plus swapping two shapes together — coordination and focus.",
    evidence:"MODERATE", band:"B", bpm:[80,95], duration:"1–2 min",
    think:"Only the pointing hand has a finger up — the other stays flat." },

  { id:"peacepalm", n:24, name:"Peace & Palm Switch", group:"Clever Hands", rig:"hands", anim:"ex-peacepalm",
    theme:{body:"#f0a05a",belly:"#fbe6d2",accent:"#e0922e",ears:"antennae"},
    kid:"One hand makes a peace sign, one hand is flat — switch!",
    steps:["Left hand: two fingers up like a peace sign","Right hand flat and open","Switch both hands at the same time","Peace becomes flat, flat becomes peace"],
    easy:"Two fingers up nice and clear, then a flat hand.",
    tricky:"Go quicker and keep both hands in time.",
    activates:"Holding two fingers up while the other hand stays flat — finger control and bilateral coordination.",
    evidence:"MODERATE", band:"B", bpm:[80,95], duration:"1–2 min",
    think:"Keep the other two fingers tucked while two stand up." },

  { id:"beakfist", n:25, name:"Beak & Fist Switch", group:"Clever Hands", rig:"hands", anim:"ex-beakfist",
    theme:{body:"#6ec6c9",belly:"#e2f4f5",accent:"#2aa6b0",ears:"antennae"},
    kid:"One hand a bird beak, one hand a fist — now switch them!",
    steps:["Left hand a beak — all fingertips together","Right hand a closed fist","Switch both hands together","Beak becomes fist, fist becomes beak"],
    easy:"Make each shape clearly before you switch.",
    tricky:"Speed up while keeping both shapes neat.",
    activates:"Two tricky shapes swapping together — bilateral coordination and concentration.",
    evidence:"MODERATE", band:"B", bpm:[80,95], duration:"1–2 min",
    think:"Both hands swap at the same beat." },

  { id:"fistflat", n:26, name:"Fist & Flat Swap", group:"Clever Hands", rig:"biped", anim:"ex-fistflat",
    theme:{body:"#e89b5a",belly:"#f5dcc0",accent:"#c2703a",ears:"round"},
    kid:"One hand makes a fist out to the side, one hand goes flat — now swap!",
    steps:["Right arm out to the side as a FIST","Left hand FLAT on your chest","Swap: left arm out as a fist, right hand flat","The arm out to the side is always a fist"],
    easy:"Just swap the hands slowly.",
    tricky:"Tap your heels on the floor at the same time.",
    activates:"Two hands doing different jobs, crossing toward the middle and timing.",
    evidence:"MODERATE", band:"B", bpm:[85,95], duration:"1–2 min",
    safety:"Go slow at first." },

  { id:"fingercount", n:27, name:"Finger Counting", group:"Clever Hands", rig:"hands", anim:"ex-fingercount",
    theme:{body:"#7e7be0",belly:"#e7e6fb",accent:"#5b57c8",ears:"antennae"},
    kid:"Count on your fingers — one, two, three, four, five — then back down!",
    steps:["Start with both hands in soft fists","Pop up one finger — that's 1","Keep going: 2, 3, 4… then your thumb for 5","Count back down: 5, 4, 3, 2, 1"],
    easy:"Just count up to 3 and back.",
    tricky:"Both hands together, all the way to 5 without looking.",
    activates:"Lifting one finger at a time — finger isolation, counting and both-hands control.",
    evidence:"MODERATE", band:"A", bpm:[70,85], duration:"1–2 min",
    think:"Try to move only the next finger and keep the others still." },

  { id:"rps", n:28, name:"Rock, Paper, Scissors", group:"Clever Hands", rig:"hands", anim:"ex-rps",
    theme:{body:"#f0a05a",belly:"#fbe6d2",accent:"#c96a1e",ears:"antennae"},
    kid:"Rock, paper, scissors — make all three shapes on the beat!",
    steps:["Rock — squeeze both hands into fists","Paper — open both hands flat","Scissors — two fingers out like snips","Keep the beat: rock, paper, scissors!"],
    easy:"Go slow and make each shape big and clear.",
    tricky:"Speed up and don't mix them up.",
    activates:"Switching between three clear hand shapes on a beat — finger control, sequencing and rhythm.",
    evidence:"MODERATE", band:"B", bpm:[85,100], duration:"1–2 min",
    think:"Say it out loud: rock… paper… scissors." }
];

/* a recommended 12–15 min session: warm-up walk → thinking games → jumps → balance → calm */
window.SESSION = ["bear","march","fistpalm","freeze","jacks","kanga","palmbeak","tree","breathe"];

/* 3D Sonic (sonic3d.js) renders these exercises → archetype animation.
   HYBRID: floor/animal moves (bear, crab, inch, catcow, dog) are intentionally
   absent, so PipStage keeps the SVG mascot for them (Sonic can't do all-fours). */
window.SONIC_MAP = {
  // faithful Mixamo mocap (baked)
  jacks:"Jumping Jacks", clap:"Clapping", kanga:"Jump", freeze:"Hip Hop Dancing",
  starjump:"starjump",               // custom: big X, arms up-out + legs apart (distinct from jacks)
  // custom-authored faithful clips (tools/blender pose pipeline, see CUSTOM_ANIMS)
  march:"march", tree:"tree", airplane:"airplane", flamingo:"flamingo",
  tightrope:"tightrope", windmill:"windmill", breathe:"breathe",
  fistflat:"fistflat",
  // body-drum sequence: stomp-stomp-clap-pat
  drum:"drum"
  // beaktalk / fingercount / rps are finger drills on the 3D hand rig (rig:"hands",
  // hands3d.js) — not Sonic. (They replaced the old lazy8/magicnumbers/noseear,
  // which didn't read on a full-body character.)
  // Floor/all-fours (bear/crab/inch/catcow/dog) render via floor3d.js (window.FLOOR_MAP),
  // not Sonic — handled in PipStage, not here.
};

/* 3D Pip creature (floor3d.js) renders the all-fours floor moves — Sonic's
   proportions read as a blob on all fours, so these use the kid-creature rig. */
window.FLOOR_MAP = { bear:1, crab:1, inch:1, catcow:1, dog:1 };

/* BEATS — how many music beats one animation cycle spans while music plays.
   The player locks each move's cycle to beats×60/bpm so movements land ON
   the beat (march steps on the beat, drum = stomp-stomp-clap-pat on 4, one
   breath = 8 beats). Tune here, not in the engines. */
window.BEATS = {
  march: 2, jacks: 2, flamingo: 2, tightrope: 2,
  kanga: 4, starjump: 4, windmill: 4, drum: 4, clap: 4, fistflat: 4,
  palmbeak: 4, fistpalm: 4, pointpalm: 4, peacepalm: 4, beakfist: 4, beaktalk: 4,
  rps: 6, piano: 8, fingercount: 10,
  tree: 8, airplane: 8, breathe: 8,
  bear: 4, crab: 4, inch: 6, catcow: 8, dog: 8,
  freeze: 16,
};

/* MUSIC_TRACKS — real, baked loop files (tools/make_music.py): each starts ON
   beat 1 and is a whole number of 4/4 bars, so audio.js loops the entire file
   and aligns its beat grid. band → [{src,bpm,bars,title,artist,license}].
   bpm = locally MEASURED (autocorrelation), not the catalogue claim.
   The player picks the entry nearest the requested BPM and re-speeds ≤ ~10 %.
   Licenses: CREDITS.md + the grown-ups page (CC BY 4.0 needs attribution). */
window.MUSIC_TRACKS = {
  A: [
    { src: "assets/music/facile.mp3", bpm: 57.42, bars: 32, title: "Facile", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/teller.mp3", bpm: 65.42, bars: 32, title: "Teller of the Tales", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/happyhome.mp3", bpm: 69.84, bars: 31, title: "Happy Home", artist: "Michael Ramir C.", license: "Mixkit Free" },
  ],
  B: [
    { src: "assets/music/sneaky.mp3", bpm: 87.59, bars: 32, title: "Sneaky Snitch", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/carefree.mp3", bpm: 95.7, bars: 32, title: "Carefree", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/riley.mp3", bpm: 102.34, bars: 32, title: "Life of Riley", artist: "Kevin MacLeod", license: "CC BY 4.0" },
  ],
  C: [
    { src: "assets/music/riley.mp3", bpm: 102.34, bars: 32, title: "Life of Riley", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/amazingplan.mp3", bpm: 114.84, bars: 32, title: "The Amazing Plan", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/banjo.mp3", bpm: 120.19, bars: 32, title: "Banjo Man in Africa", artist: "Michael Ramir C.", license: "Mixkit Free" },
  ],
  D: [
    { src: "assets/music/fluffduck.mp3", bpm: 121.6, bars: 30, title: "Fluffing a Duck", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/merrygo.mp3", bpm: 132.51, bars: 32, title: "Merry Go", artist: "Kevin MacLeod", license: "CC BY 4.0" },
    { src: "assets/music/monkeys.mp3", bpm: 143.55, bars: 32, title: "Monkeys Spinning Monkeys", artist: "Kevin MacLeod", license: "CC BY 4.0" },
  ],
  E: [
    { src: "assets/music/moveyourbody.mp3", bpm: 90.67, bars: 32, title: "Move Your Body", artist: "Michael Ramir C.", license: "Mixkit Free" },
    { src: "assets/music/bamboo.mp3", bpm: 99.38, bars: 31, title: "Bamboo Blitz", artist: "Tsorthan Grove", license: "CC0" },
  ],
};

/* music band reference */
window.BANDS = {
  A:{name:"Calm",   range:"55–75 BPM",  feel:"Slow & soft — breathing, balance, cool-down"},
  B:{name:"Steady", range:"80–110 BPM", feel:"Clear march beat — coordination & walking"},
  C:{name:"Moderate",range:"100–120 BPM",feel:"Bouncy & playful — animal walks"},
  D:{name:"High energy",range:"120–145 BPM",feel:"Driving beat — jumps & freeze dance"},
  E:{name:"Rhythm-led",range:"90–116 BPM",feel:"Big clear pulse — the beat IS the game"}
};

/* PHASES — key moments of each move for the synced pose breakdown.
   p = percent of the animation cycle to freeze at; t = caption.
   (freeze:true renders a held statue.) */
window.PHASES = {
  bear:[{p:0,t:"Hands & feet down, knees up"},{p:12,t:"Step your right side forward"},{p:62,t:"Then step your left side"}],
  crab:[{p:0,t:"Tummy up like a flat table"},{p:25,t:"Scoot to one side"},{p:75,t:"Then scoot back the other way"}],
  inch:[{p:0,t:"Bend, hands on the floor, hips up"},{p:45,t:"Walk your hands out to a long plank"},{p:78,t:"Keep hands still, walk your feet up"}],
  flamingo:[{p:0,t:"Wings out, lift one knee"},{p:42,t:"Hop up nice and light"},{p:70,t:"Land soft on the ball of your foot"}],
  march:[{p:0,t:"Stand tall and march"},{p:22,t:"Right knee up — tap it with your LEFT hand"},{p:72,t:"Left knee up — tap it with your RIGHT hand"}],
  windmill:[{p:0,t:"Feet wide, arms in a big T"},{p:25,t:"Right hand down to your LEFT foot"},{p:75,t:"Left hand down to your RIGHT foot"}],
  beaktalk:[{p:8,t:"Two beaks, fingertips together"},{p:50,t:"One beak opens while the other closes"},{p:85,t:"Switch — now they take turns"}],
  tree:[{p:2,t:"Stand tall, eyes on one spot"},{p:28,t:"Foot to your ankle or calf"},{p:50,t:"Hands up like branches — hold"}],
  airplane:[{p:2,t:"Stand tall, arms out like wings"},{p:40,t:"Tip forward, lift your back leg"},{p:65,t:"Hold steady and balance"}],
  catcow:[{p:0,t:"Cow — breathe IN, drop your belly, look up"},{p:50,t:"Cat — breathe OUT, round your back up"}],
  dog:[{p:5,t:"Start on hands and knees"},{p:45,t:"Push your hips up to an upside-down V"},{p:80,t:"Head hangs, wag your tail"}],
  freeze:[{p:0,t:"Dance with your whole body!"},{p:50,t:"Music stops — FREEZE like a statue!",freeze:true}],
  piano:[{p:5,t:"Hands up, fingers spread"},{p:35,t:"Tap finger 1, then 2…"},{p:60,t:"…3, then 4"},{p:90,t:"Tap back down: 4–3–2–1"}],
  clap:[{p:0,t:"Hands apart, get ready"},{p:25,t:"CLAP the pattern"},{p:75,t:"Friends echo it back to you"}],
  drum:[{p:0,t:"STOMP your feet (×2)"},{p:62,t:"CLAP your hands"},{p:90,t:"PAT your thighs"}],
  kanga:[{p:14,t:"Squat down, little paws up"},{p:42,t:"Jump straight up, high!"},{p:70,t:"Land soft — bend your knees"}],
  starjump:[{p:14,t:"Feet together, knees soft"},{p:45,t:"Throw arms & legs out — a STAR!"},{p:72,t:"Land soft, feet together"}],
  jacks:[{p:0,t:"Feet together, arms down"},{p:50,t:"Jump: feet apart, arms up high"}],
  tightrope:[{p:0,t:"Arms out for balance"},{p:25,t:"Step heel-to-toe along the line"},{p:75,t:"Other foot — eyes looking forward"}],
  breathe:[{p:0,t:"Breathe IN — arms up in a big rainbow"},{p:50,t:"Breathe OUT — arms float back down"}],
  palmbeak:[{p:0,t:"Left hand flat, right hand a beak"},{p:50,t:"Switch — left beak, right flat"}],
  fistpalm:[{p:0,t:"Left hand a fist, right hand flat"},{p:50,t:"Switch — left flat, right fist"}],
  pointpalm:[{p:0,t:"Left hand points, right hand flat"},{p:50,t:"Switch — left flat, right points"}],
  peacepalm:[{p:0,t:"Left hand a peace sign, right hand flat"},{p:50,t:"Switch — left flat, right peace sign"}],
  beakfist:[{p:0,t:"Left hand a beak, right hand a fist"},{p:50,t:"Switch — left fist, right beak"}],
  fistflat:[{p:0,t:"Right arm out as a FIST, left hand flat on your chest"},{p:50,t:"Swap — left arm out as a fist, right hand flat"}],
  fingercount:[{p:5,t:"Soft fists, ready to count"},{p:35,t:"Pop up 1… 2… 3"},{p:60,t:"…4, then thumb for 5"},{p:90,t:"Count back down to 1"}],
  rps:[{p:8,t:"Rock — both hands fists"},{p:42,t:"Paper — both hands flat"},{p:75,t:"Scissors — two fingers out"}]
};
