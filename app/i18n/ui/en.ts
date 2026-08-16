import type { UiDictionary } from "../types";

export const ui: UiDictionary = {
  meta: {
    title: "Meridian Atlas — Interactive 3D TCM Channel Explorer",
    description:
      "Explore the 14 meridians and extraordinary vessels through an elegant, interactive 3D atlas. Click any acupoint to learn its functions, indications, and classical name.",
    ogTitle: "Meridian Atlas — Interactive 3D TCM Channel Explorer",
    ogDescription:
      "Learn the 14 meridians and 8 extraordinary vessels through immersive 3D visualization.",
    imageAlt: "A glowing meridian line tracing a human body silhouette, beside the Meridian Atlas wordmark",
  },
  brand: { tagline: "Understand the body the way the ancients did", home: "Meridian Atlas home" },
  nav: { explore: "Explore", systems: "Patterns", lessons: "Practice", library: "Library", notes: "Notes" },
  search: { placeholder: "Search meridians, acupoints…" },
  profile: { open: "Open learner profile" },
  language: { label: "Language", choose: "Choose a language" },
  library: {
    title: "Meridian library", open: "Open meridian library", close: "Close library", saved: "Saved meridians",
    viewAll: "View all meridians",
    quoteLine1: "Learning meridians", quoteLine2: "is reading the body's map.", quoteSign: "Keep exploring!",
  },
  tools: {
    label: "3D viewer tools", rotate: "Rotate", zoom: "Zoom", isolate: "Isolate",
    section: "Cross-section", layers: "Layers", compare: "Compare", reset: "Reset",
  },
  viewer: {
    title: "{organ} interactive explorer",
    canvas: "Interactive 3D meridian model. Drag to rotate, scroll to zoom, and click a dot to read about that acupoint.",
    tip: "Tip", tipDrag: "Drag to rotate", tipScroll: "Scroll to zoom", tipClick: "Click a dot to learn more",
    loading: "Loading {organ}", autoRotate: "Auto rotate",
    caption: "3D meridian · click a dot to explore",
    structures: "Acupoints on this meridian",
  },
  info: {
    kicker: "The {organ}", keyFacts: "Key facts", size: "Channel length", weight: "Acupoints",
    daily: "Peak time", location: "Route", bloodSupply: "Organs connected",
    function: "Primary function", medical: "Clinical significance",
    didYouKnow: "Did you know", viewLesson: "View practice", animate: "Animate",
    quiz: "Quiz", compare: "Compare",
    yinYang: "Yin/Yang", element: "Wu Xing", peakTime: "Peak hour", keyPoint: "Key point",
  },
  compare: {
    title: "Meridian comparison", comparing: "Comparing", reference: "Reference",
    primaryRole: "Primary function", scale: "Extent", vs: "vs.", close: "Close comparison",
  },
  cards: {
    resources: "{organ} learning resources",
    microscopic: "Organ connection", compareOrgans: "Compare meridians", functionAnimation: "Channel animation",
    clinicalNotes: "Clinical notes", whereItWorks: "Where it travels", commonConditions: "Common indications",
    exploreTissue: "Explore organ", openComparison: "Open comparison", playAnimation: "Play animation",
    seeAll: "See all", seeSystem: "See the channel",
    playAria: "Play the {organ} animation", systemAria: "See where the {organ} travels in the body",
  },
  quiz: {
    start: "Start the acupoint labelling quiz", find: "Find the", progress: "{current} of {total}",
    correct: "Correct", wrong: "Not quite", reveal: "That is the {label}", answer: "{label} is marked in green",
    done: "Quiz complete", score: "{score} of {total} correct", retry: "Try again",
    exit: "Exit quiz", hint: "Click the matching dot on the model",
  },
  modal: {
    guided: "Guided discovery", close: "Close", continueExploring: "Continue exploring",
    quizTitle: "{organ} quick quiz", motionTitle: "{organ} in motion",
    bodyTitle: "{organ} in the body", insideTitle: "Organ connection of {organ}",
    quizPrompt: "Which statement best describes the {organ}?",
    quizA: "It plays a specific role in regulating the body's Qi",
    quizB: "It operates completely independently",
    quizC: "It is only active at night",
    lessonBody:
      "Follow the highlighted acupoints, rotate the model, and connect the channel route with organ function. This study session builds a durable mental model of meridian diagnosis.",
    systemIntro: "{location}. Trace how the {organ} connects to the Zang-Fu organs.",
    system: "Channel", primaryRole: "Primary function", bloodSupply: "Organs connected",
  },
};
