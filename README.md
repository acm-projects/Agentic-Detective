<p align="center">
  <img src="https://64.media.tumblr.com/3c90da32d14e544b92b89cf6f54fca0a/9b28579adc13f171-36/s400x600/a9aa1025c3ab5b20ac8bdd5ab0bd266e46be3f9a.gif" alt="detective-noir-gif" />
</p>

<h1 align="center"> 🕵️‍♂️ Agentic Detective </h1>

<div align="center"> 
  <strong>Scripted mysteries are dead. Long live the Agent.</strong><br><br>
  We've all played detective games where you just click Option A, B, or C until you win. Agentic Detective destroys that script. It is a browser-based murder mystery game where the suspects aren't reading from a database of pre-written lines, but are autonomous AI agents with their own personalities, hidden motives, and secrets. Players interrogate suspects in real-time using natural language to catch lies and solve the case before the 10-minute timer runs out. 
</div>

<br>

## MVP 🏆
* **Procedural Mystery Engine:** Generates a unique "Case File" (Killer, Weapon, Motive) and scatters truth/lie nodes every round.
* **Autonomous Suspect Agents:** 5 distinct AI characters (e.g., The Nervous Butler, The Arrogant Socialite) driven by unique system prompts.
* **The "Face Bank" System:** Dynamically injects new names and backstories into a library of character portraits.
* **Expressive Voice Integration:** Real-time Text-to-Speech (TTS) using Eleven Labs for lifelike emotion and voice acting.
* **The Ticking Clock:** A strict 600-second (10-minute) timer that forces a "Game Over" or "Final Accusation."
* **Accusation Interface:** Dedicated UI to lock in a prime suspect and trigger dynamic endings.

## Stretch Goals 🌟
* **Suspect Stress System:** Sentiment analysis that triggers voice tremors or defensive text when players get aggressive.
* **Visual Evidence Board:** An automated sidebar that "pins" key facts or alibis as they are discovered.
* **Voice-to-Text Interrogation:** Allow players to speak questions via microphone instead of typing.
* **Agent-to-Agent Interaction:** Bring two suspects into the same room to watch them argue or corroborate alibis.

## Milestones 🎞️

<details closed>
<summary>  <strong> Week 1: The Setup 📁 </strong> </summary>
<br>
  
- **General:**
  - Decide team roles (Frontend vs Backend)
  - Set up GitHub repo & VS Code
  - Set up API Keys (OpenAI/Gemini, Eleven Labs)
- **Frontend:**
  - Finalize UI design (Noir aesthetic) and UX layout
- **Backend:**
  - Design the "Murder Scenario" logic (Who, How, Why)
  - Make test requests to LLMs to get JSON responses

</details>

<details closed>
<summary>  <strong> Week 2: Hello World ⚡ </strong> </summary>
<br>
  
- **Frontend:**
  - Initialize React/Vite project
  - Build basic layout: Chat box, input field, suspect image area
  - Research CSS animations for "talking" effects
- **Backend:**
  - Create "Hello World" API: Script that sends text to Eleven Labs and saves MP3
  - Create `.env` template for team keys

</details>

<details closed>
<summary>  <strong> Week 3: Core Mechanics ⚙️ </strong> </summary>
<br>
  
- **Frontend:**
  - Build "Chat Bubble" components
  - Create "Timer" and "Game Over" screens
  - Implement "Accusation" modal
- **Backend:**
  - Prompt Engineering: Refine System Prompt so AI hides secrets/ignores irrelevant questions
  - Work on mystery scenario generation logic
  - Create "Face Bank" to load images dynamically

</details>

<details closed>
<summary>  <strong> Week 4: The Voice 🎙️ </strong> </summary>
<br>
  
- **Frontend:**
  - Audio Integration: Player to play blobs/streams
  - Style the "Suspect Portrait" area
- **Backend:**
  - Streaming Audio: Implement code to play audio chunks as they arrive (Latency fix)
  - Integrate "Flash v2.5" models for speed
  - Build "Context Memory" (track last 5 messages)

</details>

<details closed>
<summary>  <strong> Week 5: Game Loop 🔄 </strong> </summary>
<br>
  
- **Frontend:**
  - Build "Case File" intro screen
  - Add visual feedback for "Stress" (optional heartbeat monitor?)
  - Polish chat scrolling behavior
- **Backend:**
  - Game Logic: Implement "Win Condition" check
  - Randomize the killer for each new session

</details>

<details closed>
<summary>  <strong> Week 6: Polish & Optimize ✨ </strong> </summary>
<br>
  
- **Playtesting:** Test on different screen sizes
- **Audio:** Add sound effects (rain, typewriter clicks)
- **Optimization:** - Review API usage quotas
  - Add caching for common phrases ("I don't know!")
  - Fix backend integration bugs

</details>

<details closed>
<summary>  <strong> Week 7: Security & Tutorials 🛡️ </strong> </summary>
<br>
  
- **UI:** Polish "Win/Loss" screens, add "How to Play" overlay
- **Security:** Prevent "Prompt Injection" (players tricking the AI)
- **Code:** Final Code Review and bug fixes

</details>

<details closed>
<summary>  <strong> Week 8-10: The Home Stretch 🎬 </strong> </summary>
<br>
  
- **Week 8:** Freeze new features, create AI flow diagrams, monitor API costs.
- **Week 9:** Polish UI fonts/colors/shadows, fix critical crashes, ensure subscriptions active.
- **Week 10:** Practice, Practice, Practice for Demo Day!

</details>

## Tech Stack 💻

<strong> IDE: </strong> VSCode                                                                        
<strong> Version Control: </strong> Git / GitHub                                                  
<strong> Design: </strong> Figma

<strong> Frontend </strong> 
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **State Management:** Zustand or React Context API
- **Icons:** Lucide React / Heroicons

<strong> Backend & AI </strong>  
- **Runtime:** Node.js (Optional/Local)
- **LLM (The Brain):** Google Gemini (gemini-1.5-flash)
- **TTS (The Voice):** Eleven Labs (eleven_flash_v2_5)
- **Orchestration (Optional):** LangChain or AI SDK

 
## Helpful Resources 🔎

<strong> React & Frontend: </strong>
- [React Documentation](https://react.dev/learn)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zustand State Management](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Context API Guide](https://react.dev/learn/passing-data-deeply-with-context)

<strong> Backend & AI APIs: </strong>
- [Eleven Labs API Reference](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Google Gemini API Quickstart](https://ai.google.dev/gemini-api/docs?authuser=1#javascript)
- [Node.js Download](https://nodejs.org/en/download)
- [Postman for API Testing](https://www.postman.com/downloads/)

<strong> Orchestration (Optional): </strong>
- [LangChain Documentation](https://docs.langchain.com/#typescript)
- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction)

<strong> Tutorials/Other: </strong>
- [Vite Crash Course (YouTube)](https://www.youtube.com/watch?v=KCrXgy8qtjM)
- [Tailwind CSS Crash Course (YouTube)](https://www.youtube.com/watch?v=DenUCuq4G04)
- [Zustand Tutorial (YouTube)](https://www.youtube.com/watch?v=-Y8brhQKvtA)
- [Google Gemini API Tutorial (YouTube)](https://www.youtube.com/watch?v=Z8F6FvMrN4o)
- [Build a voice agent with LangChain](https://www.youtube.com/watch?v=kDPzdyX76cg)
- [AI SDK Overview](https://www.youtube.com/watch?v=TbjBzopteO4)
- [AI SDK in React Tutorial](https://www.youtube.com/watch?v=y4IMq43KvRw)

## Git Cheatsheet 📓

| Command                             | What it does                               |
| ----------------------------------- | ------------------------------------------ |
| git init                            | Initalize a new Git repo                   |
| git clone "rep-url"                 | Clone a repo from a URL                    |
|                                     |                                            |
| git status                          | Show changes status                        |
| git add "file"                      | Add changes to staging, use "." for all    |
| git commit -m "Descriptive Message" | Commit changes with a message              |
| git push                            | Upload local repo content to a remote repo |
| git log                             | View commit history                        |
|                                     |                                            |
| git branch                          | Lists all the branches                     |
| git branch "branch-name"            | Create a new branch                        |
| git checkout "branch-name"          | Switch to a branch                         |
| git checkout -b "branch-name"       | Combines the previous 2 commands           |
| git merge "branch-name"             | Merge changes from a branch                |
| git branch -d "branch-name"         | Delete a branch                            |
| git push origin "branch-name"       | Push to branch                             |
| git pull origin "branch-name"       | Pull updates from a specific branch        |
|                                     |                                            |
| git pull                            | Fetch and merge changes                    |
| git fetch                           | Fetch changes without merging              |
| git reset --hard HEAD               | Discard changes                            |
| git revert <commit-hash>            | Revert changes in a commit                 |


## Developers 🕵️‍♀️

- Urmi Popuri
- Ryan Edward
- Nandakishor Bejoy
- Swarna Sre Ganesh Shankar

**Project Manager:** Mohammad Mehrab  
**Industry Mentor:** Sean Hassan

<p align="center">
  <img src="https://64.media.tumblr.com/3c90da32d14e544b92b89cf6f54fca0a/9b28579adc13f171-36/s400x600/a9aa1025c3ab5b20ac8bdd5ab0bd266e46be3f9a.gif" alt="detective-noir-gif" />
</p>
