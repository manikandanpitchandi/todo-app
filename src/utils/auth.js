const USERS_KEY = 'users';
const SESSION_KEY = 'currentUser';

export function hashPassword(username, password) {
  const salted = `${username.toLowerCase()}:${password}`;
  return btoa(unescape(encodeURIComponent(salted)));
}

export function registerUser(username, password) {
  const trimmed = username.trim();
  if (!trimmed || !password) {
    return { ok: false, error: 'Username and password are required.' };
  }
  if (trimmed.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters.' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: 'Username already taken.' };
  }

  const passwordHash = hashPassword(trimmed, password);
  users.push({ username: trimmed, passwordHash });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { ok: true };
}

export function loginUser(username, password) {
  const trimmed = username.trim();
  if (!trimmed || !password) {
    return { ok: false, error: 'Username and password are required.' };
  }

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === trimmed.toLowerCase());
  if (!user) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const hash = hashPassword(trimmed, password);
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  sessionStorage.setItem(SESSION_KEY, user.username);
  return { ok: true, username: user.username };
}

export function getSession() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function todosKey(username) {
  return `todos_${username}`;
}

function getUsers() {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
