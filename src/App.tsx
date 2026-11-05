import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { supabaseAuthService } from './services/supabaseAuthService';
import { supabaseDbService } from './services/supabaseDbService';
import { Bookmark, UserAccount, UserNote, UserProfile, UserProgress } from './types';

// Layout & Public Components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/public/LandingPage';

// Auth & Onboarding Components
import { AuthModal } from './components/auth/AuthModal';
import { ProfileSetupModal } from './components/onboarding/ProfileSetupModal';

// App Core Components
import { PersonalDashboard } from './components/dashboard/PersonalDashboard';
import { CurriculumExplorer } from './components/curriculum/CurriculumExplorer';
import { TextbookReader } from './components/reader/TextbookReader';
import { MyDayArchitecture } from './components/myday/MyDayArchitecture';
import { RavanaMindEngine } from './components/ravanamind/RavanaMindEngine';
import { MasteryRoadmap } from './components/roadmap/MasteryRoadmap';
import { LearningCalendar } from './components/calendar/LearningCalendar';
import { SanCreditsView } from './components/credits/SanCreditsView';
import { UserProfileView } from './components/profile/UserProfileView';
import { ChakraAlignmentModule } from './components/chakra/ChakraAlignmentModule';
import { ParentalControlsDashboard } from './components/parental/ParentalControlsDashboard';
import { SecurityPrivacyModule } from './components/security/SecurityPrivacyModule';

// Modals
import { DasasuryaMentorModal } from './components/dasasurya/DasasuryaMentorModal';
import { DailyBriefingModal } from './components/briefing/DailyBriefingModal';
import { AdminCurriculumConsole } from './components/admin/AdminCurriculumConsole';
import { SettingsModal } from './components/settings/SettingsModal';

export default function App() {
  // Authentication & Profile State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [credits, setCredits] = useState<number>(0);

  // Active View Routing
  const [activeView, setActiveView] = useState<string>('home');
  const [activeChapterId, setActiveChapterId] = useState<string>('chap-01-first-principles');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [dasasuryaOpen, setDasasuryaOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dasasuryaContext, setDasasuryaContext] = useState<{
    question?: string;
    concept?: string;
    currentHead?: string;
    codeSnippet?: string;
  } | undefined>(undefined);
  const [dailyBriefOpen, setDailyBriefOpen] = useState(false);
  const [adminConsoleOpen, setAdminConsoleOpen] = useState(false);

  // Load existing session on mount with Supabase synchronization
  useEffect(() => {
    async function initSession() {
      // 1. Check Supabase authenticated session
      if (supabaseAuthService.isConfigured()) {
        try {
          const { session } = await supabaseAuthService.getSession();
          if (session?.user) {
            const supUser = session.user;
            const cloudProfile = await supabaseDbService.getProfile(supUser.id);
            const cloudProgress = await supabaseDbService.getProgress(supUser.id);

            let account = storageService.getAccounts().find(a => 
              a.id === supUser.id || 
              (supUser.email && a.email.toLowerCase() === supUser.email.toLowerCase())
            );

            if (!account) {
              const meta = supUser.user_metadata || {};
              account = {
                id: supUser.id,
                fullName: cloudProfile?.fullName || meta.full_name || 'Learner',
                username: cloudProfile?.username || meta.username || supUser.email?.split('@')[0] || 'learner',
                email: supUser.email || '',
                phone: supUser.phone || meta.phone,
                verificationChannel: supUser.phone ? 'phone' : 'email',
                isVerified: true,
                verifiedAt: supUser.confirmed_at || new Date().toISOString(),
                dateOfBirth: cloudProfile?.dateOfBirth || meta.date_of_birth || '2000-01-01',
                age: cloudProfile?.age || 20,
                isUnder12: Boolean(cloudProfile?.isUnder12),
                isMinor: (cloudProfile?.age || 20) < 18,
                passwordHash: '',
                role: (cloudProfile?.role as any) || 'learner',
                consentRecords: [],
                languagePreferences: cloudProfile?.languagePreferences || {
                  interfaceLanguage: 'en',
                  responseLanguage: 'en',
                  learningLanguage: 'en',
                },
                createdAt: supUser.created_at || new Date().toISOString(),
              };
              storageService.saveAccount(account);
            } else {
              account.id = supUser.id;
              storageService.saveAccount(account);
            }

            if (cloudProfile) {
              storageService.saveProfile(cloudProfile);
            }

            storageService.setActiveSession(account.id);
            setCurrentUser(account);
            setCurrentProfile(cloudProfile || storageService.getProfile(account.id));
            refreshUserData(account.id);
            setActiveView('dashboard');
            return;
          }
        } catch (e) {
          console.warn('Supabase session initialization note:', e);
        }
      }

      // 2. Fallback to local session
      const user = storageService.getActiveUser();
      if (user) {
        setCurrentUser(user);
        const prof = storageService.getProfile(user.id);
        setCurrentProfile(prof);
        refreshUserData(user.id);
        setActiveView('dashboard');
      }
    }

    initSession();

    // Subscribe to auth state transitions
    const { data: authListener } = supabaseAuthService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        storageService.signOut();
        setCurrentUser(null);
        setCurrentProfile(null);
        setUserProgress(null);
        setBookmarks([]);
        setNotes([]);
        setCredits(0);
        setActiveView('home');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const refreshUserData = (userId: string) => {
    const prog = storageService.getProgress(userId);
    setUserProgress(prog);
    setBookmarks(storageService.getBookmarks(userId));
    setNotes(storageService.getNotes(userId));
    const creds = storageService.getCredits(userId);
    setCredits(creds.total);
  };

  const handleAuthSuccess = (user: UserAccount, isNewRegistration: boolean) => {
    setCurrentUser(user);
    const prof = storageService.getProfile(user.id);
    setCurrentProfile(prof);
    refreshUserData(user.id);
    setAuthModalOpen(false);

    if (isNewRegistration) {
      setOnboardingOpen(true);
    } else {
      setActiveView('dashboard');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseAuthService.signOut();
    } catch (e) {}
    storageService.signOut();
    setCurrentUser(null);
    setCurrentProfile(null);
    setUserProgress(null);
    setBookmarks([]);
    setNotes([]);
    setCredits(0);
    setActiveView('home');
  };

  const handleOpenChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setActiveView('reader');
  };

  const handleOpenDasasuryaWithContext = (context: {
    question?: string;
    concept?: string;
    currentHead?: string;
    codeSnippet?: string;
  }) => {
    setDasasuryaContext(context);
    setDasasuryaOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 flex flex-col font-sans selection:bg-violet-600/40 selection:text-white">
      
      {/* 3-Zone Navigation Header */}
      {activeView !== 'reader' && (
        <Navbar
          user={currentUser}
          profile={currentProfile}
          credits={credits}
          activeView={activeView}
          onNavigate={(view) => {
            const publicViews = ['home', 'tenheads', 'methodology', 'faq'];
            if (!currentUser && !publicViews.includes(view)) {
              setAuthMode('signin');
              setAuthModalOpen(true);
              return;
            }
            if (view === 'home' && currentUser) {
              setActiveView('dashboard');
            } else {
              setActiveView(view);
            }
          }}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthModalOpen(true);
          }}
          onSignOut={handleSignOut}
          onOpenDailyBrief={() => setDailyBriefOpen(true)}
          onOpenDasasurya={() => {
            setDasasuryaContext(undefined);
            setDasasuryaOpen(true);
          }}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />
      )}

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        
        {/* Public Landing Page */}
        {(activeView === 'home' || activeView === 'tenheads' || activeView === 'methodology' || activeView === 'faq') && !currentUser && (
          <LandingPage
            onOpenAuth={(mode) => {
              setAuthMode(mode);
              setAuthModalOpen(true);
            }}
            onExploreHead={(headId) => {
              setAuthMode('register');
              setAuthModalOpen(true);
            }}
          />
        )}

        {/* Authenticated Dashboard */}
        {activeView === 'dashboard' && currentUser && userProgress && (
          <PersonalDashboard
            user={currentUser}
            profile={currentProfile}
            progress={userProgress}
            bookmarks={bookmarks}
            notes={notes}
            credits={credits}
            onOpenChapter={handleOpenChapter}
            onNavigate={(view) => setActiveView(view)}
            onOpenDasasurya={() => {
              setDasasuryaContext(undefined);
              setDasasuryaOpen(true);
            }}
            onOpenRavanaMind={() => setActiveView('ravanamind')}
          />
        )}

        {/* Curriculum Explorer */}
        {activeView === 'learn' && currentUser && (
          <CurriculumExplorer
            user={currentUser}
            onSelectChapter={handleOpenChapter}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* Book-Style Digital Reader (THE CORE FEATURE) */}
        {activeView === 'reader' && currentUser && (
          <TextbookReader
            initialChapterId={activeChapterId}
            user={currentUser}
            onOpenDasasuryaWithContext={handleOpenDasasuryaWithContext}
            onNavigateBack={() => {
              refreshUserData(currentUser.id);
              setActiveView('dashboard');
            }}
          />
        )}

        {/* My Day (Calm Sustainable Architecture) */}
        {activeView === 'myday' && currentUser && userProgress && (
          <MyDayArchitecture
            user={currentUser}
            profile={currentProfile}
            progress={userProgress}
            onOpenChapter={handleOpenChapter}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* Ravana Mind (Multi-Perspective Analytical Matrix) */}
        {activeView === 'ravanamind' && currentUser && (
          <RavanaMindEngine
            user={currentUser}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* Mastery Roadmap */}
        {activeView === 'roadmap' && currentUser && userProgress && (
          <MasteryRoadmap
            user={currentUser}
            profile={currentProfile}
            progress={userProgress}
            onSelectChapter={handleOpenChapter}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* Integrated Learning Calendar */}
        {activeView === 'calendar' && currentUser && (
          <LearningCalendar
            user={currentUser}
            onOpenChapter={handleOpenChapter}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* SAN Credits & Ethical Progression */}
        {activeView === 'credits' && currentUser && (
          <SanCreditsView
            user={currentUser}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* User Profile & Journal */}
        {activeView === 'profile' && currentUser && currentProfile && userProgress && (
          <UserProfileView
            user={currentUser}
            profile={currentProfile}
            progress={userProgress}
            bookmarks={bookmarks}
            notes={notes}
            credits={credits}
            onUpdateProfile={(updated) => {
              setCurrentProfile(updated);
              storageService.saveProfile(updated);
            }}
            onOpenChapter={handleOpenChapter}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* CHAKRA Alignment Module (Head 03 & Vitality Centers) */}
        {activeView === 'chakra' && currentUser && (
          <ChakraAlignmentModule
            user={currentUser}
            profile={currentProfile}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* Child Safety & Parental Authorization Controls */}
        {activeView === 'parental' && currentUser && (
          <ParentalControlsDashboard
            user={currentUser}
            profile={currentProfile}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              storageService.saveAccount(updatedUser);
            }}
            onAccountDeleted={handleSignOut}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {/* Security, Privacy & Independent Language Preferences */}
        {activeView === 'security' && currentUser && (
          <SecurityPrivacyModule
            user={currentUser}
            profile={currentProfile}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              storageService.saveAccount(updatedUser);
            }}
            onAccountDeleted={handleSignOut}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

      </div>

      {/* Footer (Quiet, ethical notices, discreet curator link) */}
      {activeView !== 'reader' && (
        <Footer
          onNavigate={(view) => setActiveView(view)}
          onOpenAdmin={() => setAdminConsoleOpen(true)}
        />
      )}

      {/* Auth Modal (Real Registration & Sign In, NO demo buttons) */}
      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />

      {/* Guided Profile Onboarding Modal */}
      {currentUser && (
        <ProfileSetupModal
          user={currentUser}
          isOpen={onboardingOpen}
          onComplete={(profile) => {
            setCurrentProfile(profile);
            setOnboardingOpen(false);
            refreshUserData(currentUser.id);
            setActiveView('dashboard');
          }}
        />
      )}

      {/* Dasasurya Socratic Mentor Modal */}
      {currentUser && userProgress && (
        <DasasuryaMentorModal
          isOpen={dasasuryaOpen}
          onClose={() => setDasasuryaOpen(false)}
          user={currentUser}
          profile={currentProfile}
          progress={userProgress}
          context={dasasuryaContext}
        />
      )}

      {/* Daily Briefing Modal */}
      <DailyBriefingModal
        isOpen={dailyBriefOpen}
        onClose={() => setDailyBriefOpen(false)}
        userInterests={currentProfile?.interests || []}
      />

      {/* Curator Administration Portal (Separated from normal flow) */}
      {adminConsoleOpen && (
        <AdminCurriculumConsole
          onClose={() => setAdminConsoleOpen(false)}
        />
      )}

      {/* Global Language & Preferences Settings Modal */}
      {currentUser && (
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          user={currentUser}
          profile={currentProfile}
          onUpdateUser={(updatedUser) => {
            setCurrentUser(updatedUser);
            storageService.saveAccount(updatedUser);
          }}
        />
      )}

    </div>
  );
}
