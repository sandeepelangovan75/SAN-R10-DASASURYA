import { 
  AuditLogEntry,
  Bookmark, 
  CalendarEvent, 
  ChakraSession, 
  ConsentRecord, 
  ContentDraft,
  ConversationSession,
  DailyHabit,
  ExplicitUserMemory,
  HeadId,
  LanguageCode, 
  LanguagePreferences, 
  MultilingualRoadmap, 
  ParentalConsentRecord, 
  RavanaMindAnalysis, 
  SanCreditRecord, 
  UserAccount, 
  UserNote, 
  UserProfile, 
  UserProgress, 
  UserRole,
  VerificationChannel, 
  WellnessJournalEntry 
} from '../types';
import { HEAD_PILLARS, COURSES, getHeadById } from '../data/curriculum';
import { DEFAULT_LANGUAGE_PREFERENCES } from '../data/languages';
import { supabaseDbService } from './supabaseDbService';

const STORAGE_KEYS = {
  ACCOUNTS: 'dasasurya_accounts_v2',
  SESSION: 'dasasurya_active_session_v2',
  PROFILES: 'dasasurya_profiles_v2',
  PROGRESS: 'dasasurya_progress_v2',
  NOTES: 'dasasurya_notes_v2',
  BOOKMARKS: 'dasasurya_bookmarks_v2',
  CALENDAR: 'dasasurya_calendar_v2',
  HABITS: 'dasasurya_habits_v2',
  CREDITS: 'dasasurya_credits_v2',
  RAVANA_MIND: 'dasasurya_ravana_mind_v2',
  ROADMAPS: 'dasasurya_roadmaps_v2',
  CHAKRA_SESSIONS: 'dasasurya_chakra_sessions_v2',
  WELLNESS_JOURNAL: 'dasasurya_wellness_journal_v2',
  CONVERSATIONS: 'dasasurya_conversations_v2',
  EXPLICIT_MEMORY: 'dasasurya_memory_v2',
  ADMIN_DRAFTS: 'dasasurya_admin_drafts_v2',
  AUDIT_LOGS: 'dasasurya_audit_logs_v2',
};

// Safe JSON helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

export function calculateAge(dobString: string): number {
  if (!dobString) return 20;
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

// -------------------------------------------------------------
// SECURE CSV FORMULA INJECTION SANITIZER
// Ensures exported CSVs never trigger formula execution in spreadsheet software
// -------------------------------------------------------------
export function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  let s = String(val);
  // If value begins with =, +, -, @, \t, or \r, prefix with a single quote
  if (/^[=\+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

// -------------------------------------------------------------
// STORAGE & IDENTITY SERVICE
// -------------------------------------------------------------
export const storageService = {
  // Accounts
  getAccounts(): UserAccount[] {
    return getFromStorage<UserAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
  },

  registerAccount(user: { 
    fullName: string; 
    username: string; 
    email: string; 
    phone?: string;
    verificationChannel: VerificationChannel;
    password: string;
    dateOfBirth: string;
    preferredLanguage?: LanguageCode;
    parentName?: string;
    parentContact?: string;
    role?: UserRole;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const accounts = this.getAccounts();
    const cleanEmail = user.email.trim().toLowerCase();
    const cleanUsername = user.username.trim().toLowerCase();
    const cleanPhone = user.phone ? user.phone.trim() : undefined;

    if (cleanEmail && accounts.some(a => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    if (accounts.some(a => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'This username is already taken. Please choose another.' };
    }

    const age = calculateAge(user.dateOfBirth);
    const isUnder12 = age < 12;
    const isMinor = age < 18;

    const initialLangPrefs: LanguagePreferences = {
      interfaceLanguage: user.preferredLanguage || 'en',
      responseLanguage: user.preferredLanguage || 'en',
      learningLanguage: user.preferredLanguage || 'en',
    };

    const parentalConsent: ParentalConsentRecord = {
      required: isUnder12,
      authorized: !isUnder12,
      parentName: user.parentName || undefined,
      parentContact: user.parentContact || undefined,
      authorizedAt: !isUnder12 ? new Date().toISOString() : undefined,
      consentMethod: !isUnder12 ? undefined : 'email_authorization',
      passcodePin: undefined,
      maxDailyMinutes: isUnder12 ? 30 : 120,
      allowedFeatures: {
        externalLinks: !isUnder12,
        publicSharing: false,
        advancedChakra: !isUnder12,
        unguidedChat: !isUnder12,
      },
    };

    const consentRecords: ConsentRecord[] = [
      {
        policyVersion: '2026.2',
        consentedAt: new Date().toISOString(),
        types: ['terms_of_service', 'privacy_policy', 'age_safety_policy', 'data_retention'],
      },
    ];

    // Bootstrap first account or designated developer email as Core Admin
    let assignedRole: UserRole = user.role || 'learner';
    if (accounts.length === 0 || cleanEmail.includes('sandeep') || cleanEmail.includes('admin@dasasurya')) {
      assignedRole = 'core_admin';
    }

    const newUser: UserAccount = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      fullName: user.fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      verificationChannel: user.verificationChannel,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      dateOfBirth: user.dateOfBirth,
      age,
      isUnder12,
      isMinor,
      passwordHash: btoa(user.password),
      role: assignedRole,
      parentalConsent,
      consentRecords,
      languagePreferences: initialLangPrefs,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newUser);
    setToStorage(STORAGE_KEYS.ACCOUNTS, accounts);

    // Initialize User Profile
    const profile: UserProfile = {
      id: 'prof_' + newUser.id,
      userId: newUser.id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      phone: cleanPhone,
      bio: isUnder12 
        ? 'Young explorer cultivating foundational wisdom and calm learning habits.' 
        : assignedRole === 'core_admin' 
        ? 'Core System Architect & Guardian of the DASASURYA Platform.'
        : 'Lifelong learner building mastery through the 10 Heads.',
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${newUser.username}`,
      interests: ['Knowledge', 'Wellness', 'Strategy', 'Governance'],
      preferredHeads: ['head-01-knowledge', 'head-04-wellness', 'head-05-strategy'],
      learningGoals: isUnder12 
        ? 'Discover how science, language, and healthy routines work together.' 
        : 'Master first principles thinking and build sustainable daily learning architecture.',
      skillLevel: 'Foundational',
      preferredSchedule: isUnder12 ? '15 mins/day' : '30 mins/day',
      dateOfBirth: user.dateOfBirth,
      age,
      isUnder12,
      languagePreferences: initialLangPrefs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveProfile(profile);
    this.setActiveSession(newUser.id);
    this.addCredits(newUser.id, 50, 'Welcome to DASASURYA & SAN R10 Architecture');

    // Create Initial Calendar Starter Event
    const today = new Date().toISOString().split('T')[0];
    this.createCalendarEvent({
      id: 'cal_' + Date.now(),
      userId: newUser.id,
      title: isUnder12 ? 'Welcome Lesson: The Wonder of Curiosity' : 'Introductory Chapter: The Socratic Scalpel',
      type: 'learning',
      date: today,
      time: '17:00',
      chapterId: 'chap-01-first-principles',
      isCompleted: false,
      notes: 'Begin reading in Head 01 (Knowledge)',
    });

    this.recordAuditLog(newUser.id, newUser.email, newUser.role, 'USER_REGISTERED', 'ACCOUNT', `Role: ${newUser.role}`);

    return { success: true, user: newUser };
  },

  authenticate(loginIdentifier: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
    const cleanId = loginIdentifier.trim().toLowerCase();
    const accounts = this.getAccounts();
    const account = accounts.find(a => 
      a.email.toLowerCase() === cleanId || 
      a.username.toLowerCase() === cleanId || 
      (a.phone && a.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (!account) {
      return { success: false, error: 'Invalid credentials. No matching account found.' };
    }

    if (account.passwordHash !== btoa(password)) {
      return { success: false, error: 'Invalid credentials. Password does not match.' };
    }

    this.setActiveSession(account.id);
    this.recordAuditLog(account.id, account.email, account.role, 'USER_LOGIN', 'SESSION');
    return { success: true, user: account };
  },

  getActiveUser(): UserAccount | null {
    const activeId = getFromStorage<string | null>(STORAGE_KEYS.SESSION, null);
    if (!activeId) return null;
    const accounts = this.getAccounts();
    return accounts.find(a => a.id === activeId) || null;
  },

  setActiveSession(userId: string | null): void {
    setToStorage(STORAGE_KEYS.SESSION, userId);
  },

  signOut(): void {
    const active = this.getActiveUser();
    if (active) {
      this.recordAuditLog(active.id, active.email, active.role, 'USER_LOGOUT', 'SESSION');
    }
    this.setActiveSession(null);
  },

  // Role Management (Core Admin > Admin > Learner)
  isCoreAdmin(userId: string): boolean {
    const user = this.getAccounts().find(a => a.id === userId);
    return user?.role === 'core_admin';
  },

  isAdmin(userId: string): boolean {
    const user = this.getAccounts().find(a => a.id === userId);
    return user?.role === 'admin' || user?.role === 'core_admin' || user?.role === 'curator_admin';
  },

  setAccountRole(callerId: string, targetUserId: string, newRole: UserRole): boolean {
    if (!this.isCoreAdmin(callerId)) {
      console.warn('Unauthorized attempt to modify role. Only Core Admin may assign roles.');
      return false;
    }
    const accounts = this.getAccounts();
    const targetIdx = accounts.findIndex(a => a.id === targetUserId);
    if (targetIdx === -1) return false;

    accounts[targetIdx].role = newRole;
    setToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    this.recordAuditLog(callerId, 'caller', 'core_admin', 'ROLE_UPDATED', 'ACCOUNT', `Set ${accounts[targetIdx].email} to ${newRole}`, targetUserId);
    return true;
  },

  // Profile Management
  getProfile(userId: string): UserProfile | null {
    const profiles = getFromStorage<Record<string, UserProfile>>(STORAGE_KEYS.PROFILES, {});
    return profiles[userId] || null;
  },

  saveProfile(profile: UserProfile): void {
    const profiles = getFromStorage<Record<string, UserProfile>>(STORAGE_KEYS.PROFILES, {});
    profiles[profile.userId] = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.PROFILES, profiles);

    // Sync to Supabase profiles table if authenticated
    try {
      supabaseDbService.upsertProfile(profile).catch(() => {});
    } catch (e) {
      // Ignored for offline/local storage fallback
    }
  },

  updateLanguagePreferences(userId: string, prefs: LanguagePreferences): void {
    const accounts = this.getAccounts();
    const accIdx = accounts.findIndex(a => a.id === userId);
    if (accIdx !== -1) {
      accounts[accIdx].languagePreferences = prefs;
      setToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    }

    const prof = this.getProfile(userId);
    if (prof) {
      prof.languagePreferences = prefs;
      this.saveProfile(prof);
    }

    try {
      supabaseDbService.saveUserPreferences(userId, prefs).catch(() => {});
    } catch (e) {}
  },

  updateParentalConsent(userId: string, consentUpdate: Partial<ParentalConsentRecord>): void {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.id === userId);
    if (idx !== -1) {
      accounts[idx].parentalConsent = {
        ...accounts[idx].parentalConsent!,
        ...consentUpdate,
      };
      setToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
      this.recordAuditLog(userId, accounts[idx].email, accounts[idx].role, 'PARENTAL_CONSENT_UPDATED', 'CHILD_SAFETY');
    }
  },

  withdrawConsent(userId: string, consentType: string): void {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.id === userId);
    if (idx !== -1) {
      accounts[idx].consentRecords.push({
        policyVersion: '2026.2',
        consentedAt: new Date().toISOString(),
        withdrawnAt: new Date().toISOString(),
        types: [consentType],
      });
      setToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
      this.recordAuditLog(userId, accounts[idx].email, accounts[idx].role, 'CONSENT_WITHDRAWN', 'PRIVACY', consentType);
    }
  },

  saveAccount(user: UserAccount): void {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.id === user.id);
    if (idx !== -1) {
      accounts[idx] = user;
    } else {
      accounts.push(user);
    }
    setToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
  },

  // Learning Progress
  getProgress(userId: string): UserProgress {
    const allProgress = getFromStorage<Record<string, UserProgress>>(STORAGE_KEYS.PROGRESS, {});
    if (!allProgress[userId]) {
      const initial: UserProgress = {
        userId,
        chapterProgress: {},
        lastActiveChapterId: 'chap-01-first-principles',
        lastActiveHeadId: 'head-01-knowledge',
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        totalReadingMinutes: 0,
      };
      allProgress[userId] = initial;
      setToStorage(STORAGE_KEYS.PROGRESS, allProgress);
    }
    return allProgress[userId];
  },

  updateChapterReadingProgress(userId: string, chapterId: string, headId: HeadId, progressPercent: number, readingMinutes: number = 0): void {
    const allProgress = getFromStorage<Record<string, UserProgress>>(STORAGE_KEYS.PROGRESS, {});
    const userProgress = this.getProgress(userId);

    const prev = userProgress.chapterProgress[chapterId] || {
      readingProgress: 0,
      isCompleted: false,
      quizCompleted: false,
      practiceCompleted: false,
      applicationCompleted: false,
    };

    const newReading = Math.max(prev.readingProgress, Math.min(100, Math.round(progressPercent)));
    const isNowComplete = newReading >= 100 && prev.quizCompleted && prev.practiceCompleted;

    userProgress.chapterProgress[chapterId] = {
      ...prev,
      readingProgress: newReading,
      isCompleted: isNowComplete || prev.isCompleted,
      completedAt: (isNowComplete && !prev.completedAt) ? new Date().toISOString() : prev.completedAt,
    };

    userProgress.lastActiveChapterId = chapterId;
    userProgress.lastActiveHeadId = headId;
    userProgress.totalReadingMinutes = (userProgress.totalReadingMinutes || 0) + readingMinutes;

    // Daily streak check
    const today = new Date().toISOString().split('T')[0];
    if (userProgress.lastActiveDate !== today) {
      userProgress.streakDays = (userProgress.streakDays || 0) + 1;
      userProgress.lastActiveDate = today;
      this.addCredits(userId, 10, 'Daily Learning Streak Maintained');
    }

    allProgress[userId] = userProgress;
    setToStorage(STORAGE_KEYS.PROGRESS, allProgress);
    try {
      supabaseDbService.upsertProgress(userProgress).catch(() => {});
    } catch (e) {}
  },

  recordQuizResult(userId: string, chapterId: string, scorePercent: number): void {
    const allProgress = getFromStorage<Record<string, UserProgress>>(STORAGE_KEYS.PROGRESS, {});
    const userProgress = this.getProgress(userId);
    const prev = userProgress.chapterProgress[chapterId] || {
      readingProgress: 100,
      isCompleted: false,
      quizCompleted: false,
      practiceCompleted: false,
      applicationCompleted: false,
    };

    userProgress.chapterProgress[chapterId] = {
      ...prev,
      quizCompleted: true,
      quizScore: scorePercent,
    };

    allProgress[userId] = userProgress;
    setToStorage(STORAGE_KEYS.PROGRESS, allProgress);
    try {
      supabaseDbService.upsertProgress(userProgress).catch(() => {});
    } catch (e) {}
    this.addCredits(userId, 20, `Passed Socratic Check for ${chapterId}`);
  },

  recordQuizSubmission(userId: string, chapterId: string, score: number, totalQuestions: number): void {
    const scorePercent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    this.recordQuizResult(userId, chapterId, scorePercent);
  },

  recordPracticeSubmission(userId: string, chapterId: string, submissionText: string): void {
    const allProgress = getFromStorage<Record<string, UserProgress>>(STORAGE_KEYS.PROGRESS, {});
    const userProgress = this.getProgress(userId);
    const prev = userProgress.chapterProgress[chapterId] || {
      readingProgress: 100,
      isCompleted: false,
      quizCompleted: false,
      practiceCompleted: false,
      applicationCompleted: false,
    };

    userProgress.chapterProgress[chapterId] = {
      ...prev,
      practiceCompleted: true,
      practiceSubmission: submissionText,
    };

    allProgress[userId] = userProgress;
    setToStorage(STORAGE_KEYS.PROGRESS, allProgress);
    try {
      supabaseDbService.upsertProgress(userProgress).catch(() => {});
    } catch (e) {}
    this.addCredits(userId, 30, `Completed Practice for ${chapterId}`);
  },

  recordReflection(userId: string, chapterId: string, reflectionText: string): void {
    const allProgress = getFromStorage<Record<string, UserProgress>>(STORAGE_KEYS.PROGRESS, {});
    const userProgress = this.getProgress(userId);
    const prev = userProgress.chapterProgress[chapterId] || {
      readingProgress: 100,
      isCompleted: false,
      quizCompleted: false,
      practiceCompleted: false,
      applicationCompleted: false,
    };

    userProgress.chapterProgress[chapterId] = {
      ...prev,
      applicationCompleted: true,
      reflectionText,
      isCompleted: true,
    };

    allProgress[userId] = userProgress;
    setToStorage(STORAGE_KEYS.PROGRESS, allProgress);
    try {
      supabaseDbService.upsertProgress(userProgress).catch(() => {});
    } catch (e) {}
    this.addCredits(userId, 40, `Completed Chapter Mastery & Reflection`);
  },

  // Notes
  getNotes(userId: string): UserNote[] {
    const all = getFromStorage<UserNote[]>(STORAGE_KEYS.NOTES, []);
    return all.filter(n => n.userId === userId);
  },

  saveNote(note: Omit<UserNote, 'id' | 'createdAt' | 'updatedAt'>): UserNote {
    const all = getFromStorage<UserNote[]>(STORAGE_KEYS.NOTES, []);
    const newNote: UserNote = {
      ...note,
      id: 'note_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.unshift(newNote);
    setToStorage(STORAGE_KEYS.NOTES, all);
    return newNote;
  },

  deleteNote(noteId: string): void {
    const all = getFromStorage<UserNote[]>(STORAGE_KEYS.NOTES, []);
    setToStorage(STORAGE_KEYS.NOTES, all.filter(n => n.id !== noteId));
  },

  // Bookmarks
  getBookmarks(userId: string): Bookmark[] {
    const all = getFromStorage<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
    return all.filter(b => b.userId === userId);
  },

  toggleBookmark(userId: string, chapterId: string, chapterTitle: string, headId: HeadId, headName: string): boolean {
    const all = getFromStorage<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
    const existingIdx = all.findIndex(b => b.userId === userId && b.chapterId === chapterId);

    if (existingIdx !== -1) {
      all.splice(existingIdx, 1);
      setToStorage(STORAGE_KEYS.BOOKMARKS, all);
      return false; // Removed
    } else {
      all.unshift({
        id: 'bm_' + Date.now(),
        userId,
        chapterId,
        chapterTitle,
        headId,
        headName,
        createdAt: new Date().toISOString(),
      });
      setToStorage(STORAGE_KEYS.BOOKMARKS, all);
      return true; // Added
    }
  },

  isBookmarked(userId: string, chapterId: string): boolean {
    const all = this.getBookmarks(userId);
    return all.some(b => b.chapterId === chapterId);
  },

  // Calendar
  getCalendarEvents(userId: string): CalendarEvent[] {
    const all = getFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
    return all.filter(c => c.userId === userId);
  },

  createCalendarEvent(event: CalendarEvent): void {
    const all = getFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
    all.push(event);
    setToStorage(STORAGE_KEYS.CALENDAR, all);
  },

  updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): void {
    const all = getFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
    const idx = all.findIndex(e => e.id === eventId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setToStorage(STORAGE_KEYS.CALENDAR, all);
    }
  },

  toggleCalendarEventCompleted(eventId: string): void {
    const all = getFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
    const evt = all.find(e => e.id === eventId);
    if (evt) {
      evt.isCompleted = !evt.isCompleted;
      setToStorage(STORAGE_KEYS.CALENDAR, all);
    }
  },

  deleteCalendarEvent(eventId: string): void {
    const all = getFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
    setToStorage(STORAGE_KEYS.CALENDAR, all.filter(e => e.id !== eventId));
  },

  // Daily Habits for MY DAY
  getDailyHabits(userId: string): DailyHabit[] {
    const all = getFromStorage<DailyHabit[]>(STORAGE_KEYS.HABITS, []);
    const userHabits = all.filter(h => h.userId === userId);
    if (userHabits.length === 0) {
      // Seed default sustainable habits
      const defaults: DailyHabit[] = [
        { id: 'hab_1', userId, title: '90-min Focused Reading & Deconstruction', headId: 'head-01-knowledge', targetPerWeek: 5, completedDays: [], createdAt: new Date().toISOString() },
        { id: 'hab_2', userId, title: 'Morning Retinal Daylight & Hydration Reset', headId: 'head-04-wellness', targetPerWeek: 7, completedDays: [], createdAt: new Date().toISOString() },
        { id: 'hab_3', userId, title: 'Vocabulary Root Clustering (15 mins)', headId: 'head-02-language', targetPerWeek: 5, completedDays: [], createdAt: new Date().toISOString() },
        { id: 'hab_4', userId, title: 'Chesterton Fence Problem Review in RAVANA MIND', headId: 'head-05-strategy', targetPerWeek: 3, completedDays: [], createdAt: new Date().toISOString() },
      ];
      setToStorage(STORAGE_KEYS.HABITS, [...all, ...defaults]);
      return defaults;
    }
    return userHabits;
  },

  toggleDailyHabit(userId: string, habitId: string, date: string): void {
    const all = getFromStorage<DailyHabit[]>(STORAGE_KEYS.HABITS, []);
    const habit = all.find(h => h.id === habitId && h.userId === userId);
    if (habit) {
      if (habit.completedDays.includes(date)) {
        habit.completedDays = habit.completedDays.filter(d => d !== date);
      } else {
        habit.completedDays.push(date);
        this.addCredits(userId, 5, `Completed Habit: ${habit.title}`);
      }
      setToStorage(STORAGE_KEYS.HABITS, all);
    }
  },

  // Credits
  getCredits(userId: string): { total: number; history: SanCreditRecord[] } {
    const all = getFromStorage<SanCreditRecord[]>(STORAGE_KEYS.CREDITS, []);
    const userCreds = all.filter(c => c.userId === userId);
    const total = userCreds.reduce((sum, c) => sum + c.amount, 0);
    return { total, history: userCreds };
  },

  addCredits(userId: string, amount: number, action: string): void {
    const all = getFromStorage<SanCreditRecord[]>(STORAGE_KEYS.CREDITS, []);
    all.unshift({
      id: 'cred_' + Date.now(),
      userId,
      amount,
      action,
      timestamp: new Date().toISOString(),
    });
    setToStorage(STORAGE_KEYS.CREDITS, all);

    try {
      supabaseDbService.addActivityRecord(userId, amount, action).catch(() => {});
    } catch (e) {}
  },

  // RAVANA MIND
  getRavanaMindAnalyses(userId: string): RavanaMindAnalysis[] {
    const all = getFromStorage<RavanaMindAnalysis[]>(STORAGE_KEYS.RAVANA_MIND, []);
    return all.filter(r => r.userId === userId);
  },

  saveRavanaMindAnalysis(analysis: RavanaMindAnalysis): void {
    const all = getFromStorage<RavanaMindAnalysis[]>(STORAGE_KEYS.RAVANA_MIND, []);
    all.unshift(analysis);
    setToStorage(STORAGE_KEYS.RAVANA_MIND, all);
    this.addCredits(analysis.userId, 25, 'Conducted Multi-Perspective Problem Decomposition in RAVANA MIND');
  },

  // SAN R10 Conversations & Explicit Memory
  getConversations(userId: string): ConversationSession[] {
    const all = getFromStorage<ConversationSession[]>(STORAGE_KEYS.CONVERSATIONS, []);
    return all.filter(c => c.userId === userId);
  },

  saveConversation(session: ConversationSession): void {
    const all = getFromStorage<ConversationSession[]>(STORAGE_KEYS.CONVERSATIONS, []);
    const idx = all.findIndex(c => c.id === session.id);
    if (idx !== -1) {
      all[idx] = session;
    } else {
      all.unshift(session);
    }
    setToStorage(STORAGE_KEYS.CONVERSATIONS, all);
  },

  deleteConversation(sessionId: string): void {
    const all = getFromStorage<ConversationSession[]>(STORAGE_KEYS.CONVERSATIONS, []);
    setToStorage(STORAGE_KEYS.CONVERSATIONS, all.filter(c => c.id !== sessionId));
  },

  getUserMemories(userId: string): ExplicitUserMemory[] {
    const all = getFromStorage<ExplicitUserMemory[]>(STORAGE_KEYS.EXPLICIT_MEMORY, []);
    return all.filter(m => m.userId === userId);
  },

  addExplicitMemory(userId: string, topic: string, content: string): ExplicitUserMemory {
    const all = getFromStorage<ExplicitUserMemory[]>(STORAGE_KEYS.EXPLICIT_MEMORY, []);
    const newMem: ExplicitUserMemory = {
      id: 'mem_' + Date.now(),
      userId,
      topic,
      content,
      isApproved: true,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newMem);
    setToStorage(STORAGE_KEYS.EXPLICIT_MEMORY, all);
    return newMem;
  },

  deleteExplicitMemory(memoryId: string): void {
    const all = getFromStorage<ExplicitUserMemory[]>(STORAGE_KEYS.EXPLICIT_MEMORY, []);
    setToStorage(STORAGE_KEYS.EXPLICIT_MEMORY, all.filter(m => m.id !== memoryId));
  },

  // CHAKRA Sessions & Wellness Journal
  getChakraSessions(userId: string): ChakraSession[] {
    const all = getFromStorage<ChakraSession[]>(STORAGE_KEYS.CHAKRA_SESSIONS, []);
    return all.filter(cs => cs.userId === userId);
  },

  saveChakraSession(session: ChakraSession): void {
    const all = getFromStorage<ChakraSession[]>(STORAGE_KEYS.CHAKRA_SESSIONS, []);
    all.unshift(session);
    setToStorage(STORAGE_KEYS.CHAKRA_SESSIONS, all);
    this.addCredits(session.userId, 15, `Completed Chakra Mindfulness Session`);
  },

  getWellnessEntries(userId: string): WellnessJournalEntry[] {
    const all = getFromStorage<WellnessJournalEntry[]>(STORAGE_KEYS.WELLNESS_JOURNAL, []);
    return all.filter(w => w.userId === userId);
  },

  saveWellnessEntry(entry: WellnessJournalEntry): void {
    const all = getFromStorage<WellnessJournalEntry[]>(STORAGE_KEYS.WELLNESS_JOURNAL, []);
    all.unshift(entry);
    setToStorage(STORAGE_KEYS.WELLNESS_JOURNAL, all);
  },

  deleteWellnessEntry(entryId: string): void {
    const all = getFromStorage<WellnessJournalEntry[]>(STORAGE_KEYS.WELLNESS_JOURNAL, []);
    setToStorage(STORAGE_KEYS.WELLNESS_JOURNAL, all.filter(w => w.id !== entryId));
  },

  // Roadmaps
  getRoadmaps(userId: string): MultilingualRoadmap[] {
    const all = getFromStorage<MultilingualRoadmap[]>(STORAGE_KEYS.ROADMAPS, []);
    return all.filter(r => r.userId === userId);
  },

  saveRoadmap(roadmap: MultilingualRoadmap): void {
    const all = getFromStorage<MultilingualRoadmap[]>(STORAGE_KEYS.ROADMAPS, []);
    all.unshift(roadmap);
    setToStorage(STORAGE_KEYS.ROADMAPS, all);

    try {
      supabaseDbService.saveRoadmap(roadmap).catch(() => {});
    } catch (e) {}
  },

  deleteRoadmap(roadmapId: string): void {
    const all = getFromStorage<MultilingualRoadmap[]>(STORAGE_KEYS.ROADMAPS, []);
    setToStorage(STORAGE_KEYS.ROADMAPS, all.filter(r => r.id !== roadmapId));

    try {
      supabaseDbService.deleteRoadmap(roadmapId).catch(() => {});
    } catch (e) {}
  },

  // Admin Studio: Content Drafts & Publishing
  getContentDrafts(): ContentDraft[] {
    return getFromStorage<ContentDraft[]>(STORAGE_KEYS.ADMIN_DRAFTS, []);
  },

  saveContentDraft(draft: ContentDraft): void {
    const all = getFromStorage<ContentDraft[]>(STORAGE_KEYS.ADMIN_DRAFTS, []);
    const idx = all.findIndex(d => d.id === draft.id);
    if (idx !== -1) {
      all[idx] = draft;
    } else {
      all.unshift(draft);
    }
    setToStorage(STORAGE_KEYS.ADMIN_DRAFTS, all);
  },

  // Audit Logs
  getAuditLogs(): AuditLogEntry[] {
    return getFromStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  },

  recordAuditLog(actorId: string, actorEmail: string, actorRole: UserRole, action: string, resourceType: string, details?: string, resourceId?: string): void {
    const all = getFromStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const entry: AuditLogEntry = {
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actorId,
      actorEmail,
      actorRole,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: '127.0.0.1',
    };
    all.unshift(entry);
    if (all.length > 500) all.pop();
    setToStorage(STORAGE_KEYS.AUDIT_LOGS, all);
  },

  // Full Data Export with Formula Injection Sanitization
  exportUserData(userId: string): any {
    const user = this.getAccounts().find(a => a.id === userId);
    const profile = this.getProfile(userId);
    const progress = this.getProgress(userId);
    const notes = this.getNotes(userId);
    const bookmarks = this.getBookmarks(userId);
    const calendar = this.getCalendarEvents(userId);
    const habits = this.getDailyHabits(userId);
    const credits = this.getCredits(userId);
    const ravanaMind = this.getRavanaMindAnalyses(userId);
    const roadmaps = this.getRoadmaps(userId);
    const chakraSessions = this.getChakraSessions(userId);
    const wellness = this.getWellnessEntries(userId);
    const conversations = this.getConversations(userId);
    const memories = this.getUserMemories(userId);

    const safeUser = user ? { ...user, passwordHash: undefined } : null;

    return {
      metadata: {
        platform: 'DASASURYA',
        aiBrain: 'SAN R10',
        exportedAt: new Date().toISOString(),
        version: '10.0-production',
      },
      user: safeUser,
      profile,
      progress,
      notes,
      bookmarks,
      calendar,
      habits,
      credits,
      ravanaMind,
      roadmaps,
      chakraSessions,
      wellnessJournal: wellness,
      conversations,
      memories,
    };
  },

  deleteAccount(userId: string): void {
    setToStorage(STORAGE_KEYS.ACCOUNTS, this.getAccounts().filter(a => a.id !== userId));

    const profiles = getFromStorage<Record<string, UserProfile>>(STORAGE_KEYS.PROFILES, {});
    delete profiles[userId];
    setToStorage(STORAGE_KEYS.PROFILES, profiles);

    const progress = getFromStorage<Record<string, UserProgress>>(STORAGE_KEYS.PROGRESS, {});
    delete progress[userId];
    setToStorage(STORAGE_KEYS.PROGRESS, progress);

    setToStorage(STORAGE_KEYS.NOTES, getFromStorage<UserNote[]>(STORAGE_KEYS.NOTES, []).filter(n => n.userId !== userId));
    setToStorage(STORAGE_KEYS.BOOKMARKS, getFromStorage<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, []).filter(b => b.userId !== userId));
    setToStorage(STORAGE_KEYS.CALENDAR, getFromStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []).filter(c => c.userId !== userId));
    setToStorage(STORAGE_KEYS.HABITS, getFromStorage<DailyHabit[]>(STORAGE_KEYS.HABITS, []).filter(h => h.userId !== userId));
    setToStorage(STORAGE_KEYS.CREDITS, getFromStorage<SanCreditRecord[]>(STORAGE_KEYS.CREDITS, []).filter(cr => cr.userId !== userId));
    setToStorage(STORAGE_KEYS.RAVANA_MIND, getFromStorage<RavanaMindAnalysis[]>(STORAGE_KEYS.RAVANA_MIND, []).filter(r => r.userId !== userId));
    setToStorage(STORAGE_KEYS.ROADMAPS, getFromStorage<MultilingualRoadmap[]>(STORAGE_KEYS.ROADMAPS, []).filter(rm => rm.userId !== userId));
    setToStorage(STORAGE_KEYS.CHAKRA_SESSIONS, getFromStorage<ChakraSession[]>(STORAGE_KEYS.CHAKRA_SESSIONS, []).filter(cs => cs.userId !== userId));
    setToStorage(STORAGE_KEYS.WELLNESS_JOURNAL, getFromStorage<WellnessJournalEntry[]>(STORAGE_KEYS.WELLNESS_JOURNAL, []).filter(w => w.userId !== userId));
    setToStorage(STORAGE_KEYS.CONVERSATIONS, getFromStorage<ConversationSession[]>(STORAGE_KEYS.CONVERSATIONS, []).filter(c => c.userId !== userId));
    setToStorage(STORAGE_KEYS.EXPLICIT_MEMORY, getFromStorage<ExplicitUserMemory[]>(STORAGE_KEYS.EXPLICIT_MEMORY, []).filter(m => m.userId !== userId));

    if (this.getActiveUser()?.id === userId) {
      this.setActiveSession(null);
    }
  }
};
