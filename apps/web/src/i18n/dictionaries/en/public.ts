/** public namespace: anonymous visitor pages (/u, /l, /a), the send form, answers and sharing. */
export const pub = {
  layout: { makeLink: "Make your own link" },
  profile: {
    defaultPrompt: "Send me anonymous messages!",
    roundClosed: "Round closed",
    round: "Anonymous round",
    answers: "Answers",
    emptyTitle: "No public answers yet",
    emptyBody: "When {name} replies publicly, the answers will show up here."
  },
  meta: {
    sendTitle: "Send {name} an anonymous message",
    roundDescription: "Say what you've been meaning to say to {name}.",
    userDescription: "Say what you've been meaning to say to {name}. Anonymous, kind and safe.",
    answerTitle: "{name} answered: “{question}”"
  },
  answer: {
    open: "Open & share",
    more: "Load more answers",
    shareTitle: "Share this answer",
    shareText: "{name} on EAR: “{question}”",
    askPrompt: "Want to ask {name} something?",
    sendButton: "Send an anonymous message",
    note: "Questions are anonymous. <link>How we keep it kind</link>."
  },
  send: {
    ideasLabel: "Need an idea?",
    ideasShuffle: "More ideas",
    ideas: "What's something you've always wanted to ask me?|What song reminds you of me?|Tell me something kind you never said out loud|What was your honest first impression of me?|What's a skill of mine you admire?|What should I do this weekend?|What's one thing you'd change about me? (be kind)|Ask me anything, I'll be honest",
    closedTitle: "This round has closed",
    closedBody: "{name} stopped collecting messages here. Thanks for stopping by!",
    startRound: "Start your own round",
    pausedTitle: "{name} has paused messages",
    pausedBody: "This link isn't accepting anything right now. Check back later.",
    missingTitle: "This link doesn't exist anymore",
    missingBody: "It may have been changed or removed.",
    sentTitle: "Sent anonymously",
    sentBody: "{name} will see your message without any sender details. If it breaks the rules, it may land in their Filtered folder.",
    sendAnother: "Send another",
    getLink: "Get your own link",
    label: "Anonymous message to {name}",
    placeholder: "Write something...",
    verifying: "Quick check that you're not a bot…",
    submit: "Send anonymously",
    kind: "Be kind. Harassment is filtered and reportable. {name} won't see who you are, and <link>here's exactly how that works</link>.",
    tooShort: "Write a little more",
    tooLong: "Max {max} characters"
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    rateLimitedWait: "You're sending a lot of messages. Take a breather and try again in about {wait}.",
    rateLimited: "You're sending a lot of messages. Take a breather and try again in a little while.",
    rejected: "That one didn't go through. Try rewording it kindly.",
    check: "Please check your message and try again.",
    seconds_one: "{count} second", seconds_two: "{count} seconds", seconds_other: "{count} seconds",
    minutes_one: "a minute", minutes_two: "{count} minutes", minutes_other: "{count} minutes"
  },
  share: {
    linkCopied: "Link copied",
    copyFailed: "Couldn't copy. Select the link and copy it manually.",
    share: "Share…",
    download: "Download card",
    shareTo: "Share to",
    newTab: " (opens in a new tab)",
    email: "Email"
  }
};
