# Cadence — prototype

A single-file, dependency-free prototype of an Anki-shaped study client that
lives inside the school's LMS. Open `index.html` in any browser; there is no
build step and no network call.

## What it demonstrates

| Flow | Where |
| --- | --- |
| Setup conversation that designs the app (load, Step target, accent, theme, card size, density) | first run, and Preferences → Run setup again |
| LMS connection and the nightly deck build | Canvas tab |
| The school's course deck, cut into tonight's session | Decks tab |
| Coverage of the week's objectives, and filling what the deck misses | Canvas tab |
| Deck list with sorting, filtering and per-deck options | Decks tab |
| Reviewer with real scheduling, flags, bury/suspend, inline editing, card info | Study Now |
| Tutor grounded in the lecture a card came from | `a` in the reviewer, or More → Ask the tutor |
| School deck exchange, drag-to-sort, imports that join tonight's deck | Exchange tab |
| Step 1 pacing and tag-matched unsuspending | Step 1 tab |
| Command bar — change settings, themes, sort, filter, navigate, undo | bottom of the window, or `/` |
| Cade, the assistant in the corner — context-aware on every screen | the face, bottom right |
| Cade on a card: explain, rewrite shorter, mnemonic | `a` / `r` / `m`, or the More menu |
| Fun backgrounds — eight full palettes, chrome and wash | setup step 4, Preferences, or the command bar |
| Bring an existing Anki collection with its review history | setup step 1 |

## Keyboard

`space` flip · `1`–`4` grade · `a` tutor · `e` edit · `i` card info · `-` bury ·
`a` explain · `r` rewrite · `m` mnemonic · `!` suspend · `⌘Z`/`Ctrl+Z` undo ·
`/` command bar · `?` shortcut list

## The AI layer

Published as an Artifact, the page declares the `sample` capability and really
calls Claude on the viewer's account: the chat streams, card generation returns
JSON that becomes real cards in tonight's deck, and explain/rewrite/mnemonic run
against the card on screen. Every prompt carries the course context — lectures,
objectives, the student's per-deck retention and lapse counts, their Step target.

Opened as a local file, or when a viewer declines, `claude.use("sample")`
resolves null and every feature falls back to answers written into the
prototype. The pill next to the AI heading says which mode is running, and no
call is ever made without a click.

## Notes on fidelity

- New-card counts are capped by the daily limit chosen during setup, split
  across decks by weight. A per-deck override in Deck options re-splits the
  remainder across the others.
- Answering moves cards between the three count columns: new → learning, and a
  lapse sends a review card back. Every answer and card action is undoable.
- Intervals are computed per card state and formatted as Anki formats them
  (`<1m`, `<6m`, `1d`, `2.4mo`).
- Nobody builds a deck. The school maintains one course deck of 3,847 cards;
  Cadence cuts tonight's session out of it by what was taught, what is due, and
  the daily limit. The course deck row shows its size and 0/0/0, because
  everything due today was already pulled into Today.
- Cade writes cards only for objectives the course deck does not cover. The
  coverage table on the Canvas tab drives it, kept cards land in a "Written by
  Cade" subdeck of Today, and the coverage rows flip to filled.
- Importing an exchange deck fills tonight's remaining new slots from that deck
  rather than inflating the night; the remainder queues behind the daily limit
  and appears under Ridgeline Exchange.
- Only a slice of tonight's build is written out as real cards; the deck counts
  carry the remainder, and the congratulations screen says so.

Ridgeline SOM, the student and the exchange decks are invented. The medical
content, objective codes and scheduling behavior are real.
