// Basic Supabase-powered flashcard app

// IMPORTANT: set these with your Supabase project details before deploying.
// For quick testing you can hardcode them here; for production prefer env vars.
const SUPABASE_URL = window.SUPABASE_URL || "https://xcawzddjslkctnnwarsf.supabase.co";
const SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY || "sb_publishable_Y55mMoHUOlTDz41CEZlrog_ZiMwu4Os";

// Supabase UMD build attaches a global `supabase` with createClient.
// We create our own client instance with a different variable name to avoid
// colliding with the global identifier.
const { createClient } = window.supabase || {};
if (!createClient) {
  throw new Error(
    "Supabase client library not loaded. Check the <script> tag in index.html.",
  );
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const authMessage = document.getElementById("auth-message");

const userEmailLabel = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

const dailyLimitInput = document.getElementById("daily-limit-input");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const progressText = document.getElementById("progress-text");

const cardFront = document.getElementById("card-front");
const cardBack = document.getElementById("card-back");
const showAnswerBtn = document.getElementById("show-answer-btn");
const ratingActions = document.getElementById("rating-actions");
const ratingForgetBtn = document.getElementById("rating-forget-btn");
const ratingSlowBtn = document.getElementById("rating-slow-btn");
const ratingEasyBtn = document.getElementById("rating-easy-btn");

const statusMessage = document.getElementById("status-message");

// State
let currentUser = null;
let dailyLimit = 10;
let reviewedToday = 0;
let queue = [];
let currentCardIndex = 0;

// Utilities
function setStatus(message, type = "info") {
  statusMessage.textContent = message || "";
  statusMessage.className = "message";
  if (type === "error") statusMessage.classList.add("error");
}

function setAuthMessage(message, type = "info") {
  authMessage.textContent = message || "";
  authMessage.className = "message";
  if (type === "error") authMessage.classList.add("error");
}

function updateProgressUI() {
  progressText.textContent = `Today: ${reviewedToday} / ${dailyLimit} reviewed`;
}

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
}

function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
}

function resetCardUI() {
  cardFront.textContent = "";
  cardBack.textContent = "";
  cardBack.classList.add("hidden");
  ratingActions.classList.add("hidden");
  showAnswerBtn.disabled = false;
}

function renderCurrentCard() {
  if (!queue.length || currentCardIndex >= queue.length) {
    cardFront.innerHTML = '<p class="muted">No cards left for today.</p>';
    cardBack.textContent = "";
    cardBack.classList.add("hidden");
    ratingActions.classList.add("hidden");
    showAnswerBtn.disabled = true;
    return;
  }

  const card = queue[currentCardIndex];
  cardFront.textContent = card.front;
  cardBack.textContent = card.back;
  cardBack.classList.add("hidden");
  ratingActions.classList.add("hidden");
  showAnswerBtn.disabled = false;
}

function revealAnswer() {
  cardBack.classList.remove("hidden");
  ratingActions.classList.remove("hidden");
  showAnswerBtn.disabled = true;
}

// Auth handlers
async function handleSignUp() {
  setAuthMessage("");
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    setAuthMessage("Email and password are required.", "error");
    return;
  }

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }
  setAuthMessage("Check your email to confirm, then log in.");
}

async function handleLogin() {
  setAuthMessage("");
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    setAuthMessage("Email and password are required.", "error");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    setAuthMessage(error.message, "error");
    return;
  }
  if (data.session?.user) {
    await onUserSignedIn(data.session.user);
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  queue = [];
  reviewedToday = 0;
  showAuth();
}

async function onUserSignedIn(user) {
  currentUser = user;
  userEmailLabel.textContent = user.email || "";
  showApp();
  setStatus("");
  await bootstrapUserData();
}

// Data bootstrap
async function bootstrapUserData() {
  await Promise.all([loadUserSettings(), calculateReviewedToday()]);
  updateProgressUI();
  await loadCardQueue();
  renderCurrentCard();
}

async function loadUserSettings() {
  const { data, error } = await supabaseClient
    .from("user_settings")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    setStatus(`Failed to load settings: ${error.message}`, "error");
    return;
  }

  if (!data) {
    // create default
    const { data: inserted, error: insertError } = await supabaseClient
      .from("user_settings")
      .insert({ user_id: currentUser.id })
      .select()
      .single();
    if (insertError) {
      setStatus(`Failed to create settings: ${insertError.message}`, "error");
      return;
    }
    dailyLimit = inserted.daily_limit;
  } else {
    dailyLimit = data.daily_limit;
  }

  dailyLimitInput.value = dailyLimit;
}

async function saveUserSettings() {
  const value = Number(dailyLimitInput.value || "0");
  if (!Number.isFinite(value) || value <= 0) {
    setStatus("Daily limit must be a positive number.", "error");
    return;
  }
  const limit = Math.min(Math.max(value, 1), 500);

  const { data, error } = await supabaseClient
    .from("user_settings")
    .upsert(
      { user_id: currentUser.id, daily_limit: limit },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    setStatus(`Failed to save settings: ${error.message}`, "error");
    return;
  }

  dailyLimit = data.daily_limit;
  updateProgressUI();
  setStatus("Settings saved.");
}

async function calculateReviewedToday() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { count, error } = await supabaseClient
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .gte("last_reviewed_at", today)
    .lt("last_reviewed_at", today + "T23:59:59.999Z");

  if (error) {
    setStatus(`Failed to load today's count: ${error.message}`, "error");
    return;
  }

  reviewedToday = count || 0;
}

async function loadCardQueue() {
  const remaining = Math.max(dailyLimit - reviewedToday, 0);
  if (remaining <= 0) {
    setStatus("You reached today's review limit.");
    queue = [];
    currentCardIndex = 0;
    return;
  }

  const { data, error } = await supabaseClient
    .from("cards")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("box", { ascending: true })
    .order("last_reviewed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(remaining);

  if (error) {
    setStatus(`Failed to load cards: ${error.message}`, "error");
    return;
  }

  queue = data || [];
  currentCardIndex = 0;
  if (!queue.length) {
    setStatus("No cards to review. Add some cards in the database.");
  } else {
    setStatus("");
  }
}

function nextBoxForRating(currentBox, rating) {
  // rating: "forget" | "slow" | "easy"
  if (rating === "forget") return 2; // forget box
  if (rating === "slow") return 3; // slow box
  if (rating === "easy") return 4; // easy box
  return currentBox || 1;
}

async function rateCurrentCard(rating) {
  if (!queue.length || currentCardIndex >= queue.length) return;
  const card = queue[currentCardIndex];
  const newBox = nextBoxForRating(card.box, rating);
  const now = new Date().toISOString();

  const { error } = await supabaseClient
    .from("cards")
    .update({
      box: newBox,
      review_count: (card.review_count || 0) + 1,
      last_reviewed_at: now,
      updated_at: now,
    })
    .eq("id", card.id)
    .eq("user_id", currentUser.id);

  if (error) {
    setStatus(`Failed to save review: ${error.message}`, "error");
    return;
  }

  reviewedToday += 1;
  updateProgressUI();

  currentCardIndex += 1;

  if (currentCardIndex >= queue.length) {
    await loadCardQueue();
    renderCurrentCard();
  } else {
    renderCurrentCard();
  }
}

// Event listeners
signupBtn.addEventListener("click", () => {
  handleSignUp().catch((err) =>
    setAuthMessage(`Unexpected error: ${err.message}`, "error"),
  );
});

loginBtn.addEventListener("click", () => {
  handleLogin().catch((err) =>
    setAuthMessage(`Unexpected error: ${err.message}`, "error"),
  );
});

logoutBtn.addEventListener("click", () => {
  handleLogout().catch((err) =>
    setStatus(`Unexpected error: ${err.message}`, "error"),
  );
});

saveSettingsBtn.addEventListener("click", () => {
  saveUserSettings().catch((err) =>
    setStatus(`Unexpected error: ${err.message}`, "error"),
  );
});

showAnswerBtn.addEventListener("click", () => {
  revealAnswer();
});

ratingForgetBtn.addEventListener("click", () => {
  rateCurrentCard("forget").catch((err) =>
    setStatus(`Unexpected error: ${err.message}`, "error"),
  );
});

ratingSlowBtn.addEventListener("click", () => {
  rateCurrentCard("slow").catch((err) =>
    setStatus(`Unexpected error: ${err.message}`, "error"),
  );
});

ratingEasyBtn.addEventListener("click", () => {
  rateCurrentCard("easy").catch((err) =>
    setStatus(`Unexpected error: ${err.message}`, "error"),
  );
});

// Session bootstrap
(async function init() {
  setStatus("");
  resetCardUI();

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session?.user) {
    await onUserSignedIn(session.user);
  } else {
    showAuth();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      onUserSignedIn(session.user).catch((err) =>
        setStatus(`Unexpected error: ${err.message}`, "error"),
      );
    } else {
      handleLogout().catch(() => {
        // ignore
      });
    }
  });
})();

