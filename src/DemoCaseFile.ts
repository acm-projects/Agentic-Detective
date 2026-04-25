// ============================================================
//  DEMO CASE FILE — "The Night of the Build"
//  Drop-in replacement for generateCaseFile() during demos.
//  Shaped exactly like a MongoDB game document so feedCaseFile()
//  can consume it without any modification.
// ============================================================

export const DEMO_GAME_DOC = {
  schemaVersion: 1,
  sessionId: "DEMO-001",
  caseId: "DEMO-001",
  userId: "demo-user",
  status: "in_progress",
  createdAt: "2025-04-01T20:00:00.000Z",
  updatedAt: "2025-04-01T20:00:00.000Z",
  lastAutosavedAt: "2025-04-01T20:00:00.000Z",
  revision: 1,
  isStarred: false,

  seed: {
    freeText: "A murder at a university hackathon presentation night",
    difficulty: 1,
    duration: 15,
    intensity: 4,
    userId: "demo-user",
    isSignedIn: false,
  },

  game: {
    phase: "briefing",
    elapsedSeconds: 0,
    activeSuspectName: null,
    totalConversationCount: 0,
  },

  caseData: {
    storyline: {
      trueSequenceOfEvents:
        "During ACM Projects’ Presentation Night, PM Mohammad Mehrab was found unconscious after being struck from behind. Driven by a competitive grudge, co-Director Adarsh Goura committed the assault using a heavy History textbook belonging to VP Mercedes. Adarsh borrowed the book from co-Director Suhani Rana under the guise of killing a bug, used it to attack Mohammad in a hallway, and returned it to their prep room unnoticed. Despite his feigned shock, forensic analysis later uncovered Adarsh’s large foot prints, placing him at the scene of the crime.",
      murdererName: "Adarsh Goura",
      murderWeapon: "History textbook",
      murderLocation: "Hallway outside ECSW 1.315",
      murderTime: "7:42 PM",
      hiddenBackstory:
        "As co-Director of ACM Projects, Adarsh had a hand in selecting which teams competed and which PMs got resources. He had quietly underfunded Mohammad's team mid-semester hoping they'd fall behind — but the Agentic Detective team pushed through anyway and built something genuinely impressive. When it became clear Mohammad was going to win, Adarsh realized his sabotage had failed. Winning Presentation Night as a PM would elevate Mohammad's standing in ACM above Adarsh's own. He couldn't allow that.",
      contradictions: [
        {
          suspectName: "Adarsh Goura",
          theirClaim: "I was in ECSW 1.315 the whole evening getting things ready. I barely left the room.",
          actualTruth:
            "Adarsh was absent from ECSW 1.315 for over fifteen minutes starting at approximately 7:38 PM — long enough to find Mohammad in the hallway, commit the murder, wipe the book, and return.",
          exposedByClueId: "clue_6",
          exposedByDialogue:
            "Adarsh insists he never really left the room, but both Suhani and Elijah recall him being gone for an unusually long time before returning with the book.",
        },
        {
          suspectName: "Suhani Rana",
          theirClaim: "I had the book the whole time. I only lent it to Adarsh for like two minutes.",
          actualTruth:
            "Suhani lent the book to Adarsh for at least fifteen minutes — she lost track of time during setup and is significantly underestimating how long he was gone.",
          exposedByClueId: "clue_2",
          exposedByDialogue: null,
        },
      ],
      difficultyNotes:
        "Adarsh is quickly identifiable. His fingerprints on the book, his direct motive as co-Director threatened by a PM's success, and Elijah's timeline statement all converge on him. Suhani looks suspicious briefly due to the rental log but is cleared easily.",
    },

    suspects: [
      // ── Suspect 0: Suhani Rana (innocent, partially honest) ──
      {
        name: "Suhani Rana",
        age: 20,
        gender: "female",
        occupation: "Co-Director of ACM Projects",
        relationshipToVictim: "Direct supervisor — Mohammad reported to her and Adarsh as a PM in ACM Projects",
        personality:
          "Warm and slightly anxious. Talks fast when nervous. Genuinely wants to help but keeps hedging her answers because she feels guilty about lending the book. She mentions Adarsh stepped out to use her book to kill a bug.",
        physicalDescription:
          "Long black hair with curtain bangs framing her face. Medium build, usually in a hoodie. Tends to fidget with her sleeves.",
        avatarId: "avatar_01",
        trueAlibi:
          "Was in ECSW 1.315 the entire evening doing pre-event setup alongside Elijah and Mercedes. She lent the History textbook to Adarsh without a second thought and didn't realize how long he was actually gone.",
        claimedAlibi:
          "Says she was in the room all evening working on final logistics for Presentation Night. Admits she lent Adarsh the book but insists it was only for a minute or two.",
        trueMotive: null,
        isGuilty: false,
        honestyLevel: "partially_honest",
        secretTheyreHiding:
          "She feels deeply responsible for handing Adarsh the weapon, even though she had no idea what he intended. She's been unconsciously downplaying how long he had the book because the truth makes her feel complicit.",
        lyingTells: null,
        knowledgeOfOtherSuspects:
          "Knows Adarsh had been visibly stressed about Mohammad's team pulling ahead all semester. Shares the History class with Mercedes and borrowed the book from her earlier that day. Considers Elijah a steady presence — the kind of president who doesn't panic.",
        conversationsNeededToBreak: 3,
        portraitFeatures: {
          backHairFrameIndex: 2,
          frontHairFrameIndex: 6,
          eyesFrameIndex: 0,
          noseFrameIndex: 1,
          mouthFrameIndex: 2,
          hairColor: "#0D0D0D",
          skinColor: "#C8906A",
          eyeColor: "#3B2314",
          shirtColor: "#5B4FCF",
          lipColor: "#C47060",
        },
      },

      // ── Suspect 1: Adarsh Goura (GUILTY, deceptive) ──
      {
        name: "Adarsh Goura",
        age: 21,
        gender: "male",
        occupation: "Co-Director of ACM Projects",
        relationshipToVictim: "Direct supervisor — Mohammad was a PM who reported to Adarsh and Suhani",
        personality:
          "Laid-back and straightforward. Answers questions directly. Doesn't embellish. Will admit if he didn't notice something.",
        physicalDescription:
          "Medium build with hair styled up and slightly gelled. Sharp eyes. Usually in a fitted t-shirt. Has a habit of crossing his arms when standing.",
        avatarId: "avatar_03",
        trueAlibi:
          "Was absent from ECSW 1.315 for roughly fifteen minutes starting at 7:38 PM. Used that window to find Mohammad alone in the hallway and strike him with the textbook, then wiped the book and returned.",
        claimedAlibi:
          "Claims he was in ECSW 1.315 all evening helping coordinate the event. Says he borrowed the book from Suhani as a joke — to 'kill a bug' — and returned it almost immediately.",
        trueMotive:
          "As co-Director of ACM Projects, Adarsh had tried to quietly underfund Mohammad's team mid-semester to stall their progress. When the Agentic Detective team pushed through anyway and became the clear favorite to win Presentation Night, Adarsh realized his sabotage had failed. He couldn't let a PM he'd tried to sideline win the biggest night of the semester.",
        isGuilty: true,
        honestyLevel: "truthball",
        secretTheyreHiding:
          "He killed Mohammad with the textbook and wiped it before returning it to Suhani. He had also been quietly withholding resources from Mohammad's team earlier in the semester — a fact he's desperate to keep buried.",
        lyingTells:
          "When lying, Adarsh becomes unusually specific about trivial details — he'll describe exactly which Notion page he was editing, the exact wording of a Slack message he sent — as though burying the lie in specifics makes it feel real.",
        knowledgeOfOtherSuspects:
          "Knows Suhani borrowed the book from Mercedes. Knows Elijah was in the room but is betting he didn't clock exactly how long he was gone. Trusts that Mercedes wasn't even there that evening and can't contradict him.",
        conversationsNeededToBreak: 5,
        portraitFeatures: {
          backHairFrameIndex: 4,
          frontHairFrameIndex: 4,
          eyesFrameIndex: 3,
          noseFrameIndex: 1,
          mouthFrameIndex: 4,
          hairColor: "#1A0A00",
          skinColor: "#876045",
          eyeColor: "#2E1A0E",
          shirtColor: "#2D3748",
          lipColor: "#9A6050",
        },
      },

      // ── Suspect 2: Elijah Walker (innocent, honest) ──
      {
        name: "Elijah Walker",
        age: 20,
        gender: "male",
        occupation: "President of ACM",
        relationshipToVictim: "Club president — Mohammad was a PM in ACM Projects, a division Elijah oversees",
        personality:
          "Laid-back and straightforward. Answers questions directly. Doesn't embellish. Will admit if he didn't notice something.",
        physicalDescription:
          "Short curly hair, tall frame, often in joggers and a plain t-shirt. Relaxed posture. Has a large shoe size — size 13.",
        avatarId: "avatar_02",
        trueAlibi:
          "Was in ECSW 1.315 the entire evening handling logistics for Presentation Night alongside Suhani and Mercedes. Did notice Adarsh was gone for longer than expected but assumed he'd stepped out to handle something.",
        claimedAlibi:
          "Was in the room all evening. Can confirm Suhani was there too. Remembers Adarsh leaving and coming back — though he's fuzzy on exactly how long he was out.",
        trueMotive: null,
        isGuilty: false,
        honestyLevel: "honest",
        secretTheyreHiding: null,
        lyingTells: null,
        knowledgeOfOtherSuspects:
          "Noticed Adarsh had been tense around Mohammad all semester — unusual for someone who's normally so easygoing. Knows Mohammad's Agentic Detective team had been getting strong feedback from advisors. Respects Mercedes and trusts her judgment as VP.",
        conversationsNeededToBreak: 2,
        portraitFeatures: {
          backHairFrameIndex: 9,
          frontHairFrameIndex: 9,
          eyesFrameIndex: 5,
          noseFrameIndex: 2,
          mouthFrameIndex: 1,
          hairColor: "#4A2E1A",
          skinColor: "#F3D9C0",
          eyeColor: "#5C3D1E",
          shirtColor: "#744210",
          lipColor: "#C48060",
        },
      },

      // ── Suspect 3: Mercedes Xiong (innocent, partially honest) ──
      {
        name: "Mercedes Xiong",
        age: 20,
        gender: "female",
        occupation: "Vice President of ACM",
        relationshipToVictim: "Club VP — Mohammad was a PM in ACM Projects, a division under ACM leadership",
        personality:
          "Measured and a little guarded. Doesn't volunteer information she wasn't asked for. Not unfriendly — just selective.",
        physicalDescription:
          "Black hair in a ponytail with curtain bangs. Small frame, usually in a cardigan. Tends to speak in short, precise sentences.",
        avatarId: "avatar_04",
        trueAlibi:
          "Was not present in ECSW 1.315 the night of the murder — she had lent Suhani the History textbook earlier that afternoon after their shared class and left campus by 6:30 PM for a family dinner.",
        claimedAlibi:
          "Says she wasn't there that evening. She lent Suhani the book after class and went home.",
        trueMotive: null,
        isGuilty: false,
        honestyLevel: "partially_honest",
        secretTheyreHiding:
          "The book wasn't hers to lend — it's a library rental she checked out weeks ago and hasn't returned. She's quietly hoping no one asks too many questions about the book's origin.",
        lyingTells: null,
        knowledgeOfOtherSuspects:
          "Shares a History class with Suhani and has worked closely with both Adarsh and Elijah in ACM leadership. Had noticed Adarsh was unusually withdrawn in recent leadership meetings — shorter replies, less eye contact — but hadn't thought much of it until now.",
        conversationsNeededToBreak: 2,
        portraitFeatures: {
          backHairFrameIndex: 7,
          frontHairFrameIndex: 6,
          eyesFrameIndex: 5,
          noseFrameIndex: 4,
          mouthFrameIndex: 1,
          hairColor: "#0A0A0A",
          skinColor: "#E8C9A0",
          eyeColor: "#2C1A10",
          shirtColor: "#9B7EBD",
          lipColor: "#C07870",
        },
      },
    ],

    characterProfiles: [
      {
        name: "Suhani Rana",
        age: 20,
        gender: "female",
        occupation: "Co-Director of ACM Projects",
        relationshipToVictim: "Direct supervisor — Mohammad reported to her and Adarsh as a PM in ACM Projects",
        personalityBlurb:
          "Warm and slightly anxious. Talks fast when nervous. Genuinely wants to help but keeps hedging her answers because she feels guilty about lending the book.",
        claimedAlibi:
          "Says she was in the room all evening working on final logistics. Admits she lent Adarsh the book but insists it was only for a minute or two.",
        physicalDescription:
          "Long black hair with curtain bangs framing her face. Medium build, usually in a hoodie.",
        avatarId: "avatar_01",
        suspicionLevel: "medium",
        portraitFeatures: {
          backHairFrameIndex: 2,
          frontHairFrameIndex: 2,
          eyesFrameIndex: 0,
          noseFrameIndex: 1,
          mouthFrameIndex: 2,
          hairColor: "#0D0D0D",
          skinColor: "#C8906A",
          eyeColor: "#3B2314",
          shirtColor: "#4e7022",
          lipColor: "#C47060",
        },
      },
      {
        name: "Adarsh Goura",
        age: 21,
        gender: "male",
        occupation: "Co-Director of ACM Projects",
        relationshipToVictim: "Direct supervisor — Mohammad was a PM who reported to Adarsh and Suhani",
        personalityBlurb:
          "Outwardly chill and self-deprecating, but brittle under pressure.",
        claimedAlibi:
          "Claims he was in ECSW 1.315 all evening. Says he borrowed the book just to squash a bug — a joke — and returned it almost immediately.",
        physicalDescription:
          "Medium build with hair styled up and slightly gelled. Sharp eyes.",
        avatarId: "avatar_03",
        suspicionLevel: "high",
        portraitFeatures: {
          backHairFrameIndex: 4,
          frontHairFrameIndex: 4,
          eyesFrameIndex: 3,
          noseFrameIndex: 1,
          mouthFrameIndex: 4,
          hairColor: "#1A0A00",
          skinColor: "#B57A50",
          eyeColor: "#2E1A0E",
          shirtColor: "#234072",
          lipColor: "#9A6050",
        },
      },
      {
        name: "Elijah Walker",
        age: 20,
        gender: "male",
        occupation: "President of ACM",
        relationshipToVictim: "Club president — Mohammad was a PM in ACM Projects, a division Elijah oversees",
        personalityBlurb:
          "Laid-back and straightforward. Answers questions directly and doesn't embellish.",
        claimedAlibi:
          "Was in the room the whole time. Remembers Adarsh leaving and coming back but is fuzzy on how long.",
        physicalDescription:
          "Short curly hair, tall frame, often in joggers and a plain t-shirt.",
        avatarId: "avatar_02",
        suspicionLevel: "low",
        portraitFeatures: {
          backHairFrameIndex: 9,
          frontHairFrameIndex: 9,
          eyesFrameIndex: 5,
          noseFrameIndex: 2,
          mouthFrameIndex: 1,
          hairColor: "#4A2E1A",
          skinColor: "#F3D9C0",
          eyeColor: "#5C3D1E",
          shirtColor: "#92380f",
          lipColor: "#C48060",
        },
      },
      {
        name: "Mercedes Xiong",
        age: 20,
        gender: "female",
        occupation: "Vice President of ACM",
        relationshipToVictim: "Club VP — Mohammad was a PM in ACM Projects, a division under ACM leadership",
        personalityBlurb:
          "Measured and a little guarded. Doesn't volunteer information she wasn't asked for.",
        claimedAlibi:
          "Says she wasn't even there that night — she lent the book to Suhani in the afternoon before build night.",
        physicalDescription:
          "Black hair in a ponytail with curtain bangs. Small frame, usually in a cardigan.",
        avatarId: "avatar_04",
        suspicionLevel: "low",
        portraitFeatures: {
          backHairFrameIndex: 7,
          frontHairFrameIndex: 6,
          eyesFrameIndex: 5,
          noseFrameIndex: 4,
          mouthFrameIndex: 1,
          hairColor: "#0A0A0A",
          skinColor: "#E8C9A0",
          eyeColor: "#2C1A10",
          shirtColor: "#8f6eb4",
          lipColor: "#C07870",
        },
      },
    ],

    caseReport: {
      caseTitle: "The Night of the Build",
      caseId: "DEMO-001",
      setting:
        "ECSW 1.315, a student collaboration room at the University of Texas at Dallas, on the night of Projects Presentation Night.",
      date: "April 1st, 2025 — 7:42 PM",
      victim: {
        name: "Mohammad Mehrab",
        age: 21,
        occupation: "Project Manager in ACM Projects — led the 'Agentic Detective' team",
        background:
          "A driven and well-liked junior who had earned the PM role in ACM Projects after a strong application cycle. He led the 'Agentic Detective' team through a full semester build and had been receiving glowing feedback from advisors. His team was widely considered the frontrunner to win Presentation Night — a distinction that put him in the crosshairs of someone with more to lose.",
        causeOfDeath: "Blunt force trauma to the back of the head with a textbook.",
        bodyFoundAt:
          "The hallway just outside ECSW 1.315, discovered by a passing student at approximately 8:05 PM.",
      },
      officialBriefing:
        "Mohammad Mehrab, Project Manager of the 'Agentic Detective' team in ACM Projects, was found unconscious in the hallway outside ECSW 1.315 minutes before ACM Projects Presentation Night was set to begin. He was transported to the hospital but did not survive. The blow came from behind and was delivered by a History text book. The four ACM leadership members present in the building at the time — Suhani Rana and Adarsh Goura (co-Directors of ACM Projects), Elijah Walker (President of ACM), and Mercedes Xiong (VP of ACM) — are the only individuals with access to that hallway during the relevant window. You have been brought in to find out who did it.",
      knownFacts: [
        "Mohammad Mehrab was the PM of the 'Agentic Detective' team, the frontrunner to win ACM Projects Presentation Night.",
        "He was struck from behind with a History textbook between 7:38 and 7:50 PM in the hallway outside ECSW 1.315.",
        "Four ACM leadership members were in or near ECSW 1.315 during that window: Suhani Rana, Adarsh Goura, Elijah Walker, and Mercedes Xiong.",
        "No external parties had access to the hallway during the relevant window.",
        "The History textbook was owned by Mercedes",
      ],
      openQuestions: [
        "Which ACM leadership member was absent from ECSW 1.315 during the estimated time of death?",
        "Did anyone in ACM leadership have a reason to prevent Mohammad's team from winning?",
        "Why does the book appear deliberately wiped if it was just borrowed casually?",
        "Who had access to the History textbook in the hour before the murder?",
      ],
    },

    initialClues: [
      {
        id: "clue_1",
        name: "The Large Footprint",
        description:
          "A single large shoe impression was found in a dusty patch of floor near Mohammad's body. Campus security estimated it at a men's size 12–13. Of the four suspects, only Elijah Walker wears a size 13 — but Elijah was corroborated inside the room at that time. Adarsh wears a size 12.",
        location: "Hallway floor outside ECSW 1.315, approximately two meters from the body",
        couldImplicateSuspects: ["Elijah Walker", "Adarsh Goura"],
        severity: "medium",
        isDecisive: false,
        discovered: false,
        clueLost: false,
      },
      {
        id: "clue_2",
        name: "The Large Footprint",
        description:
          "A single large shoe impression was found in a dusty patch of floor near Mohammad's body. Campus security estimated it at a men's size 12–13. Of the four suspects, only Elijah Walker wears a size 13 — but Elijah was corroborated inside the room at that time. Adarsh wears a size 12.",
        location: "Hallway floor outside ECSW 1.315, approximately two meters from the body",
        couldImplicateSuspects: ["Elijah Walker", "Adarsh Goura"],
        severity: "medium",
        isDecisive: false,
        discovered: false,
        clueLost: false,
      },
      {
        id: "clue_3",
        name: "The Large Footprint",
        description:
          "A single large shoe impression was found in a dusty patch of floor near Mohammad's body. Campus security estimated it at a men's size 12–13. Of the four suspects, only Elijah Walker wears a size 13 — but Elijah was corroborated inside the room at that time. Adarsh wears a size 12.",
        location: "Hallway floor outside ECSW 1.315, approximately two meters from the body",
        couldImplicateSuspects: ["Elijah Walker", "Adarsh Goura"],
        severity: "medium",
        isDecisive: false,
        discovered: false,
        clueLost: false,
      },
      {
        id: "clue_4",
        name: "The Large Footprint",
        description:
          "A single large shoe impression was found in a dusty patch of floor near Mohammad's body. Campus security estimated it at a men's size 12–13. Of the four suspects, only Elijah Walker wears a size 13 — but Elijah was corroborated inside the room at that time. Adarsh wears a size 12.",
        location: "Hallway floor outside ECSW 1.315, approximately two meters from the body",
        couldImplicateSuspects: ["Elijah Walker", "Adarsh Goura"],
        severity: "medium",
        isDecisive: false,
        discovered: false,
        clueLost: false,
      },
      {
        id: "clue_5",
        name: "The Large Footprint",
        description:
          "A single large shoe impression was found in a dusty patch of floor near Mohammad's body. Campus security estimated it at a men's size 12–13. Of the four suspects, only Elijah Walker wears a size 13 — but Elijah was corroborated inside the room at that time. Adarsh wears a size 12.",
        location: "Hallway floor outside ECSW 1.315, approximately two meters from the body",
        couldImplicateSuspects: ["Elijah Walker", "Adarsh Goura"],
        severity: "medium",
        isDecisive: false,
        discovered: false,
        clueLost: false,
      },
      {
        id: "clue_6",
        name: "The Large Footprint",
        description:
          "A single large shoe impression was found in a dusty patch of floor near Mohammad's body. Campus security estimated it at a men's size 12–13. Of the four suspects, only Elijah Walker wears a size 13 — but Elijah was corroborated inside the room at that time. Adarsh wears a size 12.",
        location: "Hallway floor outside ECSW 1.315, approximately two meters from the body",
        couldImplicateSuspects: ["Elijah Walker", "Adarsh Goura"],
        severity: "medium",
        isDecisive: false,
        discovered: false,
        clueLost: false,
      },
    ],
  },

  interrogation: {
    suspectSessions: [
      {
        suspectName: "Suhani Rana",
        conversationCount: 0,
        currentStress: 0,
        suspicionLevel: null,
        firstInterrogatedAt: null,
        lastInterrogatedAt: null,
        messages: [],
      },
      {
        suspectName: "Adarsh Goura",
        conversationCount: 0,
        currentStress: 0,
        suspicionLevel: null,
        firstInterrogatedAt: null,
        lastInterrogatedAt: null,
        messages: [],
      },
      {
        suspectName: "Elijah Walker",
        conversationCount: 0,
        currentStress: 0,
        suspicionLevel: null,
        firstInterrogatedAt: null,
        lastInterrogatedAt: null,
        messages: [],
      },
      {
        suspectName: "Mercedes Xiong",
        conversationCount: 0,
        currentStress: 0,
        suspicionLevel: null,
        firstInterrogatedAt: null,
        lastInterrogatedAt: null,
        messages: [],
      },
    ],
  },

  clueState: {
    clue_1: { discovered: false, clueLost: false },
    clue_2: { discovered: false, clueLost: false },
    clue_3: { discovered: false, clueLost: false },
    clue_4: { discovered: false, clueLost: false },
    clue_5: { discovered: false, clueLost: false },
    clue_6: { discovered: false, clueLost: false },
  },

  schedulerState: {
    timerPaused: false,
    nextFireAt: null,
    lastFiredAt: null,
  },

  outcome: {
    accusedName: null,
    isCorrect: null,
    trueKiller: null,
    explanation: null,
    decidedAt: null,
    gameplayRating: null,
    featured: false,
    feedbackAt: null,
  },
};