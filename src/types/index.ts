// =============================================================
// DASASURYA — SAN R10 MASTER DATA TYPES
// 10-Head Adaptive Intelligence & Life Architecture System
// =============================================================

export type HeadId = 
  // Canonical Section 3 Head IDs
  | 'head-01-knowledge'
  | 'head-02-language'
  | 'head-03-music'
  | 'head-04-wellness'
  | 'head-05-strategy'
  | 'head-06-vision'
  | 'head-07-voice'
  | 'head-08-astronomy'
  | 'head-09-traditional-knowledge'
  | 'head-10-governance'
  // Backward-compatible aliases
  | 'head-01-knowledge-logic'
  | 'head-02-wealth-creation'
  | 'head-03-vitality'
  | 'head-04-critical-mind'
  | 'head-05-strategy-governance'
  | 'head-06-creative-arts'
  | 'head-07-emotional-mastery'
  | 'head-08-communication'
  | 'head-09-universal-sciences'
  | 'head-10-automation-systems';

// -------------------------------------------------------------
// SAN R10 10-COORDINATED MODES
// -------------------------------------------------------------
export type SanR10Mode =
  | 'learning'      // 1. Learning mode: teaches concepts step by step and adapts
  | 'reasoning'     // 2. Reasoning mode: examines perspectives, assumptions, trade-offs
  | 'technical'     // 3. Technical mode: programming, debugging, architecture, research
  | 'planning'      // 4. Planning mode: goals, schedules, priorities, milestones
  | 'reflection'    // 5. Reflection mode: reviews progress, decisions, learning
  | 'conversation'  // 6. Conversation mode: natural, friendly, context-aware
  | 'voice'         // 7. Voice mode: speech input & spoken responses
  | 'knowledge'     // 8. Knowledge mode: searches authorized documents with citations
  | 'action'        // 9. Action mode: performs authorized operations through tools
  | 'adaptive';     // 10. Adaptive mode: adjusts depth, tone, examples to user level

// -------------------------------------------------------------
// ROLE HIERARCHY
// Core Admin (highest authority), Admin (manager), Learner (user)
// -------------------------------------------------------------
export type UserRole = 'core_admin' | 'admin' | 'learner' | 'curator_admin';

// -------------------------------------------------------------
// MULTILINGUAL TYPES
// -------------------------------------------------------------
export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'hi'
  | 'ta'
  | 'te'
  | 'bn'
  | 'zh'
  | 'ja'
  | 'ar'
  | 'pt'
  | 'ru'
  | 'it'
  | 'ko'
  | 'sa';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction?: 'ltr' | 'rtl';
}

export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LanguagePreferences {
  interfaceLanguage: LanguageCode;
  responseLanguage: LanguageCode;
  learningLanguage: LanguageCode;
}

export interface RoadmapStage {
  stageNumber: number;
  title: string;
  topics: string[];
  milestone: string;
  practiceTask: string;
  assessmentQuestion: string;
}

export interface MultilingualRoadmap {
  id: string;
  userId: string;
  goal: string;
  targetLanguage: LanguageCode;
  explanationLevel: ExplanationLevel;
  currentKnowledge: string;
  availableMinutesPerDay: number;
  targetDeadlineWeeks: number;
  isAgeAppropriate: boolean;
  stages: RoadmapStage[];
  createdAt: string;
}

// -------------------------------------------------------------
// VERIFICATION, AGE & PARENTAL TYPES
// -------------------------------------------------------------
export type VerificationChannel = 'email' | 'phone';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface ParentalConsentRecord {
  required: boolean;
  authorized: boolean;
  parentName?: string;
  parentContact?: string;
  authorizedAt?: string;
  consentMethod?: 'email_authorization' | 'digital_signature' | 'parental_pin';
  passcodePin?: string;
  maxDailyMinutes: number;
  allowedFeatures: {
    externalLinks: boolean;
    publicSharing: boolean;
    advancedChakra: boolean;
    unguidedChat: boolean;
  };
}

export interface ConsentRecord {
  policyVersion: string;
  consentedAt: string;
  withdrawnAt?: string;
  types: string[]; // e.g. ['terms', 'privacy', 'age_policy', 'data_retention']
}

// -------------------------------------------------------------
// CHAKRA & WELLNESS MODULE TYPES
// -------------------------------------------------------------
export type ChakraId =
  | 'muladhara'
  | 'svadhisthana'
  | 'manipura'
  | 'anahata'
  | 'vishuddha'
  | 'ajna'
  | 'sahasrara';

export interface ChakraInfo {
  id: ChakraId;
  name: string;
  sanskritName: string;
  translation: string;
  element: string;
  traditionalTheme: string;
  symbolism: string;
  traditionalColor: string;
  hexColor: string;
  scientificDistinction: string;
  gentlePractice: string;
  childSafePractice: string;
  reflectionThemes: string[];
}

export type ChakraGuidanceStyle = 'gentle-breathing' | 'mindful-focus' | 'silent-contemplation';

export interface ChakraSession {
  id: string;
  userId: string;
  chakraId: ChakraId;
  durationMinutes: number;
  guidanceStyle: ChakraGuidanceStyle;
  language: LanguageCode;
  completedDurationSeconds: number;
  completed: boolean;
  terminatedEarly: boolean;
  date: string;
  reflectionNote?: string;
}

export interface WellnessJournalEntry {
  id: string;
  userId: string;
  chakraId?: ChakraId;
  chakraName?: string;
  focusRating: number; // 1 to 5
  calmnessRating: number; // 1 to 5
  voluntaryReflection: string;
  date: string;
  private: boolean;
}

// -------------------------------------------------------------
// 10 HEAD PILLARS
// -------------------------------------------------------------
export interface HeadPillar {
  id: HeadId;
  number: number;
  romanNumeral: string;
  name: string;
  tagline: string;
  focusAreas: string[];
  light: string;
  shadow: string;
  selfCorrection: string;
  accentColor: string;
  accentBorder: string;
  iconName: string;
  description: string;
}

export interface SectionContent {
  id: string;
  title: string;
  content: string; // Markdown or rich formatted text
  keyDefinition?: {
    term: string;
    definition: string;
  };
  analogy?: string;
  diagramType?: 'flow' | 'matrix' | 'spectrum' | 'cycles';
  diagramData?: any;
  commonMistakes?: string[];
  codeSnippet?: {
    language: string;
    code: string;
    explanation: string;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptHint: string;
}

export interface PracticeExercise {
  id: string;
  title: string;
  prompt: string;
  starterContent?: string;
  rubric: string[];
  suggestedSolution: string;
}

export interface RealWorldApplication {
  id: string;
  title: string;
  scenario: string;
  deliverablePrompt: string;
  evaluationChecklist: string[];
}

export interface Chapter {
  id: string;
  moduleId: string;
  headId: HeadId;
  order: number;
  title: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  sections: SectionContent[];
  pillarAlignment: {
    light: string;
    shadow: string;
    selfCorrection: string;
  };
  summary: string[];
  quiz: QuizQuestion[];
  practice: PracticeExercise;
  realWorldApplication: RealWorldApplication;
  reflectionPrompt: string;
}

export interface Module {
  id: string;
  courseId: string;
  headId: HeadId;
  order: number;
  title: string;
  description: string;
  chapters: Chapter[];
}

export interface Course {
  id: string;
  headId: HeadId;
  title: string;
  subtitle: string;
  description: string;
  level: 'Foundational' | 'Beginner' | 'Intermediate' | 'Advanced';
  modules: Module[];
}

// -------------------------------------------------------------
// USER PROGRESS & HABITS
// -------------------------------------------------------------
export interface ChapterProgressRecord {
  readingProgress: number; // 0-100%
  isCompleted: boolean;
  completedAt?: string;
  quizScore?: number;
  quizCompleted: boolean;
  practiceCompleted: boolean;
  practiceSubmission?: string;
  applicationCompleted: boolean;
  reflectionText?: string;
}

export interface UserProgress {
  userId: string;
  chapterProgress: Record<string, ChapterProgressRecord>;
  lastActiveChapterId?: string;
  lastActiveHeadId?: HeadId;
  streakDays: number;
  lastActiveDate: string;
  totalReadingMinutes: number;
}

export interface UserNote {
  id: string;
  userId: string;
  chapterId: string;
  chapterTitle: string;
  headId: HeadId;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  chapterId: string;
  chapterTitle: string;
  headId: HeadId;
  headName: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  type: 'learning' | 'practice' | 'review' | 'reflection' | 'vitality';
  date: string; // YYYY-MM-DD
  time?: string;
  chapterId?: string;
  isCompleted: boolean;
  isMissed?: boolean;
  notes?: string;
}

export interface DailyHabit {
  id: string;
  userId: string;
  title: string;
  headId: HeadId;
  targetPerWeek: number;
  completedDays: string[]; // YYYY-MM-DD list
  createdAt: string;
}

export interface SanCreditRecord {
  id: string;
  userId: string;
  amount: number;
  action: string;
  timestamp: string;
}

// -------------------------------------------------------------
// USER PROFILE & ACCOUNT
// -------------------------------------------------------------
export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  bio: string;
  avatarUrl: string;
  interests: string[];
  preferredHeads: HeadId[];
  learningGoals: string;
  skillLevel: 'Foundational' | 'Practitioner' | 'Advanced Architect';
  occupation?: string;
  studyCareerGoal?: string;
  preferredSchedule: '15 mins/day' | '30 mins/day' | '1 hour/day' | 'Deep Weekend Immersion';
  timeZone?: string;
  accessibilityPreferences?: {
    reducedMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    screenReaderOptimized: boolean;
  };
  dateOfBirth?: string;
  age?: number;
  isUnder12?: boolean;
  role?: UserRole;
  languagePreferences: LanguagePreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  verificationChannel: VerificationChannel;
  isVerified: boolean;
  verifiedAt?: string;
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  isUnder12: boolean;
  isMinor: boolean;
  passwordHash: string;
  role: UserRole;
  parentalConsent?: ParentalConsentRecord;
  consentRecords: ConsentRecord[];
  languagePreferences: LanguagePreferences;
  createdAt: string;
}

// -------------------------------------------------------------
// RAVANA MIND
// -------------------------------------------------------------
export interface RavanaMindAnalysis {
  id: string;
  userId: string;
  problem: string;
  userGoal?: string;
  facts?: string[];
  assumptions?: string[];
  unknowns?: string[];
  selectedHeads: HeadId[];
  analysisText: string;
  approaches?: {
    name: string;
    advantages: string[];
    risks: string[];
    tradeOffs: string;
  }[];
  actionPlan?: string[];
  userDecision?: string;
  reflectionNotes?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// SAN R10 CONVERSATIONS, MEMORY & TOOLS
// -------------------------------------------------------------
export interface ExplicitUserMemory {
  id: string;
  userId: string;
  topic: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
}

export interface AiToolAction {
  id: string;
  name: string;
  description: string;
  category: 'schedule' | 'task' | 'document' | 'export' | 'draft';
  requiresConfirmation: boolean;
  riskLevel: 'low' | 'consequential';
  permission: 'learner' | 'admin' | 'core_admin';
}

export interface AiActionExecution {
  id: string;
  toolId: string;
  toolName: string;
  params: Record<string, any>;
  status: 'pending_confirmation' | 'confirmed' | 'executed' | 'cancelled';
  result?: string;
  timestamp: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: SanR10Mode;
  timestamp: string;
  socraticLevel?: number;
  sources?: string[];
  actionExecution?: AiActionExecution;
}

export interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  mode: SanR10Mode;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// DOCUMENT INTELLIGENCE & KNOWLEDGE (RAG)
// -------------------------------------------------------------
export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  pageOrSection?: string;
}

export interface DocumentKnowledge {
  id: string;
  userId: string;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  content: string;
  chunks: DocumentChunk[];
  createdAt: string;
  isAuthorized: boolean;
}

// -------------------------------------------------------------
// ADMIN STUDIO & AUDIT TRAIL
// -------------------------------------------------------------
export interface ContentDraft {
  id: string;
  headId: HeadId;
  title: string;
  type: 'course' | 'chapter' | 'challenge' | 'roadmap';
  content: any;
  authorId: string;
  authorName: string;
  status: 'draft' | 'under_review' | 'approved' | 'published';
  createdAt: string;
  updatedAt: string;
  reviewerNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}
