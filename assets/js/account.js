/*
 * Account page (/account/): sign up, sign in and manage a host account in
 * the persephone-s-chair-games Firebase project. Every Firestore write here
 * follows persephones-chair-uac-manager/docs/SIGNUP.md exactly: the rules
 * refuse anything else, so don't add fields or split the batches.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithCustomToken, sendPasswordResetEmail, signOut, EmailAuthProvider, reauthenticateWithCredential,
  updatePassword
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// Web config from Firebase console › Project settings › Your apps. It
// identifies the project and isn't secret; the Firestore rules are the security.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAVN1e6KVP06CqRiYS_kOj8Vc6k1MfkKFI',
  authDomain: 'persephone-s-chair-games.firebaseapp.com',
  projectId: 'persephone-s-chair-games',
  appId: '1:120648542032:web:24bf588fad0a54ef4c2e55'
};

// Where the Format Access app is hosted (it serves /api/delete-user). No
// trailing slash, e.g. 'https://access.persephoneschair.com'. Leave null
// until it's live: Delete account then explains it isn't available yet.
const ACCOUNT_API_BASE = 'https://admin.persephoneschair.com';

// Username rules: copied from SIGNUP.md (and the rules / src/lib/username.ts
// in persephones-chair-uac-manager). Keep all three in step.
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'staff', 'support', 'help', 'root',
  'system', 'official', 'persephone', 'persephoneschair', 'persephones_chair', 'persephone_chair', 'pchair'];

function usernameProblem(name) {
  if (name.length < 3) return 'At least 3 characters.';
  if (name.length > 20) return 'No more than 20 characters.';
  if (!USERNAME_PATTERN.test(name)) return 'Letters, numbers and underscores only.';
  if (RESERVED.includes(name.toLowerCase())) return 'That name is reserved.';
  return null;
}

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- Firestore recipes (SIGNUP.md) ----------

async function isTaken(username) {
  try {
    return (await getDoc(doc(db, 'usernames', username.toLowerCase()))).exists();
  } catch (err) {
    // Anyone may read one usernames/ doc, so a refusal here isn't "taken":
    // the published rules are out of date or the service is down.
    if (err && err.code === 'permission-denied') throw new Error('Couldn’t check usernames right now. Try again later.');
    throw err;
  }
}

// Sign-up step 3: the users/ record and the username claim, together.
async function createRecord(user, username) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.uid), { email: user.email, createdAt: serverTimestamp(), username });
  batch.set(doc(db, 'usernames', username.toLowerCase()), { uid: user.uid, username, createdAt: serverTimestamp() });
  await batch.commit();
}

// Choose (no current name) or change a username. All writes in one batch.
async function setMyUsername(user, current, next) {
  const batch = writeBatch(db);
  const nextKey = next.toLowerCase();
  if (current && current.toLowerCase() === nextKey) {
    // Same name, different capitals: re-case the existing claim.
    batch.update(doc(db, 'usernames', nextKey), { username: next });
  } else {
    if (current) batch.delete(doc(db, 'usernames', current.toLowerCase())); // release the old name
    batch.set(doc(db, 'usernames', nextKey), { uid: user.uid, username: next, createdAt: serverTimestamp() });
  }
  batch.update(doc(db, 'users', user.uid), { username: next });
  await batch.commit();
}

async function reauthenticate(user, password) {
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
}

const DELETE_ERRORS = {
  reauth_required: 'Please enter your password again and retry.',
  bad_token: 'Your sign-in has expired. Sign out, sign back in and try again.',
  signed_out: 'Your sign-in has expired. Sign out, sign back in and try again.',
  cannot_delete_self: "This is an admin account, so it can't be deleted here.",
  server_error: "The server couldn't finish deleting your account. Try again; it's safe to repeat."
};

async function deleteMyAccount(user, password) {
  if (!ACCOUNT_API_BASE) throw new Error("Deleting accounts from the website isn't switched on yet. Ask on the Discord and we'll do it for you.");
  await reauthenticate(user, password);
  const token = await user.getIdToken(true);
  let response;
  try {
    response = await fetch(ACCOUNT_API_BASE + '/api/delete-user', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid })
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  throw new Error(DELETE_ERRORS[body.error] || `Delete failed (${response.status}). Try again later.`);
}

const SIGN_IN_ERRORS = {
  invalid_credentials: 'Wrong username or password.',
  too_many_attempts: 'Too many attempts. Wait a few minutes and try again.',
  user_disabled: 'This account has been disabled. Ask on the Discord.',
  bad_request: 'Enter your username and password.'
};

// Signing in with a username: the Format Access app looks the account up and
// checks the password server-side, so emails are never exposed, then returns
// a one-off token (SIGNUP.md, "Sign in and forgotten passwords").
async function signInWithUsername(username, password) {
  if (usernameProblem(username)) throw new Error('Wrong username or password.');
  if (!ACCOUNT_API_BASE) {
    throw new Error("Signing in with a username isn't available yet. Use the email address you signed up with.");
  }
  let response;
  try {
    response = await fetch(ACCOUNT_API_BASE + '/api/username-sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => ({}));
  if (response.ok && body.token) {
    await signInWithCustomToken(auth, body.token);
    return;
  }
  throw new Error(SIGN_IN_ERRORS[body.error] || "Couldn't sign in just now. Try again later.");
}

// ---------- Messages ----------

const MESSAGES = {
  'auth/email-already-in-use': 'There’s already an account with that email. Sign in instead, or reset your password.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/weak-password': 'Passwords need at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/user-disabled': 'This account has been disabled. Ask on the Discord.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Couldn’t reach the server. Check your connection and try again.',
  'auth/requires-recent-login': 'For security, enter your password again.',
  'auth/unauthorized-domain': 'Sign-in isn’t enabled on this website yet.',
  'permission-denied': 'That username was taken just now, or is reserved. Try another.',
  unavailable: 'Couldn’t reach the server. Check your connection and try again.'
};

// Reauthentication failures mean "wrong current password", not "wrong email".
function explain(err, { reauth = false } = {}) {
  const code = err && err.code;
  if (reauth && (code === 'auth/invalid-credential' || code === 'auth/wrong-password')) {
    return 'That password isn’t right.';
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (err && err.message && !code) return err.message;
  console.error(err);
  return 'Something went wrong. Try again.';
}

// ---------- Page state ----------

const $ = (id) => document.getElementById(id);
const views = ['v-loading', 'v-signed-out', 'v-choose', 'v-account', 'v-goodbye'];
const lede = $('page-lede');
const LEDE_SIGNED_OUT = lede.textContent;

let record = null;        // users/{uid} for the signed-in account (null = none yet)
let holdRender = false;   // true while sign-up runs, so the half-made account isn't shown
let saidGoodbye = false;  // show the goodbye panel instead of the sign-up form
let refreshToken = 0;
let chooseNote = '';      // message to show when the choose-username panel opens

function show(id) {
  views.forEach((v) => { $(v).hidden = v !== id; });
  const signedIn = id === 'v-choose' || id === 'v-account';
  lede.textContent = signedIn ? 'Signed in. Manage your Game Night host account here.' : LEDE_SIGNED_OUT;
}

function msg(form, text, kind = 'error') {
  const el = form.querySelector('.form-msg');
  el.textContent = text || '';
  el.className = 'form-msg' + (text ? ' ' + kind : '');
}

// Disable a form's buttons while `work` runs; show any error it throws.
async function busy(form, work, opts) {
  const buttons = form.querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });
  msg(form, '');
  try {
    await work();
  } catch (err) {
    msg(form, explain(err, opts));
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

async function refresh() {
  const token = ++refreshToken;
  const user = auth.currentUser;
  if (!user) {
    record = null;
    show(saidGoodbye ? 'v-goodbye' : 'v-signed-out');
    return;
  }
  $('loading-text').textContent = 'Loading your account…';
  $('loading-retry').hidden = true;
  show('v-loading');
  let snap;
  try {
    snap = await getDoc(doc(db, 'users', user.uid));
  } catch (err) {
    if (token !== refreshToken) return;
    $('loading-text').textContent = explain(err);
    $('loading-retry').hidden = false;
    return;
  }
  if (token !== refreshToken) return;
  record = snap.exists() ? snap.data() : null;
  document.querySelectorAll('.js-email').forEach((el) => { el.textContent = user.email; });
  document.querySelectorAll('.js-email-value').forEach((el) => { el.value = user.email; });
  if (!record || !record.username) {
    const form = $('f-choose');
    form.reset();
    usernameHint($('ch-username'), $('ch-username-hint'));
    msg(form, chooseNote);
    chooseNote = '';
    show('v-choose');
    return;
  }
  document.querySelectorAll('.js-username').forEach((el) => { el.textContent = record.username; });
  closeSubforms();
  show('v-account');
}

// ---------- Username hints (live validation + availability) ----------

const HINT_DEFAULTS = new Map();

function usernameHint(input, hint, current) {
  if (!HINT_DEFAULTS.has(hint)) HINT_DEFAULTS.set(hint, hint.textContent);
  const name = input.value.trim();
  const set = (text, kind) => { hint.textContent = text; hint.className = 'hint' + (kind ? ' ' + kind : ''); };
  if (!name) return set(HINT_DEFAULTS.get(hint));
  const problem = usernameProblem(name);
  if (problem) return set(problem, 'bad');
  if (current && current.toLowerCase() === name.toLowerCase()) {
    return set(current === name ? 'That’s your username already.' : 'Same name with new capitals.', current === name ? 'bad' : 'ok');
  }
  set('Checking…');
  clearTimeout(input._check);
  input._check = setTimeout(async () => {
    try {
      const taken = await isTaken(name);
      if (input.value.trim() !== name) return;
      set(taken ? 'That username is taken.' : 'Available.', taken ? 'bad' : 'ok');
    } catch {
      if (input.value.trim() === name) set(HINT_DEFAULTS.get(hint));
    }
  }, 350);
}

[['su-username', 'su-username-hint'], ['ch-username', 'ch-username-hint'], ['rn-username', 'rn-username-hint']]
  .forEach(([inputId, hintId]) => {
    const input = $(inputId);
    input.addEventListener('input', () => {
      usernameHint(input, $(hintId), inputId === 'rn-username' && record ? record.username : undefined);
    });
  });

// ---------- Signed out: tabs ----------

const signedOutForms = { signup: $('f-signup'), signin: $('f-signin'), reset: $('f-reset') };

function setTab(tab) {
  Object.entries(signedOutForms).forEach(([key, form]) => {
    form.hidden = key !== tab;
    msg(form, '');
  });
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.tab === tab || (tab === 'reset' && b.dataset.tab === 'signin')));
  });
}

document.querySelectorAll('#v-signed-out [data-tab]').forEach((b) => {
  b.addEventListener('click', () => setTab(b.dataset.tab));
});

$('forgot-btn').addEventListener('click', () => {
  const id = $('si-id').value.trim();
  if (id.includes('@')) $('rs-email').value = id;
  setTab('reset');
  $('rs-email').focus();
});

if (location.hash === '#signin') setTab('signin');

// ---------- Signed out: create account ----------

$('f-signup').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = $('su-email').value.trim();
  const username = $('su-username').value.trim();
  const password = $('su-password').value;
  busy(form, async () => {
    if (!email) throw new Error('Enter your email address.');
    const problem = usernameProblem(username);
    if (problem) throw new Error('Username: ' + problem);
    if (password.length < 6) throw new Error('Passwords need at least 6 characters.');
    // 1. Friendly early check (step 3 is the real guarantee).
    if (await isTaken(username)) throw new Error('That username is taken. Try another.');
    holdRender = true;
    try {
      // 2. The login.
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      // 3. Record + claim. If this fails the login still exists; the
      //    choose-username panel picks up from here.
      try {
        await createRecord(user, username);
      } catch (err) {
        chooseNote = err && err.code === 'permission-denied'
          ? `Your account was created, but “${username}” was taken just now. Choose another username.`
          : 'Your account was created, but the username didn’t save. Try again.';
      }
    } finally {
      holdRender = false;
    }
    form.reset();
    await refresh();
  });
});

// ---------- Signed out: sign in, reset ----------

$('f-signin').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const id = $('si-id').value.trim();
  const password = $('si-password').value;
  busy(form, async () => {
    if (!id) throw new Error('Enter your email or username.');
    if (!password) throw new Error('Enter your password.');
    if (id.includes('@')) await signInWithEmailAndPassword(auth, id, password);
    else await signInWithUsername(id, password);
    form.reset();
  });
});

$('f-reset').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = $('rs-email').value.trim();
  busy(form, async () => {
    if (!email) throw new Error('Enter your email address.');
    await sendPasswordResetEmail(auth, email);
    msg(form, 'If there’s an account for that address, a reset link is on its way. Check your inbox (and spam).', 'ok');
  });
});

// ---------- Signed in: choose a username ----------

$('f-choose').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const username = $('ch-username').value.trim();
  busy(form, async () => {
    const problem = usernameProblem(username);
    if (problem) throw new Error(problem);
    if (await isTaken(username)) throw new Error('That username is taken. Try another.');
    const user = auth.currentUser;
    // No record at all: sign-up step 3. Record without a name: choose one.
    if (record) await setMyUsername(user, undefined, username);
    else await createRecord(user, username);
    await refresh();
    msg($('v-account'), 'Username saved.', 'ok');
  });
});

// ---------- Signed in: account actions ----------

function closeSubforms() {
  document.querySelectorAll('#v-account .subform').forEach((f) => { f.hidden = true; f.reset(); msg(f, ''); });
  $('rn-username-hint').className = 'hint';
  if (HINT_DEFAULTS.has($('rn-username-hint'))) $('rn-username-hint').textContent = HINT_DEFAULTS.get($('rn-username-hint'));
}

document.querySelectorAll('[data-open]').forEach((b) => {
  b.addEventListener('click', () => {
    const form = $(b.dataset.open);
    const wasOpen = !form.hidden;
    closeSubforms();
    msg($('v-account'), '');
    if (wasOpen) return;
    form.hidden = false;
    form.querySelector('.field').focus();
  });
});

document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSubforms));

document.querySelectorAll('[data-action="signout"]').forEach((b) => {
  b.addEventListener('click', () => signOut(auth));
});

$('f-rename').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const next = $('rn-username').value.trim();
  busy(form, async () => {
    const problem = usernameProblem(next);
    if (problem) throw new Error(problem);
    const current = record.username;
    if (next === current) throw new Error('That’s your username already.');
    if (current.toLowerCase() !== next.toLowerCase() && await isTaken(next)) {
      throw new Error('That username is taken. Try another.');
    }
    await setMyUsername(auth.currentUser, current, next);
    await refresh();
    msg($('v-account'), `Your username is now ${next}.`, 'ok');
  });
});

$('f-password').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const current = $('pw-current').value;
  const next = $('pw-new').value;
  busy(form, async () => {
    if (!current) throw new Error('Enter your current password.');
    if (next.length < 6) throw new Error('Passwords need at least 6 characters.');
    const user = auth.currentUser;
    await reauthenticate(user, current);
    await updatePassword(user, next);
    closeSubforms();
    msg($('v-account'), 'Password changed.', 'ok');
  }, { reauth: true });
});

$('f-delete').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const password = $('del-password').value;
  busy(form, async () => {
    if (!password) throw new Error('Enter your password.');
    if (!$('del-confirm').checked) throw new Error('Tick the box to confirm.');
    await deleteMyAccount(auth.currentUser, password);
    saidGoodbye = true;
    await signOut(auth);
  }, { reauth: true });
});

$('goodbye-done').addEventListener('click', () => {
  saidGoodbye = false;
  setTab('signup');
  show('v-signed-out');
});

$('loading-retry').addEventListener('click', refresh);

onAuthStateChanged(auth, () => {
  if (!holdRender) refresh();
});
