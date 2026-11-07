# 🦠 Bugs & Drugs Showdown 💊

A party quiz game for studying micro & pharm with friends, using Bluetooth **Anki remotes** as buzzers.
It's one web page with no install and no internet needed.

## Play
1. Download this whole folder (`index.html` + the `decks/` folder) and open `index.html` in **Chrome or Edge**.
2. Pair all the remotes with that computer over Bluetooth.
3. Choose a mode, click **Set up remote** for each player, and press their buttons in order.
4. Plug the laptop into a TV if you have one, click **Fullscreen**, and press **Start game**.

| Mode | Buttons per remote | How it works |
|---|---|---|
| Multiple choice | 4 | Everyone answers A–D privately; faster correct answers score more (500–1000 pts) |
| True or False | 2 | A clue plus a proposed answer. Is it right? |
| Buzzer | 1 | No choices shown. First to buzz says the answer out loud; host presses **Y**/**N** (wrong = −250) |

After each game you get a list of every card someone missed, plus a button to replay only those cards.

**Host keys:** `Enter`/`Space` reveal or next · `Y`/`N` judge a buzzer answer · `Esc` pause · `F` fullscreen.

## If two remotes clash
A browser can't tell two identical keyboards apart. If your remotes are the same model in the same mode,
the second one will show *"already Player 1's button"*. To fix it, put each remote in a **different mode**
(arrows / page / volume / mouse; check the manual), use **gamepad mode** if the remote has one
(controllers *are* told apart), or have one player use the laptop keyboard.

## Built-in decks
- **Bugs & Drugs (starter):** 150 cards: name that bug/drug, mechanisms, side effects, drug of choice
- **Pharmacokinetics (Aggarwal lecture):** 107 cards: concepts, equations, Vd, body fluids, Phase I/II, dosing math (lecture examples), clinical concepts

To add a deck, put a file in `decks/` (copy the format of an existing one) and add a `<script>` line for it in `index.html`.
Each card is `[category, question, answer, note, [wrong choices]]`, and the last two are optional.

## Your own cards
Click **Import deck** to load any of these:
- **Anki export:** *File → Export → Notes in Plain Text (.txt)*, with "Include deck name" and "Include tags" checked.
  Subdecks/tags become categories. Cloze cards work.
- **CSV:** `category,question,answer,note`
- **JSON:** `{"name": "...", "cards": [["category","question","answer","optional note"], ...]}`

Wrong choices come from other answers **in the same category**, so keep each category to one kind of answer
(all organisms, all drugs, all mechanisms…). Imported decks are saved in the browser.
