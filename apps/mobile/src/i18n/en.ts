/**
 * English dictionary (source of truth for the key set).
 * - Leaves are strings with `{param}` placeholders.
 * - An object with an `other` key is a plural group; the category is picked with Intl.PluralRules from `params.count`.
 * he.ts must satisfy the same shape (see `Dict`), so a missing Hebrew key fails typecheck.
 */
export const en = {
  common: {
    cancel: "Cancel",
    close: "Close",
    back: "Back",
    retry: "Retry",
    tryAgain: "Try again",
    loading: "Loading",
    save: "Save",
    delete: "Delete",
    copy: "Copy",
    share: "Share",
    edit: "Edit",
    gotIt: "Got it",
    anonymous: "Anonymous",
    you: "You",
    optional: "optional",
    charsLeft: "{count} characters left"
  },
  brand: {
    name: "EAR",
    fullName: "Eliya's Anonymous Replies",
    tagline: "Say what you really think.",
    dedication: "* For Liron 💛",
    dedicationSr: "Dedicated to Liron",
    wordmarkLabel: "EAR, Eliya's Anonymous Replies. Dedicated to Liron"
  },
  language: {
    label: "Language",
    hint: "Changes the language of the whole app",
    group: "Choose language",
    current: "Current language: {name}",
    restartTitle: "Restart to finish switching",
    restartBody: "{name} reads in a different direction, so EAR needs to restart to flip the layout. Your choice is already saved.",
    restartBodyManual: "{name} reads in a different direction. Your choice is saved. Close EAR completely and open it again to flip the layout.",
    restartNow: "Restart now",
    later: "Later"
  },
  welcome: {
    intro: "Share your link, get anonymous messages, and answer the ones worth answering. Nothing's traced back to the sender — but be kind.",
    createLink: "Create my link",
    haveAccount: "I already have an account",
    logoHidden: "EAR logo"
  },
  auth: {
    email: "Email",
    password: "Password",
    username: "Username",
    back: "Back",
    login: {
      title: "Welcome back",
      subtitle: "Sign in to see what people left for you.",
      submit: "Sign in",
      enterPassword: "Enter your password",
      forgot: "Forgot password?",
      forgotLabel: "Forgot password",
      newHere: "New here?",
      create: "Create an account"
    },
    signup: {
      title: "Claim your link",
      subtitle: "Pick a username — it's what people type to reach you.",
      yourLink: "Your link: {url}",
      checking: "Checking…",
      available: "Available",
      checkFailed: "Couldn't check availability",
      taken: "That username is taken",
      conflict: "That email or username is already in use.",
      submit: "Create account",
      haveAccount: "Have an account?",
      signIn: "Sign in",
      signInInstead: "Sign in instead",
      rulesLabel: "Password requirements",
      ruleMet: "{rule}: met",
      ruleNotMet: "{rule}: not met"
    },
    forgot: {
      title: "Reset your password",
      intro: "Enter the email you signed up with and we'll send you a reset link.",
      submit: "Send reset link",
      sentTitle: "Check your inbox",
      sentBody: "If an account exists for {email}, we've sent a link to reset the password. Open it on this device or on the web.",
      backToLogin: "Back to sign in"
    }
  },
  password: {
    rule: {
      len: "At least {min} characters",
      mix: "A letter and a number",
      max: "At most {max} characters"
    }
  },
  tabs: {
    inbox: "Inbox",
    share: "Share",
    activity: "Activity",
    me: "Me",
    unreadLabel: { one: "{label}, {count} unread", other: "{label}, {count} unread" }
  },
  inbox: {
    title: "Inbox",
    filterLabel: "Filter by round",
    allMessages: "All messages",
    segments: {
      inbox: "Inbox",
      filtered: "Filtered",
      archived: "Archived"
    },
    empty: {
      inboxTitle: "Nothing here yet",
      inboxBody: "Share your link and the first anonymous message will land here.",
      filteredTitle: "Nothing filtered",
      filteredBody: "Messages our safety filter holds back show up here so you can look when you're ready.",
      archivedTitle: "Nothing archived",
      archivedBody: "Archived messages are kept here, out of sight.",
      shareMyLink: "Share my link"
    }
  },
  messageCard: {
    anonymous: "Anonymous",
    newAnonymous: "New · Anonymous",
    held: "Held: {category}",
    answeredPublicly: "Answered publicly",
    repliedPrivately: "Replied privately",
    summary: "{unread}Anonymous message: {body}. {time}.{replied}",
    unreadPrefix: "Unread. ",
    youReplied: " You replied.",
    hint: "Opens actions. Swipe sideways for reply and delete.",
    reply: "Reply",
    delete: "Delete"
  },
  category: {
    harassment: "harassment",
    threat: "threat",
    hate: "hate",
    sexual: "sexual content",
    self_harm: "self-harm",
    personal_info: "personal info",
    dangerous: "dangerous content",
    spam: "spam",
    hidden_word: "hidden word",
    other: "other"
  },
  message: {
    title: "Message",
    close: "Close",
    notFound: "Message not found",
    anonymousAgo: "Anonymous · {time}",
    yourPublicAnswer: "Your public answer",
    yourPrivateReply: "Your private reply",
    reply: "Reply",
    editReply: "Edit reply",
    shareAnswer: "Share answer",
    moreActions: "More actions"
  },
  actions: {
    sheetTitle: "Message",
    reply: "Reply",
    editReply: "Edit reply",
    shareAnswer: "Share answer",
    archive: "Archive",
    moveToInbox: "Move to inbox",
    report: "Report",
    blockSender: "Block sender",
    delete: "Delete",
    replyTitle: "Reply",
    yourReply: "Your reply",
    replyPlaceholder: "Say something back…",
    publishToggle: "Publish as a public answer",
    publicAnswer: "Public answer",
    privateReply: "Private reply",
    publicHint: "Shown on your profile with a share link.",
    privateHint: "Only saved to this message.",
    publishAnswer: "Publish answer",
    saveReply: "Save reply",
    shareTitle: "Share your answer",
    shareImage: "Share image",
    shareLink: "Share link",
    copyLink: "Copy link",
    privateNoLink: "This reply is private, so there's no public link — only the image.",
    reportTitle: "Report message",
    reportIntro: "Tell us what's wrong. Reports are reviewed by our team; the sender is never told.",
    sendReport: "Send report",
    deleteTitle: "Delete this message?",
    deleteBody: "It's removed from your inbox for good. This can't be undone.",
    blockTitle: "Block this sender?",
    blockBody: "EAR blocks the anonymous source, not a person — it can't identify anyone, and someone on a different network could still write to you. The message is archived.",
    block: "Block",
    verifyToPublish: "Verify your email to publish answers. You can still reply privately.",
    answerPublished: "Answer published",
    replySaved: "Reply saved",
    archived: "Archived",
    movedToInbox: "Moved to inbox",
    deleted: "Message deleted",
    blocked: "Source blocked. They can't reach you from this network.",
    reported: "Report sent. Thank you.",
    sharingUnavailable: "Sharing isn't available on this device.",
    linkCopied: "Link copied",
    shareDialogTitle: "Share your answer",
    reasons: {
      harassment: "Harassment or bullying",
      threat: "Threat",
      hate: "Hate",
      sexual: "Sexual content",
      self_harm: "Self-harm",
      personal_info: "Personal information",
      spam: "Spam",
      other: "Something else"
    }
  },
  shareCard: {
    askedLabel: "ANONYMOUS ASKED",
    handleLine: "@{handle} · EAR"
  },
  share: {
    title: "Share",
    intro: "Start an anonymous round, send its link, and people can write to you without signing up.",
    startRound: "Start a new round",
    yourRounds: "Your rounds",
    noRounds: "No rounds yet. Each round gets its own question, link and inbox view.",
    alwaysOn: "Always-on link",
    noLinkTitle: "No link yet",
    noLinkBody: "Pull to refresh.",
    myLink: "My link",
    closed: "Closed",
    paused: "Paused",
    live: "Live",
    closedAt: "Closed {date}",
    closesAt: "Closes {date}",
    views: { one: "{count} view", other: "{count} views" },
    messages: { one: "{count} message", other: "{count} messages" },
    stats: "{views} · {messages}",
    sharePrompt: "Share",
    copy: "Copy",
    seeResponses: "See responses",
    reopen: "Reopen for 24h",
    pauseThis: "Pause this link",
    pauseLabel: "Pause {name}",
    myLinkLower: "my link",
    deleteLink: "Delete link",
    downloadTitle: "Download the app",
    downloadBody: "Send friends the install link. It opens the right steps for iPhone, Android or desktop.",
    sendLink: "Send link",
    newRoundTitle: "New anonymous round",
    roundName: "Round name",
    roundNamePlaceholder: "e.g. Friday dinner ideas",
    yourQuestion: "Your question (optional)",
    questionPlaceholder: "What should I cook on Friday? 🍳",
    closeAfter: "Close it automatically after",
    durationLabel: "Round duration",
    durations: { none: "No end", h1: "1 hour", h24: "24 hours", d3: "3 days", d7: "7 days" },
    createAndShare: "Create round & share",
    deleteTitle: "Delete this link?",
    deleteBody: "\"{label}\" will stop working. Messages already received stay in your inbox.",
    linkCopied: "Link copied",
    installCopied: "Install link copied",
    linkPaused: "Link paused",
    linkLive: "Link is live",
    roundStarted: "Round started — share its link!",
    linkDeleted: "Link deleted",
    roundReopened: "Round reopened",
    shareMessagePrompt: "{prompt} — {url}",
    shareMessageDefault: "Send me an anonymous message: {url}",
    inviteMessage: "Get EAR — anonymous questions & replies: {url}"
  },
  activity: {
    title: "Activity",
    markAllRead: "Mark all read",
    emptyTitle: "All quiet",
    emptyBody: "New messages and safety updates will show up here.",
    loadMore: "Load more",
    unreadPrefix: "Unread. ",
    opensMessage: "Opens the message",
    marksRead: "Marks as read"
  },
  me: {
    title: "Me",
    avatarOf: "{name} avatar",
    editProfile: "Edit profile",
    addPhoto: "Add photo",
    changePhoto: "Change photo",
    removePhoto: "Remove photo",
    emailNotVerified: "Email not verified",
    verifyBody: "Verify {email} to publish public answers.",
    resend: "Resend verification email",
    verificationSent: "Verification email sent",
    username: "Username",
    safety: "Safety & privacy",
    notifications: "Notifications",
    sessions: "Sessions",
    changePassword: "Change password",
    invite: "Download the app — invite friends",
    signedInAs: "Signed in as {email}",
    logOut: "Log out",
    logoutTitle: "Log out?",
    logoutBody: "You'll stop getting push notifications on this device until you sign in again.",
    deleteAccount: "Delete my account",
    deleteTitle: "Delete account?",
    deleteBody: "This permanently deletes your account, your link, every message you received and your replies. This cannot be undone.",
    deletePassword: "Confirm with your password",
    deleteConfirm: "Delete forever",
    accountDeleted: "Your account was deleted",
    editTitle: "Edit profile",
    displayName: "Display name",
    bio: "Bio",
    prompt: "Prompt shown above the message box",
    promptPlaceholder: "Ask me anything…",
    renameTitle: "Change username",
    renameBody: "Your old link stops working and you can change this once every 7 days.",
    renameSubmit: "Change username",
    profileSaved: "Profile saved",
    usernameChanged: "Username changed. Your old link no longer works.",
    photoAccess: "Allow photo access in Settings to choose a picture.",
    photoTooBig: "That image is over 2 MB. Pick a smaller one.",
    photoUpdated: "Photo updated",
    photoRemoved: "Photo removed",
    inviteMessage: "Get EAR — anonymous questions & replies: {url}"
  },
  settings: {
    safety: {
      title: "Safety & privacy",
      accepting: "Accepting messages",
      acceptingDesc: "Turn off to stop all new anonymous messages.",
      enhanced: "Enhanced moderation",
      enhancedDesc: "A stricter filter. More borderline messages go to Filtered.",
      showPublic: "Show answers publicly",
      showPublicDesc: "Public answers appear on your profile page.",
      pause: "Pause my link",
      pauseDesc: "Visitors see a paused page and can't send anything.",
      hiddenWords: "Hidden words",
      hiddenWordsDesc: "Messages containing these words go straight to Filtered. Up to {max}.",
      addWord: "Add a word",
      hideWord: "Hide word",
      removeWord: "Remove {word}",
      wordTooShort: "Hidden words need at least 2 characters",
      blocked: "Blocked sources",
      blockedDesc: "EAR blocks an anonymous source (a network), not a person. Someone on a new network could still write to you.",
      noBlocked: "No blocked sources.",
      blockedAgo: "Blocked {time}",
      unblock: "Unblock",
      unblocked: "Unblocked"
    },
    notifications: {
      title: "Notifications",
      inAppNewMessage: "In-app: new messages",
      pushNewMessage: "Push: new messages",
      pushNewMessageDesc: "A nudge when someone writes to you.",
      pushActivity: "Push: activity",
      pushActivityDesc: "Safety and account updates.",
      emailNewMessage: "Email: new messages",
      emailDigest: "Email: daily digest",
      emailSafety: "Email: safety alerts",
      footnote: "Push notifications also need permission in your device settings.",
      channel: "Messages"
    },
    password: {
      title: "Change password",
      current: "Current password",
      next: "New password",
      submit: "Update password",
      enterCurrent: "Enter your current password",
      changed: "Password changed. Other devices were signed out."
    },
    sessions: {
      title: "Sessions",
      intro: "Devices and browsers signed in to your account.",
      thisDevice: "This device",
      lastActive: "Last active {last} · signed in {created}",
      signOut: "Sign out",
      signedOut: "Session signed out",
      device: {
        unknown: "Unknown device",
        android: "Android device",
        ios: "iOS device",
        app: "EAR app",
        web: "Web browser"
      }
    }
  },
  publicProfile: {
    linkNotFoundTitle: "Link not found",
    linkNotFoundBody: "This link doesn't exist, was renamed, or the account is gone.",
    getOwn: "Get your own EAR",
    tryAgainFallback: "Try again",
    linkGone: "This link no longer exists.",
    roundClosed: "Round closed",
    anonymousRound: "Anonymous round",
    roundBadge: "{kind} · {label}",
    sentTitle: "Sent anonymously",
    sentBody: "{username} will see your message, but not who sent it.",
    sendAnother: "Send another",
    getYourOwn: "Get your own link",
    closedTitle: "This round has closed",
    closedBody: "{username} stopped collecting messages here. Thanks for stopping by!",
    pausedTitle: "Not taking messages right now",
    pausedBody: "{username} has paused this link. Try again later.",
    slowTitle: "Slow down a little",
    slowBody: "You've sent a lot of messages recently.",
    retryMinutes: { one: "Try again in about a minute.", other: "Try again in about {count} minutes." },
    retrySeconds: { one: "Try again in a second.", other: "Try again in about {count} seconds." },
    retryLater: "Please try again in a bit.",
    backToMessage: "Back to message",
    rejectedTitle: "That message wasn't sent",
    rejectedBody: "It broke our community rules (harassment, threats, personal info and the like). Nothing was delivered. Rephrase it kindly and try again.",
    editMessage: "Edit message",
    defaultLabel: "Send me an anonymous message",
    placeholder: "Write something…",
    anonymousNote: "Anonymous — {name} can't see who you are. Be kind.",
    verifying: "Verifying you're human…",
    send: "Send anonymously"
  },
  network: {
    offline: "Can't reach EAR. Check your connection.",
    youreOffline: "You're offline",
    didntWork: "That didn't work"
  },
  errors: {
    generic: "Something went wrong.",
    network: "Can't reach the server. Check your connection and try again.",
    rateLimitedIn: "Slow down a little — try again in {seconds}s.",
    rateLimited: "Too many attempts. Please wait a moment.",
    unauthorized: "Please sign in to continue.",
    forbidden: "You don't have access to that.",
    notFound: "We couldn't find that.",
    server: "Something went wrong on our side. Please try again.",
    serverNoToken: "The server did not return a session token."
  },
  validation: {
    email: "Enter a valid email address",
    invalid: "Invalid value",
    username: {
      min: "Username must be at least {min} characters",
      max: "Username must be at most {max} characters",
      chars: "Use only letters, numbers and underscores",
      unavailable: "This username is not available"
    },
    password: {
      min: "Password must be at least {min} characters",
      max: "Password must be at most {max} characters"
    },
    message: {
      min: "Write a little more",
      max: "Max {max} characters"
    }
  },
  time: {
    justNow: "just now",
    minutes: { one: "{count}m ago", other: "{count}m ago" },
    hours: { one: "{count}h ago", other: "{count}h ago" },
    days: { one: "{count}d ago", other: "{count}d ago" }
  }
} as const;

type PluralCategory = "zero" | "one" | "two" | "few" | "many";
/** A plural group has an `other` string and no keys besides CLDR plural categories (so a group that merely has an "other" entry, like report reasons, is not mistaken for one). */
type IsPlural<T> = T extends { other: string } ? ([Exclude<keyof T, PluralCategory | "other">] extends [never] ? true : false) : false;
export interface PluralForms { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string }

/** Maps the `as const` English literal type to the shape every other language must provide. */
export type Shape<T> = T extends string
  ? string
  : IsPlural<T> extends true
    ? PluralForms & { [K in keyof T & PluralCategory]: string }
    : { [K in keyof T]: Shape<T[K]> };

export type Dict = Shape<typeof en>;

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : IsPlural<T[K]> extends true ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every translatable key (leaf strings and plural group bases) as a union of dotted paths. */
export type Key = Paths<typeof en>;
