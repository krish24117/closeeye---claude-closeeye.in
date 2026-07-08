# Close Eye — Founder's Story: Build Brief & Timestamp Template

Two things here:
1. **The build brief** — paste it straight into Claude Code.
2. **The timestamp template** — fill it in as you listen back to your recording, then hand it over with the audio.

---

## 1 · Paste this into Claude Code

> **Build the Founder's Story experience for the Close Eye Internal Mission Platform.**
>
> **Content:** Use the script in `Close_Eye_Founder_Story_Script_v1.md` (title card + 15 scenes + ending screen). Do not rewrite the copy. The company is written **"Close Eye"** (two words) in all prose; the logo wordmark stays lowercase "close eye". Never render it as "CloseEye".
>
> **Where it lives:** It's its own narrated chapter in the existing flow: Welcome → Mission → Origin → **Founder's Story (this)** → Timeline → Milestones → Ending → Sign in. Reuse the existing design system.
>
> **Design tokens:** Deep Forest background `#0E2A1F`; primary text off-white `#F7F6F1`; Emerald `#06A94E` and Sprout `#83C400` as accents; sage `#5B6B62` for dimmed text. Large, calm typography. Generous whitespace. Slow fades — never rushed.
>
> **Scene behaviour:**
> - One scene per screen. Within a scene, reveal each line one at a time (fade + slight rise).
> - The line currently being spoken is full-white (highlighted); already-spoken lines dim to ~60%; upcoming lines are hidden until reached.
> - A thin vertical progress indicator shows "scene N of 15", matching the timeline dots already used.
> - Transitions between scenes are slow cross-fades.
>
> **Audio player (floating):**
> - Controls: play, pause, replay, skip.
> - Load narration from `/audio/founder-en.mp3` (path is a variable — I'll supply the real file).
> - Sync the caption highlight to a timing file `founder-en.vtt` (or a JSON list of `{lineId, startTime}`) — highlight each line when its timestamp is reached.
> - **Fallback:** if no audio file is present, show the state `🎙 Founder's narration — coming soon` and let the reader advance scenes manually with a "Continue" tap / arrow. The experience must work fully with no audio.
>
> **Persistence:** Remember playback position (scene + audio time) so a returning user resumes where they left off. No login required for this; store locally.
>
> **Languages:** Build English now, but structure captions and audio by language code (`en`, `te`, `hi`) using the same scene/line IDs, so Telugu and Hindi tracks can be dropped in later without code changes.
>
> **Accessibility:** High contrast on the dark background (readable by tired eyes at midnight); captions on by default; respect reduced-motion (skip animations if the OS asks).
>
> **Acceptance:** It should feel like the opening chapter of a documentary — silent version ships first and looks complete; audio + synced captions drop in later via the file paths above.

---

## 2 · Timestamp template

Play your recording once and note where each line **starts** (mm:ss). Or ask Claude Code to auto-generate this from the MP3 with a transcription tool (Whisper) and just check it. Hand this back alongside `founder-en.mp3`.

```
LANGUAGE: en
AUDIO FILE: founder-en.mp3

# TITLE CARD
00:00   Hi.
00:00   I'm Krishna.
00:00   Not the Founder.
00:00   Not the CEO.
00:00   Just Krishna.

# SCENE 1 — Thank you
00:00   Thank you for taking a few minutes to listen.
00:00   Before I tell you about Close Eye,
00:00   I want to tell you about one day that changed my life.

# SCENE 2 — The day
00:00   A little while ago, on a June morning,
00:00   my daughter was born.
00:00   It was the happiest day of my life —
00:00   and, unexpectedly, one of the loneliest.

# SCENE 3 — The quiet room
00:00   In that room there were only a few of us.
00:00   My wife. Our newborn daughter.
00:00   My sister-in-law, who never left our side.
00:00   And my parents.
00:00   Everyone else I loved was far away.

# SCENE 4 — The silence
00:00   There was no crowd outside the door.
00:00   No phone buzzing every few minutes —
00:00   "Is it a boy or a girl?" "How's the baby?"
00:00   For a few moments, everything went quiet.

# SCENE 5 — What loneliness feels like
00:00   I held my daughter for the first time.
00:00   I wanted to share that joy with the world.
00:00   And I realised I had almost no one to call.
00:00   For the first time, I understood
00:00   what loneliness feels like
00:00   in life's most precious moment.

# SCENE 6 — The fear every parent carries
00:00   Then a thought came —
00:00   the one every parent quietly carries.
00:00   "What if something happens to me?"
00:00   Her mother would always love her.
00:00   Her grandparents would always protect her.
00:00   But I wished there was something more.

# SCENE 7 — Not to replace. To strengthen.
00:00   Not someone to replace family.
00:00   Something to strengthen it.
00:00   A trusted circle.
00:00   A trusted presence.
00:00   People who would stand beside her
00:00   if life ever became hard.

# SCENE 8 — Millions already live with this
00:00   And I realised millions of families
00:00   already live with this feeling.
00:00   Parents growing old.
00:00   Children living oceans away.
00:00   Grandparents missing birthdays.
00:00   Families separated by cities, by countries, by life.
00:00   Every night, someone wonders,
00:00   "Are they okay?"

# SCENE 9 — From idea to responsibility
00:00   That was the moment Close Eye
00:00   stopped being a startup idea.
00:00   It became my responsibility.
00:00   Close Eye exists so that no family
00:00   faces life's most important moments alone.

# SCENE 10 — What we are, and what we are not
00:00   We don't replace relationships. We strengthen them.
00:00   We don't replace sons or daughters —
00:00   we help them stay present, even across distance.
00:00   We don't replace parents —
00:00   we help families care for one another
00:00   with dignity, trust, and compassion.

# SCENE 11 — What you're really joining
00:00   Every visit. Every WhatsApp update.
00:00   Every companion. Every conversation.
00:00   Is a family trusting us.
00:00   When you join Close Eye,
00:00   you're not joining a startup.
00:00   You're becoming someone's trusted presence.

# SCENE 12 — Built by people, not software
00:00   I made another promise that day.
00:00   Close Eye should never exist only for its founders.
00:00   It should grow with the people who build it.
00:00   Think like an owner.
00:00   Build with integrity.
00:00   Protect trust.
00:00   Because trust is never built by software.
00:00   Trust is built by people.

# SCENE 13 — Family Day
00:00   So every year, on the same June day,
00:00   we won't only mark a company anniversary.
00:00   We'll celebrate Family Day —
00:00   a reminder of why Close Eye exists,
00:00   that every request is a family,
00:00   and that no technology replaces genuine human presence.

# SCENE 14 — Why this matters
00:00   One day, I hope you'll meet my daughter.
00:00   Not because she's our brand —
00:00   but because she reminds us why this matters:
00:00   every child deserves grandparents,
00:00   every grandparent deserves a grandchild's laughter,
00:00   and every family deserves to stay close,
00:00   no matter the distance.

# SCENE 15 — Welcome
00:00   Thank you for believing in this mission.
00:00   Thank you for becoming part of Close Eye.
00:00   Together, let's build
00:00   the world's most trusted presence network.

# CLOSING — before the dashboard
00:00   Before you enter the dashboard…
00:00   I'd like you to remember one thing.
00:00   Every notification you receive…
00:00   Every phone call you answer…
00:00   Every WhatsApp message you send…
00:00   Every visit you coordinate…
00:00   Every decision you make…
00:00   Will represent someone's family.
00:00   Someone will sleep peacefully tonight because of your work.
00:00   That is our responsibility.
00:00   That is our privilege.
00:00   And that is why Close Eye exists.
00:00   Close Eye doesn't replace relationships.
00:00   It protects them.
00:00   It strengthens them.
00:00   It helps them grow, even across distance.
00:00   Welcome to Close Eye.
00:00   Thank you for becoming someone's Trusted Presence.
```

---

## Your 4-step checklist

1. **Build silent first.** Paste the brief above → get the scenes, fades and flow working with the "coming soon" state. Ship it.
2. **Record** the English narration on your phone (quiet room, slow, unhurried). Export as `founder-en.mp3`.
3. **Fill in this template** (or let Claude Code auto-time it from the MP3), save as `founder-en.vtt`/JSON.
4. **Hand Claude Code** the MP3 + timing file and say: *"Wire these into the player and sync the caption highlight."* Repeat later for Telugu (`te`) and Hindi (`hi`).

*Tip: record when you actually feel it — early morning, or a day something reminds you why you started. The pauses carry the emotion; don't rush them.*
