/** auth namespace: the few account links that land on the web (email verification, password reset). */
export const auth = {
  openApp: "Open the EAR app",
  verify: {
    metaTitle: "Verify email",
    title: "Email verification",
    loading: "Verifying your email…",
    okTitle: "Email verified",
    okBody: "You can now publish public answers.",
    missing: "This verification link is incomplete",
    invalid: "This link is invalid or has expired",
    badBody: "Log in and use “Resend verification email” from the banner at the top of your inbox."
  },
  reset: {
    title: "Choose a new password",
    incompleteTitle: "This reset link is incomplete.",
    incompleteBody: "Request a new one and use the link from the latest email.",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    submit: "Set new password",
    mismatch: "Passwords don't match",
    invalidPassword: "Invalid password",
    invalidLink: "This reset link is invalid or has expired. Request a new one.",
    requestNew: "Request a new link in the app",
    doneTitle: "Password updated",
    doneBody: "You've been signed out everywhere. Log in with your new password."
  },
  password: {
    show: "Show password",
    hide: "Hide password",
    rules: "Password rules",
    ruleLen: "At least {min} characters",
    ruleMax: "At most {max} characters",
    ruleMix: "Mix of letters and numbers or symbols (recommended)",
    met: " (met)",
    notMet: " (not met yet)",
    tooShort: "Password must be at least {min} characters"
  }
};
