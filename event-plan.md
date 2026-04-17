## Aptitude Arena – Event Plan

### 1. Event structure

- **Participants**: 30–60 juniors, playing in **teams of 3** (Team A, Team B, Team C) using the existing `index.html` team setup.
- **Rounds**:
  - **Round 1 – Written Aptitude Test (individual)**  
    - Every student writes the test individually.  
    - Used to shortlist the **top 12–15 students**.
  - **Round 2 – Aptitude Arena Game (team-based on projector)**  
    - Shortlisted students are grouped into **three balanced teams** for the interactive game in `aptitude_game.html`.
- **Total duration**: About **1 hour 45 minutes**  
  - 10–15 min: Registration + seating + instructions  
  - 45–50 min: Round 1 written test  
  - 15–20 min: Correction + short break  
  - 30–35 min: Round 2 interactive game + final results

### 2. Round 1 – Written aptitude test

- **Question paper**: Use `round1-questions.md` (30 MCQs).
- **Question distribution (30 questions)**:
  - 10 **Quantitative aptitude** (simplification, HCF & LCM, numbers, arithmetic, algebra).
  - 10 **Logical / analytical reasoning** (series, coding–decoding, odd one out, puzzles).
  - 10 **Verbal ability** (synonyms, antonyms, analogy, simple comprehension-style questions).
- **Format**:
  - All questions are **MCQs with 4 options (A–D)**.
  - Students mark answers on a separate answer sheet (A/B/C/D).
- **Marking scheme**:
  - **+2 marks** for every correct answer.
  - **0 marks** for wrong or unattempted answers (no negative marking, to keep it friendly).
  - Maximum score: **60 marks**.
- **Time**:
  - **45 minutes** strictly.
- **Selection rule**:
  - Rank students by score.
  - Shortlist the **top 12–15 students** (you can adjust depending on participation).
  - Use tie-break on: higher score in Quant section, then Logical, then Verbal.

### 3. Round 2 – Aptitude Arena interactive game

- **Platform**: Use the existing interactive board in `aptitude_game.html` on a projector.
- **Teams**:
  - Divide shortlisted students into **three teams** (A, B, C).  
  - Balance teams by mixing high, medium, and lower scorers.
  - Set team names and avatars on `index.html` before the game starts.
- **Game flow**:
  - Display the board on the projector and toggle the scoreboard using **Ctrl + 7** (as supported by the current code).
  - Teams take turns choosing a circle from the grid; the corresponding question pops up.
  - You read/show the question, teams think and answer within the on-screen timer (30 seconds).
  - If any team answers correctly:
    - Select that team in the scoring popup; the grid cell becomes completed ✔ and that team’s score increases by **1 point**.
  - If no team can answer correctly:
    - Choose “No One”; the cell is marked as wrong ✘.
- **Scoring in Round 2**:
  - Each correct question in the game: **+1 point**.
  - No negative marking.

### 4. Overall scoring and winners

- **Option 1 – Only Round 2 decides winners (simpler)**:
  - Use written test **only for shortlisting** and forming balanced teams.
  - Declare **Champion Team** and optionally **Runner-up Team** purely by Round 2 scores.
- **Option 2 – Combine Round 1 + Round 2 (more academic)**:
  - Give each team a **starting bonus** based on average Round 1 scores of its members.
  - Example:  
    - Take each team’s mean Round 1 score (out of 60).  
    - Divide by 10 and round to nearest integer → **bonus points (0–6)**.  
    - Final team score = bonus + Round 2 game points.

Choose whichever option fits your department’s culture; Option 1 keeps the event more fun and game-like.

### 5. Topics covered (for Question setting)

- **Quantitative aptitude**:
  - Simplification and BODMAS
  - HCF & LCM, factors and multiples
  - Percentages and ratios
  - Basic arithmetic (addition, subtraction, multiplication, division)
  - Time & work / simple word problems (optional)
- **Logical / analytical reasoning**:
  - Number and letter series
  - Coding–decoding
  - Odd one out (numbers, words, objects)
  - Blood relations / direction sense (simple)
  - Basic puzzle-type questions
- **Verbal ability**:
  - Synonyms and antonyms
  - One-word substitutions or analogy pairs
  - Simple error spotting / common usage
  - Short comprehension-style statements with questions

### 6. Logistics and roles

- **Venue**:
  - A classroom or seminar hall with:
    - Seating for **30–60** students.
    - Projector and speakers (optional).
    - Whiteboard/blackboard and mic (if available).
- **Materials needed**:
  - Printed copies of Round 1 question paper (`round1-questions.md`).
  - Printed answer sheets (1 per student) – simple table with Question No. and a bubble/tick for A/B/C/D.
  - Rough sheets for calculations.
  - Pens (or instruct participants to bring their own).
  - Laptop with the `proposal-site` (`index.html` + `aptitude_game.html`) and HDMI connection to projector.
- **Volunteer roles**:
  - **Event lead/host**: Explains rules, controls the laptop during Round 2, manages time.
  - **Registration desk (1–2 people)**:
    - Handles on-spot registration or marks present participants from pre-registration.
  - **Invigilators (2–3 people)**:
    - Distribute and collect question papers and answer sheets.
    - Monitor the room during Round 1.
  - **Evaluation team (2–3 people)**:
    - Corrects the Round 1 answer sheets using the key.
    - Prepares shortlist and forms balanced teams.
- **Basic rules to announce**:
  - No phones or calculators during Round 1.
  - Strict silence and no sharing of answers.
  - Any malpractice leads to disqualification.
  - Decisions of the organizers are final.

### 7. Files and usage

- Open `index.html` to set up **team names and avatars** before Round 2.
- Run `aptitude_game.html` on the projector to conduct the interactive round.
- Print `round1-questions.md` as the written test and keep an **answer key** handy for fast evaluation.

