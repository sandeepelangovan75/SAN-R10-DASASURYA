import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  UserProfile, 
  UserProgress, 
  MultilingualRoadmap, 
  SanCreditRecord, 
  LanguagePreferences 
} from '../types';

export const supabaseDbService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  // --------------------------------------------------------------------------
  // PROFILES TABLE
  // --------------------------------------------------------------------------
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!this.isConfigured() || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // If table doesn't exist yet, return null without throwing
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.info('Supabase: "profiles" table does not exist yet. Please execute supabase_schema.sql.');
        } else {
          console.warn('Error fetching Supabase profile:', error.message);
        }
        return null;
      }

      if (!data) return null;

      const profile: UserProfile = {
        id: data.id,
        userId: data.id,
        fullName: data.full_name || '',
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || undefined,
        bio: data.bio || '',
        avatarUrl: data.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${data.username || 'user'}`,
        interests: Array.isArray(data.interests) ? data.interests : ['Knowledge', 'Wellness', 'Strategy'],
        preferredHeads: Array.isArray(data.preferred_heads) ? data.preferred_heads : ['head-01-knowledge'],
        learningGoals: data.learning_goals || '',
        skillLevel: data.skill_level || 'Foundational',
        preferredSchedule: data.preferred_schedule || '30 mins/day',
        dateOfBirth: data.date_of_birth || undefined,
        age: data.age || undefined,
        isUnder12: Boolean(data.is_under_12),
        role: data.role || 'learner',
        languagePreferences: data.language_preferences || {
          interfaceLanguage: 'en',
          responseLanguage: 'en',
          learningLanguage: 'en',
        },
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
      };

      return profile;
    } catch (err: any) {
      console.warn('Supabase getProfile exception:', err);
      return null;
    }
  },

  async upsertProfile(profile: Partial<UserProfile> & { userId: string }): Promise<boolean> {
    if (!this.isConfigured() || !profile.userId) return false;

    const payload = {
      id: profile.userId,
      full_name: profile.fullName,
      username: profile.username?.toLowerCase(),
      email: profile.email?.toLowerCase(),
      phone: profile.phone,
      bio: profile.bio,
      avatar_url: profile.avatarUrl,
      date_of_birth: profile.dateOfBirth,
      age: profile.age,
      is_under_12: profile.isUnder12,
      role: profile.role || 'learner',
      interests: profile.interests,
      preferred_heads: profile.preferredHeads,
      learning_goals: profile.learningGoals,
      skill_level: profile.skillLevel,
      preferred_schedule: profile.preferredSchedule,
      language_preferences: profile.languagePreferences,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.info('Supabase: "profiles" table not yet created.');
        } else {
          console.warn('Error saving Supabase profile:', error.message);
        }
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertProfile exception:', err);
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // LEARNING PROGRESS TABLE
  // --------------------------------------------------------------------------
  async getProgress(userId: string): Promise<UserProgress | null> {
    if (!this.isConfigured() || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      const progress: UserProgress = {
        userId: data.user_id,
        chapterProgress: data.chapter_progress || {},
        lastActiveChapterId: data.last_active_chapter_id || 'chap-01-first-principles',
        lastActiveHeadId: data.last_active_head_id || 'head-01-knowledge',
        streakDays: data.streak_days || 1,
        lastActiveDate: data.last_active_date || new Date().toISOString().split('T')[0],
        totalReadingMinutes: data.total_reading_minutes || 0,
      };

      return progress;
    } catch (err) {
      return null;
    }
  },

  async upsertProgress(progress: UserProgress): Promise<boolean> {
    if (!this.isConfigured() || !progress.userId) return false;

    try {
      const { error } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: progress.userId,
          chapter_progress: progress.chapterProgress,
          last_active_chapter_id: progress.lastActiveChapterId,
          last_active_head_id: progress.lastActiveHeadId,
          streak_days: progress.streakDays,
          last_active_date: progress.lastActiveDate,
          total_reading_minutes: progress.totalReadingMinutes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // LEARNING ROADMAPS TABLE
  // --------------------------------------------------------------------------
  async getRoadmaps(userId: string): Promise<MultilingualRoadmap[]> {
    if (!this.isConfigured() || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('learning_roadmaps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        goal: d.goal,
        targetLanguage: d.target_language,
        explanationLevel: d.explanation_level,
        currentKnowledge: d.current_knowledge,
        availableMinutesPerDay: d.available_minutes_per_day,
        targetDeadlineWeeks: d.target_deadline_weeks,
        isAgeAppropriate: d.is_age_appropriate,
        stages: d.stages || [],
        createdAt: d.created_at,
      }));
    } catch (err) {
      return [];
    }
  },

  async saveRoadmap(roadmap: MultilingualRoadmap): Promise<boolean> {
    if (!this.isConfigured() || !roadmap.userId) return false;

    try {
      const { error } = await supabase
        .from('learning_roadmaps')
        .upsert({
          id: roadmap.id,
          user_id: roadmap.userId,
          goal: roadmap.goal,
          target_language: roadmap.targetLanguage,
          explanation_level: roadmap.explanationLevel,
          current_knowledge: roadmap.currentKnowledge,
          available_minutes_per_day: roadmap.availableMinutesPerDay,
          target_deadline_weeks: roadmap.targetDeadlineWeeks,
          is_age_appropriate: roadmap.isAgeAppropriate,
          stages: roadmap.stages,
          created_at: roadmap.createdAt,
        }, { onConflict: 'id' });

      return !error;
    } catch (err) {
      return false;
    }
  },

  async deleteRoadmap(roadmapId: string): Promise<boolean> {
    if (!this.isConfigured() || !roadmapId) return false;

    try {
      const { error } = await supabase
        .from('learning_roadmaps')
        .delete()
        .eq('id', roadmapId);

      return !error;
    } catch (err) {
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // USER PREFERENCES & SETTINGS
  // --------------------------------------------------------------------------
  async saveUserPreferences(userId: string, prefs: LanguagePreferences): Promise<boolean> {
    if (!this.isConfigured() || !userId) return false;

    try {
      // Upsert into user_preferences table and update profiles table
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          interface_language: prefs.interfaceLanguage,
          response_language: prefs.responseLanguage,
          learning_language: prefs.learningLanguage,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      await supabase
        .from('profiles')
        .update({ language_preferences: prefs, updated_at: new Date().toISOString() })
        .eq('id', userId);

      return !error;
    } catch (err) {
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // LEARNING ACTIVITY HISTORY & CREDITS
  // --------------------------------------------------------------------------
  async addActivityRecord(userId: string, amount: number, action: string): Promise<boolean> {
    if (!this.isConfigured() || !userId) return false;

    try {
      const { error } = await supabase
        .from('activity_history')
        .insert({
          id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          user_id: userId,
          amount,
          action,
          created_at: new Date().toISOString(),
        });

      return !error;
    } catch (err) {
      return false;
    }
  },

  async getActivityRecords(userId: string): Promise<SanCreditRecord[]> {
    if (!this.isConfigured() || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('activity_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        amount: d.amount,
        action: d.action,
        timestamp: d.created_at,
      }));
    } catch (err) {
      return [];
    }
  },
};
