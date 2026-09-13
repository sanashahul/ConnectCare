# Cadence — prototype

A single-file, dependency-free prototype of an Anki-shaped study client that
lives inside the school's LMS. Open `index.html` in any browser; there is no
build step and no network call.

## What it demonstrates

| Flow | Where |
| --- | --- |
| Setup conversation that designs the app (load, Step target, accent, theme, card size, density) | first run, and Preferences → Run setup again |
| LMS connection and the nightly deck build | Canvas tab |
| Deck list with sorting, filtering and per-deck options | Decks tab |
| Reviewer with real scheduling, flags, bury/suspend, inline editing, card info | Study Now |
| Tutor grounded in the lecture a card came from | `a` in the reviewer, or More → Ask the tutor |
| School deck exchange, drag-to-sort, imports that join tonight's deck | Exchange tab |
| Step 1 pacing and tag-matched unsuspending | Step 1 tab |
| Command bar — change settings, sort, filter, navigate, undo | bottom of the window, or `/` |

## Keyboard

`space` flip · `1`–`4` grade · `a` tutor · `e` edit · `i` card info · `-` bury ·
`!` suspend · `⌘Z`/`Ctrl+Z` undo · `/` command bar · `?` shortcut list

## Notes on fidelity

- New-card counts are capped by the daily limit chosen during setup, split
  across decks by weight. A per-deck override in Deck options re-splits the
  remainder across the others.
- Answering moves cards between the three count columns: new → learning, and a
  lapse sends a review card back. Every answer and card action is undoable.
- Intervals are computed per card state and formatted as Anki formats them
  (`<1m`, `<6m`, `1d`, `2.4mo`).
- Importing an exchange deck fills tonight's remaining new slots from that deck
  rather than inflating the night; the remainder queues behind the daily limit
  and appears under Ridgeline Exchange.
- Only a slice of tonight's build is written out as real cards; the deck counts
  carry the remainder, and the congratulations screen says so.

Ridgeline SOM, the student and the exchange decks are invented. The medical
content, objective codes and scheduling behavior are real.
