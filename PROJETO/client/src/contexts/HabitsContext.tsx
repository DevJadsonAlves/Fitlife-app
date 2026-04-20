import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/audit";

// Types
export interface WaterEntry {
  id: string;
  amount: number; // ml
  time: string;
  date: string;
  created_at?: string;
}

export interface ExerciseSet {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  weight: number; // kg
}

export interface WorkoutEntry {
  id: string;
  exercises: ExerciseSet[];
  duration: number; // minutes
  date: string;
  time: string;
  created_at?: string;
}

export type MealType = "cafe" | "almoco" | "lanche" | "janta" | "snack";

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: MealType;
  date: string;
  time: string;
  created_at?: string;
}

export type FoodEntryInput = Omit<
  FoodEntry,
  "id" | "date" | "time" | "created_at"
> & {
  date?: string;
  time?: string;
};

export interface SavedMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: MealType;
  created_at?: string;
}

export type SavedMealInput = Omit<SavedMeal, "id" | "created_at">;

export type FoodLibrarySource = "custom" | "imported" | "curated" | "official";

export interface FoodServingOption {
  label: string;
  grams: number;
}

export interface FoodLibraryItem {
  id: string;
  name: string;
  brand?: string;
  servingLabel: string;
  servingGrams: number;
  servingOptions: FoodServingOption[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: FoodLibrarySource;
  barcode?: string;
  created_at?: string;
}

export type FoodLibraryInput = Omit<FoodLibraryItem, "id" | "created_at">;

export interface SleepEntry {
  id: string;
  bedtime: string;
  wakeup: string;
  quality: 1 | 2 | 3 | 4 | 5;
  duration: number; // hours
  notes: string;
  date: string;
  created_at?: string;
}

export interface WeightEntry {
  id: string;
  weight: number;
  bodyFat?: number;
  notes?: string;
  date: string;
  created_at?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  neck?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
  calf?: number;
  notes?: string;
  created_at?: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  url: string;
  storagePath?: string;
  weight?: number;
  note?: string;
  created_at?: string;
}

export interface FastingSession {
  id: string;
  startTime: string;
  endTime?: string;
  targetDuration: number; // hours
  isActive: boolean;
  created_at?: string;
}

export interface StartFastingInput {
  durationHours: number;
  startTime?: string;
}

export interface UpdateActiveFastingInput {
  durationHours?: number;
  startTime?: string;
}

export type CustomHabitType = "boolean" | "quantity" | "minutes" | "limit";
export type CustomHabitCategory =
  | "health"
  | "mind"
  | "discipline"
  | "study"
  | "selfcare"
  | "vice_control"
  | "social"
  | "productivity";
export type CustomHabitDifficulty = "easy" | "medium" | "hard";

export const CUSTOM_HABIT_CATEGORIES: Record<
  CustomHabitCategory,
  { label: string; color: string; icon: string }
> = {
  health: { label: "Saúde", color: "#22d3ee", icon: "💧" },
  mind: { label: "Mente", color: "#818cf8", icon: "🧠" },
  discipline: { label: "Disciplina", color: "#f97316", icon: "🔥" },
  study: { label: "Estudo", color: "#eab308", icon: "📚" },
  selfcare: { label: "Autocuidado", color: "#ec4899", icon: "✨" },
  vice_control: { label: "Vícios", color: "#ef4444", icon: "🛑" },
  social: { label: "Social", color: "#14b8a6", icon: "🤝" },
  productivity: { label: "Produtividade", color: "#84cc16", icon: "🎯" },
};

export const CUSTOM_HABIT_DIFFICULTIES: Record<
  CustomHabitDifficulty,
  { label: string; xpBase: number; description: string }
> = {
  easy: {
    label: "Leve",
    xpBase: 10,
    description: "Baixo atrito, bom para constância.",
  },
  medium: {
    label: "Média",
    xpBase: 20,
    description: "Exige foco real no dia.",
  },
  hard: {
    label: "Forte",
    xpBase: 35,
    description: "Para hábitos que cobram energia.",
  },
};

export function getSuggestedCustomHabitXp(
  difficulty: CustomHabitDifficulty,
  type: CustomHabitType,
  target: number
): number {
  const base = CUSTOM_HABIT_DIFFICULTIES[difficulty].xpBase;
  const typeBonus =
    type === "boolean"
      ? 0
      : type === "quantity"
        ? 3
        : type === "minutes"
          ? 5
          : 6;
  const targetBonus =
    type === "boolean" ? 0 : Math.min(10, Math.floor(Math.max(target, 0) / 10));

  return base + typeBonus + targetBonus;
}

export interface CustomHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: CustomHabitCategory;
  difficulty: CustomHabitDifficulty;
  type: CustomHabitType;
  target: number;
  unit?: string;
  xp: number;
  isActive: boolean;
  reminderEnabled: boolean;
  reminderTime?: string;
  created_at?: string;
}

export interface CustomHabitLog {
  id: string;
  habitId: string;
  value: number;
  date: string;
  created_at?: string;
}

export interface DailyGoals {
  water: number;
  waterGlasses: number;
  glassSize: number;
  workoutMinutes: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sleepHours: number;
  weightGoal: number;
}

export interface Streak {
  water: number;
  workout: number;
  food: number;
  sleep: number;
  weight: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  category:
    | "water"
    | "workout"
    | "food"
    | "sleep"
    | "weight"
    | "general"
    | "custom";
  requirement: string;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: "male" | "female";
  height: number;
  weight: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
}

export type NotificationFrequency = "light" | "normal" | "strong";
export type NotificationDay =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

export type NotificationTestType =
  | "water"
  | "meal"
  | "workout"
  | "fasting_start"
  | "fasting_phase"
  | "fasting_end"
  | "sleep"
  | "daily_summary";

export interface NotificationPreferences {
  enabled: boolean;
  waterEnabled: boolean;
  waterTime: string;
  mealEnabled: boolean;
  mealTime: string;
  workoutEnabled: boolean;
  workoutTime: string;
  fastingStartEnabled: boolean;
  fastingStartTime: string;
  fastingPhaseEnabled: boolean;
  fastingEndEnabled: boolean;
  sleepEnabled: boolean;
  sleepTime: string;
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  frequency: NotificationFrequency;
  activeDays: NotificationDay[];
}

export interface HabitsState {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  waterEntries: WaterEntry[];
  addWaterEntry: (amount: number) => void;
  removeLastWaterEntry: () => void;
  resetWaterToday: () => void;
  workoutEntries: WorkoutEntry[];
  addWorkoutEntry: (entry: Omit<WorkoutEntry, "id" | "date" | "time">) => void;
  removeWorkoutEntry: (id: string) => void;
  foodEntries: FoodEntry[];
  savedMeals: SavedMeal[];
  addFoodEntry: (entry: FoodEntryInput) => Promise<void>;
  removeFoodEntry: (id: string) => Promise<void>;
  addSavedMeal: (meal: SavedMealInput) => Promise<void>;
  removeSavedMeal: (id: string) => Promise<void>;
  foodLibrary: FoodLibraryItem[];
  addFoodLibraryItem: (item: FoodLibraryInput) => Promise<void>;
  removeFoodLibraryItem: (id: string) => Promise<void>;
  sleepEntries: SleepEntry[];
  addSleepEntry: (entry: Omit<SleepEntry, "id" | "date">) => void;
  removeSleepEntry: (id: string) => void;
  weightEntries: WeightEntry[];
  addWeightEntry: (weight: number, bodyFat?: number, notes?: string) => void;
  removeWeightEntry: (id: string) => void;
  bodyMeasurements: BodyMeasurement[];
  addBodyMeasurement: (
    measurement: Omit<BodyMeasurement, "id" | "created_at">
  ) => Promise<void>;
  removeBodyMeasurement: (id: string) => Promise<void>;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  goals: DailyGoals;
  setGoals: (goals: Partial<DailyGoals>) => void;
  calculateAutoGoals: (profile: UserProfile) => DailyGoals;
  streaks: Streak;
  achievements: Achievement[];
  resetAchievements: () => Promise<void>;
  resetAllData: () => Promise<void>;
  progressPhotos: ProgressPhoto[];
  addProgressPhoto: (photo: Omit<ProgressPhoto, "id">) => Promise<void>;
  removeProgressPhoto: (id: string) => Promise<void>;
  fastingSessions: FastingSession[];
  startFasting: (input: StartFastingInput) => Promise<void>;
  updateActiveFasting: (input: UpdateActiveFastingInput) => Promise<void>;
  endFasting: () => Promise<void>;
  removeFastingSession: (id: string) => Promise<void>;
  customHabits: CustomHabit[];
  customHabitLogs: CustomHabitLog[];
  addCustomHabit: (
    habit: Omit<CustomHabit, "id" | "created_at">
  ) => Promise<void>;
  updateCustomHabit: (
    id: string,
    habit: Partial<Omit<CustomHabit, "id" | "created_at">>
  ) => Promise<void>;
  removeCustomHabit: (id: string) => Promise<void>;
  setCustomHabitLog: (
    habitId: string,
    value: number,
    date?: Date
  ) => Promise<void>;
  removeCustomHabitLog: (habitId: string, date?: Date) => Promise<void>;
  getDayEntries: <T extends { date: string }>(entries: T[], date?: Date) => T[];
  getTodayWaterTotal: () => number;
  getTodayCalories: () => number;
  getTodayMacros: () => { protein: number; carbs: number; fat: number };
  getTodayWorkoutMinutes: () => number;
  getTodaySleep: () => SleepEntry | undefined;
  getProgressPercent: () => number;
  getCompletedHabits: () => number;
  getTotalHabits: () => number;
  xp: number;
  level: number;
  xpToNextLevel: number;
  requestNotificationPermission: () => Promise<boolean>;
  notificationPreferences: NotificationPreferences;
  setNotificationPreferences: (
    updates: Partial<NotificationPreferences>
  ) => Promise<void>;
  sendTestNotification: (type: NotificationTestType) => Promise<void>;
}

const HabitsContext = createContext<HabitsState | null>(null);

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTime(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getReferenceWeight(heightCm: number): number {
  const heightM = heightCm / 100;
  return 24.9 * heightM * heightM;
}

function getProteinGoal(profile: UserProfile): number {
  const bmi = profile.weight / (profile.height / 100) ** 2;
  const referenceWeight = getReferenceWeight(profile.height);

  let weightBase = profile.weight;
  if (bmi >= 30) {
    weightBase = referenceWeight + (profile.weight - referenceWeight) * 0.35;
  } else if (bmi >= 27) {
    weightBase = referenceWeight + (profile.weight - referenceWeight) * 0.5;
  }

  const multipliersByGoal: Record<
    UserProfile["goal"],
    Record<UserProfile["activityLevel"], number>
  > = {
    lose: {
      sedentary: 2,
      light: 2,
      moderate: 2.1,
      active: 2.2,
      very_active: 2.2,
    },
    maintain: {
      sedentary: 1.6,
      light: 1.7,
      moderate: 1.8,
      active: 1.9,
      very_active: 2,
    },
    gain: {
      sedentary: 1.8,
      light: 1.9,
      moderate: 2,
      active: 2.1,
      very_active: 2.2,
    },
  };

  const protein = Math.round(
    weightBase * multipliersByGoal[profile.goal][profile.activityLevel]
  );

  return clampNumber(protein, 90, 220);
}

const defaultGoals: DailyGoals = {
  water: 3000,
  waterGlasses: 6,
  glassSize: 500,
  workoutMinutes: 60,
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  sleepHours: 8,
  weightGoal: 75,
};

const defaultAchievements: Achievement[] = [
  {
    id: "a1",
    title: "Primeira Gota",
    description: "Beba seu primeiro copo de água",
    icon: "💧",
    unlocked: false,
    category: "water",
    requirement: "1 copo bebido",
  },
  {
    id: "a2",
    title: "Hidratação Constante",
    description: "Bata a meta de água por 7 dias seguidos",
    icon: "🌊",
    unlocked: false,
    category: "water",
    requirement: "7 dias de streak",
  },
  {
    id: "a3",
    title: "Oceano de Disciplina",
    description: "Bata a meta de água por 30 dias seguidos",
    icon: "🏊",
    unlocked: false,
    category: "water",
    requirement: "30 dias de streak",
  },
  {
    id: "a4",
    title: "Primeiro Treino",
    description: "Registre seu primeiro treino",
    icon: "💪",
    unlocked: false,
    category: "workout",
    requirement: "1 treino registrado",
  },
  {
    id: "a5",
    title: "Semana de Ferro",
    description: "Treine por 7 dias seguidos",
    icon: "🏋️",
    unlocked: false,
    category: "workout",
    requirement: "7 dias de streak",
  },
  {
    id: "a6",
    title: "Máquina de Treino",
    description: "Treine por 30 dias seguidos",
    icon: "🏅",
    unlocked: false,
    category: "workout",
    requirement: "30 dias de streak",
  },
  {
    id: "a7",
    title: "Centurião",
    description: "Complete 100 treinos no total",
    icon: "🎖️",
    unlocked: false,
    category: "workout",
    requirement: "100 treinos totais",
  },
  {
    id: "a8",
    title: "Primeira Refeição",
    description: "Registre sua primeira refeição",
    icon: "🥗",
    unlocked: false,
    category: "food",
    requirement: "1 refeição registrada",
  },
  {
    id: "a9",
    title: "Dieta Consistente",
    description: "Registre alimentação por 7 dias seguidos",
    icon: "👨‍🍳",
    unlocked: false,
    category: "food",
    requirement: "7 dias de streak",
  },
  {
    id: "a10",
    title: "Nutricionista Nato",
    description: "Registre alimentação por 30 dias seguidos",
    icon: "🏆",
    unlocked: false,
    category: "food",
    requirement: "30 dias de streak",
  },
  {
    id: "a11",
    title: "Boa Noite",
    description: "Registre sua primeira noite de sono",
    icon: "😴",
    unlocked: false,
    category: "sleep",
    requirement: "1 registro de sono",
  },
  {
    id: "a12",
    title: "Sono Regular",
    description: "Registre sono por 7 dias seguidos",
    icon: "🌙",
    unlocked: false,
    category: "sleep",
    requirement: "7 dias de streak",
  },
  {
    id: "a13",
    title: "Sono Perfeito",
    description: "Tenha 5 estrelas de qualidade 7 vezes",
    icon: "⭐",
    unlocked: false,
    category: "sleep",
    requirement: "7x qualidade 5 estrelas",
  },
  {
    id: "a14",
    title: "Na Balança",
    description: "Registre seu peso pela primeira vez",
    icon: "⚖️",
    unlocked: false,
    category: "weight",
    requirement: "1 registro de peso",
  },
  {
    id: "a15",
    title: "Meta Atingida!",
    description: "Alcance seu peso meta",
    icon: "🎯",
    unlocked: false,
    category: "weight",
    requirement: "Peso = meta",
  },
  {
    id: "a16",
    title: "Acompanhamento",
    description: "Registre seu peso 10 vezes",
    icon: "📊",
    unlocked: false,
    category: "weight",
    requirement: "10 registros de peso",
  },
  {
    id: "a17",
    title: "Dia Perfeito",
    description: "Complete todos os hábitos em um dia",
    icon: "🏆",
    unlocked: false,
    category: "general",
    requirement: "Todos os hábitos no dia",
  },
  {
    id: "a18",
    title: "Semana Perfeita",
    description: "Complete todos os hábitos por 7 dias seguidos",
    icon: "👑",
    unlocked: false,
    category: "general",
    requirement: "7 dias perfeitos",
  },
  {
    id: "a19",
    title: "Arquiteto de Hábitos",
    description: "Crie seu primeiro hábito personalizado",
    icon: "🧩",
    unlocked: false,
    category: "custom",
    requirement: "1 hábito criado",
  },
  {
    id: "a20",
    title: "Rotina Viva",
    description: "Complete um hábito personalizado",
    icon: "✅",
    unlocked: false,
    category: "custom",
    requirement: "1 conclusão personalizada",
  },
  {
    id: "a21",
    title: "Semana Autoral",
    description: "Complete o mesmo hábito personalizado em 7 dias",
    icon: "📆",
    unlocked: false,
    category: "custom",
    requirement: "7 dias do mesmo hábito",
  },
  {
    id: "a22",
    title: "Trinca de Disciplina",
    description: "Complete 3 hábitos personalizados no mesmo dia",
    icon: "🔺",
    unlocked: false,
    category: "custom",
    requirement: "3 hábitos no dia",
  },
  {
    id: "a23",
    title: "Ecossistema Pessoal",
    description: "Mantenha 5 hábitos personalizados ativos",
    icon: "🌱",
    unlocked: false,
    category: "custom",
    requirement: "5 hábitos ativos",
  },
  {
    id: "a24",
    title: "Motor Ligado",
    description: "Complete 10 hábitos personalizados",
    icon: "⚙️",
    unlocked: false,
    category: "custom",
    requirement: "10 conclusões personalizadas",
  },
  {
    id: "a25",
    title: "Autor da Rotina",
    description: "Complete 25 hábitos personalizados",
    icon: "🏗️",
    unlocked: false,
    category: "custom",
    requirement: "25 conclusões personalizadas",
  },
  {
    id: "a26",
    title: "Escolha Difícil",
    description: "Crie um hábito de dificuldade forte",
    icon: "🧗",
    unlocked: false,
    category: "custom",
    requirement: "1 hábito forte",
  },
  {
    id: "a27",
    title: "Mapa Completo",
    description: "Tenha hábitos em todas as categorias",
    icon: "🗺️",
    unlocked: false,
    category: "custom",
    requirement: "8 categorias ativas",
  },
  {
    id: "a28",
    title: "XP Autoral",
    description: "Ganhe 500 XP com hábitos personalizados",
    icon: "⚡",
    unlocked: false,
    category: "custom",
    requirement: "500 XP personalizado",
  },
  {
    id: "a29",
    title: "Relógio Interno",
    description: "Ative um lembrete em um hábito personalizado",
    icon: "⏰",
    unlocked: false,
    category: "custom",
    requirement: "1 lembrete ativo",
  },
];

const defaultProfile: UserProfile = {
  name: "",
  age: 25,
  gender: "male",
  height: 170,
  weight: 70,
  activityLevel: "moderate",
  goal: "maintain",
};

const ALL_NOTIFICATION_DAYS: NotificationDay[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  waterEnabled: true,
  waterTime: "10:00",
  mealEnabled: true,
  mealTime: "12:00",
  workoutEnabled: true,
  workoutTime: "18:00",
  fastingStartEnabled: true,
  fastingStartTime: "08:00",
  fastingPhaseEnabled: true,
  fastingEndEnabled: true,
  sleepEnabled: true,
  sleepTime: "22:30",
  dailySummaryEnabled: true,
  dailySummaryTime: "21:00",
  quietHoursEnabled: true,
  quietStart: "22:30",
  quietEnd: "07:00",
  frequency: "normal",
  activeDays: ALL_NOTIFICATION_DAYS,
};

const GAMIFICATION_RESET_KEY_PREFIX = "fitlife_gamification_reset_at";
const CUSTOM_HABITS_KEY_PREFIX = "fitlife_custom_habits";
const CUSTOM_HABIT_LOGS_KEY_PREFIX = "fitlife_custom_habit_logs";

function getGamificationResetKey(userId: string): string {
  return `${GAMIFICATION_RESET_KEY_PREFIX}_${userId}`;
}

function readGamificationResetAt(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getGamificationResetKey(userId));
}

function writeGamificationResetAt(
  userId: string,
  resetAt: string | null
): void {
  if (typeof window === "undefined") return;

  const key = getGamificationResetKey(userId);
  if (resetAt) {
    window.localStorage.setItem(key, resetAt);
  } else {
    window.localStorage.removeItem(key);
  }
}

function getCustomHabitsKey(userId: string): string {
  return `${CUSTOM_HABITS_KEY_PREFIX}_${userId}`;
}

function getCustomHabitLogsKey(userId: string): string {
  return `${CUSTOM_HABIT_LOGS_KEY_PREFIX}_${userId}`;
}

function readLocalCustomData(userId: string): {
  habits: CustomHabit[];
  logs: CustomHabitLog[];
} {
  if (typeof window === "undefined") return { habits: [], logs: [] };

  try {
    const habits = JSON.parse(
      window.localStorage.getItem(getCustomHabitsKey(userId)) || "[]"
    );
    const logs = JSON.parse(
      window.localStorage.getItem(getCustomHabitLogsKey(userId)) || "[]"
    );

    return {
      habits: Array.isArray(habits) ? habits.map(mapCustomHabitRow) : [],
      logs: Array.isArray(logs) ? logs.map(mapCustomHabitLogRow) : [],
    };
  } catch {
    return { habits: [], logs: [] };
  }
}

function clearLocalCustomData(userId: string): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getCustomHabitsKey(userId));
  window.localStorage.removeItem(getCustomHabitLogsKey(userId));
}

function freshAchievements(): Achievement[] {
  return defaultAchievements.map(achievement => ({
    ...achievement,
    unlocked: false,
    unlockedDate: undefined,
  }));
}

function getEntryTimestamp(entry: {
  created_at?: string;
  date?: string;
}): number {
  const source =
    entry.created_at || (entry.date ? `${entry.date}T23:59:59.999` : "");
  const timestamp = Date.parse(source);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isAfterGamificationReset(
  entry: { created_at?: string; date?: string },
  resetAt: string | null
): boolean {
  if (!resetAt) return true;

  const resetTimestamp = Date.parse(resetAt);
  if (Number.isNaN(resetTimestamp)) return true;

  return getEntryTimestamp(entry) > resetTimestamp;
}

function isFastingAfterGamificationReset(
  session: FastingSession,
  resetAt: string | null
): boolean {
  if (!resetAt) return true;

  const resetTimestamp = Date.parse(resetAt);
  if (Number.isNaN(resetTimestamp)) return true;

  const source =
    session.endTime || session.startTime || session.created_at || "";
  const timestamp = Date.parse(source);
  return !Number.isNaN(timestamp) && timestamp > resetTimestamp;
}

type CustomHabitDataRow = Record<string, unknown>;

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCustomHabitType(value: unknown): CustomHabitType {
  return value === "quantity" || value === "minutes" || value === "limit"
    ? value
    : "boolean";
}

function normalizeCustomHabitCategory(value: unknown): CustomHabitCategory {
  const category = String(value || "health");
  return category in CUSTOM_HABIT_CATEGORIES
    ? (category as CustomHabitCategory)
    : "health";
}

function normalizeCustomHabitDifficulty(value: unknown): CustomHabitDifficulty {
  const difficulty = String(value || "easy");
  return difficulty in CUSTOM_HABIT_DIFFICULTIES
    ? (difficulty as CustomHabitDifficulty)
    : "easy";
}

function mapCustomHabitRow(row: CustomHabitDataRow): CustomHabit {
  const type = normalizeCustomHabitType(row.type);
  const difficulty = normalizeCustomHabitDifficulty(row.difficulty);
  const target = Number(row.target ?? 1);

  return {
    id: String(row.id),
    name: String(row.name || "Hábito"),
    icon: String(row.icon || "✨"),
    color: String(row.color || CUSTOM_HABIT_CATEGORIES.health.color),
    category: normalizeCustomHabitCategory(row.category),
    difficulty,
    type,
    target,
    unit: String(row.unit || ""),
    xp: Number(row.xp ?? getSuggestedCustomHabitXp(difficulty, type, target)),
    isActive:
      typeof row.is_active === "boolean"
        ? row.is_active
        : typeof row.isActive === "boolean"
          ? row.isActive
          : true,
    reminderEnabled:
      typeof row.reminder_enabled === "boolean"
        ? row.reminder_enabled
        : typeof row.reminderEnabled === "boolean"
          ? row.reminderEnabled
          : false,
    reminderTime:
      typeof row.reminder_time === "string"
        ? row.reminder_time
        : typeof row.reminderTime === "string"
          ? row.reminderTime
          : "",
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function mapCustomHabitLogRow(row: CustomHabitDataRow): CustomHabitLog {
  return {
    id: String(row.id),
    habitId: String(row.habit_id || row.habitId),
    value: Number(row.value ?? 0),
    date: String(row.date),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function mapProgressPhotoRow(row: CustomHabitDataRow): ProgressPhoto {
  return {
    id: String(row.id),
    date: String(row.date),
    url: String(row.url || ""),
    storagePath:
      typeof row.storage_path === "string"
        ? row.storage_path
        : typeof row.storagePath === "string"
          ? row.storagePath
          : undefined,
    weight: numberOrUndefined(row.weight),
    note: typeof row.note === "string" ? row.note : undefined,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function mapBodyMeasurementRow(row: CustomHabitDataRow): BodyMeasurement {
  return {
    id: String(row.id),
    date: String(row.date),
    weight: numberOrUndefined(row.weight),
    bodyFat: numberOrUndefined(row.body_fat ?? row.bodyFat),
    neck: numberOrUndefined(row.neck),
    chest: numberOrUndefined(row.chest),
    waist: numberOrUndefined(row.waist),
    hips: numberOrUndefined(row.hips),
    arm: numberOrUndefined(row.arm),
    thigh: numberOrUndefined(row.thigh),
    calf: numberOrUndefined(row.calf),
    notes: typeof row.notes === "string" ? row.notes : undefined,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function mapFastingSessionRow(row: CustomHabitDataRow): FastingSession {
  return {
    id: String(row.id),
    startTime: String(row.start_time ?? row.startTime),
    endTime:
      typeof row.end_time === "string"
        ? row.end_time
        : typeof row.endTime === "string"
          ? row.endTime
          : undefined,
    targetDuration: Number(row.target_duration ?? row.targetDuration ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function normalizeNotificationFrequency(
  value: unknown
): NotificationFrequency {
  return value === "light" || value === "strong" ? value : "normal";
}

function normalizeNotificationDay(value: unknown): NotificationDay | null {
  return value === "sun" ||
    value === "mon" ||
    value === "tue" ||
    value === "wed" ||
    value === "thu" ||
    value === "fri" ||
    value === "sat"
    ? value
    : null;
}

function normalizeTimeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return fallback;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeNotificationDays(value: unknown): NotificationDay[] {
  const rawDays = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value
          .split(",")
          .map(item => item.trim())
          .filter(Boolean)
      : [];

  const unique = new Set<NotificationDay>();
  rawDays.forEach(day => {
    const normalized = normalizeNotificationDay(day);
    if (normalized) unique.add(normalized);
  });

  return unique.size > 0 ? Array.from(unique) : ALL_NOTIFICATION_DAYS;
}

function normalizeNotificationPreferences(
  value: Partial<NotificationPreferences>
): NotificationPreferences {
  return {
    enabled:
      typeof value.enabled === "boolean"
        ? value.enabled
        : defaultNotificationPreferences.enabled,
    waterEnabled:
      typeof value.waterEnabled === "boolean"
        ? value.waterEnabled
        : defaultNotificationPreferences.waterEnabled,
    waterTime: normalizeTimeString(
      value.waterTime,
      defaultNotificationPreferences.waterTime
    ),
    mealEnabled:
      typeof value.mealEnabled === "boolean"
        ? value.mealEnabled
        : defaultNotificationPreferences.mealEnabled,
    mealTime: normalizeTimeString(
      value.mealTime,
      defaultNotificationPreferences.mealTime
    ),
    workoutEnabled:
      typeof value.workoutEnabled === "boolean"
        ? value.workoutEnabled
        : defaultNotificationPreferences.workoutEnabled,
    workoutTime: normalizeTimeString(
      value.workoutTime,
      defaultNotificationPreferences.workoutTime
    ),
    fastingStartEnabled:
      typeof value.fastingStartEnabled === "boolean"
        ? value.fastingStartEnabled
        : defaultNotificationPreferences.fastingStartEnabled,
    fastingStartTime: normalizeTimeString(
      value.fastingStartTime,
      defaultNotificationPreferences.fastingStartTime
    ),
    fastingPhaseEnabled:
      typeof value.fastingPhaseEnabled === "boolean"
        ? value.fastingPhaseEnabled
        : defaultNotificationPreferences.fastingPhaseEnabled,
    fastingEndEnabled:
      typeof value.fastingEndEnabled === "boolean"
        ? value.fastingEndEnabled
        : defaultNotificationPreferences.fastingEndEnabled,
    sleepEnabled:
      typeof value.sleepEnabled === "boolean"
        ? value.sleepEnabled
        : defaultNotificationPreferences.sleepEnabled,
    sleepTime: normalizeTimeString(
      value.sleepTime,
      defaultNotificationPreferences.sleepTime
    ),
    dailySummaryEnabled:
      typeof value.dailySummaryEnabled === "boolean"
        ? value.dailySummaryEnabled
        : defaultNotificationPreferences.dailySummaryEnabled,
    dailySummaryTime: normalizeTimeString(
      value.dailySummaryTime,
      defaultNotificationPreferences.dailySummaryTime
    ),
    quietHoursEnabled:
      typeof value.quietHoursEnabled === "boolean"
        ? value.quietHoursEnabled
        : defaultNotificationPreferences.quietHoursEnabled,
    quietStart: normalizeTimeString(
      value.quietStart,
      defaultNotificationPreferences.quietStart
    ),
    quietEnd: normalizeTimeString(
      value.quietEnd,
      defaultNotificationPreferences.quietEnd
    ),
    frequency: normalizeNotificationFrequency(value.frequency),
    activeDays: normalizeNotificationDays(value.activeDays),
  };
}

function mapNotificationPreferencesRow(
  row: CustomHabitDataRow
): NotificationPreferences {
  return normalizeNotificationPreferences({
    enabled: Boolean(row.enabled ?? row.notifications_enabled ?? true),
    waterEnabled: Boolean(row.water_enabled ?? row.waterEnabled ?? true),
    waterTime: String(row.water_time ?? row.waterTime ?? "10:00"),
    mealEnabled: Boolean(row.meal_enabled ?? row.mealEnabled ?? true),
    mealTime: String(row.meal_time ?? row.mealTime ?? "12:00"),
    workoutEnabled: Boolean(row.workout_enabled ?? row.workoutEnabled ?? true),
    workoutTime: String(row.workout_time ?? row.workoutTime ?? "18:00"),
    fastingStartEnabled: Boolean(
      row.fasting_start_enabled ?? row.fastingStartEnabled ?? true
    ),
    fastingStartTime: String(
      row.fasting_start_time ?? row.fastingStartTime ?? "08:00"
    ),
    fastingPhaseEnabled: Boolean(
      row.fasting_phase_enabled ?? row.fastingPhaseEnabled ?? true
    ),
    fastingEndEnabled: Boolean(
      row.fasting_end_enabled ?? row.fastingEndEnabled ?? true
    ),
    sleepEnabled: Boolean(row.sleep_enabled ?? row.sleepEnabled ?? true),
    sleepTime: String(row.sleep_time ?? row.sleepTime ?? "22:30"),
    dailySummaryEnabled: Boolean(
      row.daily_summary_enabled ?? row.dailySummaryEnabled ?? true
    ),
    dailySummaryTime: String(
      row.daily_summary_time ?? row.dailySummaryTime ?? "21:00"
    ),
    quietHoursEnabled: Boolean(
      row.quiet_hours_enabled ?? row.quietHoursEnabled ?? true
    ),
    quietStart: String(row.quiet_start ?? row.quietStart ?? "22:30"),
    quietEnd: String(row.quiet_end ?? row.quietEnd ?? "07:00"),
    frequency:
      typeof row.frequency === "string"
        ? (row.frequency as NotificationFrequency)
        : undefined,
    activeDays: Array.isArray(row.active_days)
      ? (row.active_days as NotificationDay[])
      : Array.isArray(row.activeDays)
        ? (row.activeDays as NotificationDay[])
        : undefined,
  });
}

function normalizeMealType(value: unknown): MealType {
  const meal = String(value || "almoco");
  return meal === "cafe" ||
    meal === "almoco" ||
    meal === "lanche" ||
    meal === "janta" ||
    meal === "snack"
    ? meal
    : "almoco";
}

function mapSavedMealRow(row: CustomHabitDataRow): SavedMeal {
  return {
    id: String(row.id),
    name: String(row.name || "Refeicao salva"),
    calories: Number(row.calories ?? 0),
    protein: Number(row.protein ?? 0),
    carbs: Number(row.carbs ?? 0),
    fat: Number(row.fat ?? 0),
    meal: normalizeMealType(row.meal),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function normalizeFoodLibrarySource(value: unknown): FoodLibrarySource {
  const source = String(value || "custom");
  return source === "imported" || source === "curated" || source === "official"
    ? source
    : "custom";
}

function normalizeServingOptionCandidate(
  value: unknown
): FoodServingOption | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const label = String(candidate.label || "").trim();
  const grams = Number(candidate.grams);

  if (!label || !Number.isFinite(grams) || grams <= 0) return null;

  return {
    label,
    grams: Math.round(grams * 100) / 100,
  };
}

function parseFoodServingOptions(value: unknown): FoodServingOption[] {
  let rawArray: unknown[] = [];

  if (Array.isArray(value)) {
    rawArray = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) rawArray = parsed;
    } catch {
      rawArray = [];
    }
  }

  return rawArray
    .map(normalizeServingOptionCandidate)
    .filter((item): item is FoodServingOption => Boolean(item));
}

function getDefaultFoodServingOptions(
  servingLabel: string,
  servingGrams: number
): FoodServingOption[] {
  const unique = new Map<string, FoodServingOption>();

  const push = (label: string, grams: number) => {
    const cleanLabel = label.trim();
    const cleanGrams = Math.round(Math.max(0.1, grams) * 100) / 100;
    const key = `${cleanLabel.toLowerCase()}::${cleanGrams}`;
    if (!unique.has(key)) {
      unique.set(key, { label: cleanLabel, grams: cleanGrams });
    }
  };

  push(servingLabel || "Porcao", servingGrams || 100);
  push("100g", 100);

  return Array.from(unique.values());
}

function resolveFoodServingOptions(
  servingLabel: string,
  servingGrams: number,
  rawOptions: unknown
): FoodServingOption[] {
  const parsedOptions = parseFoodServingOptions(rawOptions);

  if (parsedOptions.length === 0) {
    return getDefaultFoodServingOptions(servingLabel, servingGrams);
  }

  const unique = new Map<string, FoodServingOption>();
  const add = (option: FoodServingOption) => {
    const key = `${option.label.toLowerCase()}::${option.grams}`;
    if (!unique.has(key)) unique.set(key, option);
  };

  getDefaultFoodServingOptions(servingLabel, servingGrams).forEach(add);
  parsedOptions.forEach(add);

  return Array.from(unique.values());
}

function mapFoodLibraryRow(row: CustomHabitDataRow): FoodLibraryItem {
  const servingLabel = String(row.serving_label || row.servingLabel || "100g");
  const servingGrams = Number(row.serving_grams ?? row.servingGrams ?? 100);

  return {
    id: String(row.id),
    name: String(row.name || "Alimento"),
    brand: typeof row.brand === "string" ? row.brand : undefined,
    servingLabel,
    servingGrams,
    servingOptions: resolveFoodServingOptions(
      servingLabel,
      servingGrams,
      row.serving_options ?? row.servingOptions
    ),
    caloriesPer100g: Number(row.calories_per_100g ?? row.caloriesPer100g ?? 0),
    proteinPer100g: Number(row.protein_per_100g ?? row.proteinPer100g ?? 0),
    carbsPer100g: Number(row.carbs_per_100g ?? row.carbsPer100g ?? 0),
    fatPer100g: Number(row.fat_per_100g ?? row.fatPer100g ?? 0),
    source: normalizeFoodLibrarySource(row.source),
    barcode: typeof row.barcode === "string" ? row.barcode : undefined,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

type ProgressPhotoStorageRow = {
  storage_path: string | null;
};

async function resolveProgressPhotoUrls(
  rows: CustomHabitDataRow[]
): Promise<ProgressPhoto[]> {
  const photos = rows.map(mapProgressPhotoRow);

  return Promise.all(
    photos.map(async photo => {
      if (!photo.storagePath) return photo;

      const { data, error } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photo.storagePath, 60 * 60 * 24 * 7);

      return {
        ...photo,
        url: error || !data?.signedUrl ? photo.url : data.signedUrl,
      };
    })
  );
}

function mergeCustomHabits(
  primary: CustomHabit[],
  fallback: CustomHabit[]
): CustomHabit[] {
  const merged = [...primary];
  const seenIds = new Set(primary.map(habit => habit.id));

  for (const habit of fallback) {
    if (!seenIds.has(habit.id)) {
      merged.push(habit);
      seenIds.add(habit.id);
    }
  }

  return merged.sort((a, b) => getEntryTimestamp(a) - getEntryTimestamp(b));
}

function mergeCustomHabitLogs(
  primary: CustomHabitLog[],
  fallback: CustomHabitLog[],
  habits: CustomHabit[]
): CustomHabitLog[] {
  const habitIds = new Set(habits.map(habit => habit.id));
  const merged = [...primary.filter(log => habitIds.has(log.habitId))];
  const seenKeys = new Set(merged.map(log => `${log.habitId}:${log.date}`));

  for (const log of fallback) {
    const key = `${log.habitId}:${log.date}`;
    if (habitIds.has(log.habitId) && !seenKeys.has(key)) {
      merged.push(log);
      seenKeys.add(key);
    }
  }

  return merged.sort((a, b) => getEntryTimestamp(a) - getEntryTimestamp(b));
}

async function syncLocalCustomDataToSupabase(
  userId: string,
  habits: CustomHabit[],
  logs: CustomHabitLog[]
): Promise<boolean> {
  if (habits.length === 0) return true;

  const { error: habitsError } = await supabase.from("custom_habits").upsert(
    habits.map(habit => ({
      id: habit.id,
      user_id: userId,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      category: habit.category,
      difficulty: habit.difficulty,
      type: habit.type,
      target: habit.target,
      unit: habit.unit || "",
      xp: habit.xp,
      is_active: habit.isActive,
      reminder_enabled: habit.reminderEnabled,
      reminder_time: habit.reminderTime || null,
      created_at: habit.created_at,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (habitsError) return false;
  if (logs.length === 0) return true;

  const habitIds = new Set(habits.map(habit => habit.id));
  const validLogs = logs.filter(log => habitIds.has(log.habitId));
  if (validLogs.length === 0) return true;

  const { error: logsError } = await supabase.from("custom_habit_logs").upsert(
    validLogs.map(log => ({
      id: log.id,
      user_id: userId,
      habit_id: log.habitId,
      value: log.value,
      date: log.date,
      created_at: log.created_at,
    })),
    { onConflict: "user_id,habit_id,date" }
  );

  return !logsError;
}

export function isCustomHabitComplete(
  habit: CustomHabit,
  log?: CustomHabitLog
): boolean {
  if (!habit.isActive || !log) return false;

  if (habit.type === "boolean") return log.value >= 1;
  if (habit.type === "limit") return log.value <= habit.target;

  return log.value >= habit.target;
}

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [foodLibrary, setFoodLibrary] = useState<FoodLibraryItem[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>(
    []
  );
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
  const [customHabitLogs, setCustomHabitLogs] = useState<CustomHabitLog[]>([]);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [goals, setGoalsState] = useState<DailyGoals>(defaultGoals);
  const [notificationPreferences, setNotificationPreferencesState] =
    useState<NotificationPreferences>(defaultNotificationPreferences);
  const [achievements, setAchievements] =
    useState<Achievement[]>(freshAchievements);
  const [gamificationResetAt, setGamificationResetAt] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const notificationKeysRef = useRef<Set<string>>(new Set());
  const notificationDateRef = useRef<string>("");

  // Carregar dados do Supabase
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [
          { data: water },
          { data: workouts },
          { data: food },
          { data: savedMealsData, error: savedMealsError },
          { data: foodLibraryData, error: foodLibraryError },
          { data: sleep },
          { data: weight },
          { data: measurements, error: measurementsError },
          { data: photos },
          { data: fasting },
          { data: profile },
          { data: userGoals },
          { data: unlocked },
          { data: notificationPrefsData, error: notificationPrefsError },
        ] = await Promise.all([
          supabase.from("water_entries").select("*").eq("user_id", user.id),
          supabase.from("workout_entries").select("*").eq("user_id", user.id),
          supabase.from("food_entries").select("*").eq("user_id", user.id),
          supabase
            .from("saved_meals")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("food_library")
            .select("*")
            .eq("user_id", user.id)
            .order("name", { ascending: true }),
          supabase.from("sleep_entries").select("*").eq("user_id", user.id),
          supabase.from("weight_entries").select("*").eq("user_id", user.id),
          supabase
            .from("body_measurements")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("progress_photos")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase.from("fasting_sessions").select("*").eq("user_id", user.id),
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("user_goals")
            .select("*")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("unlocked_achievements")
            .select("*")
            .eq("user_id", user.id),
          supabase
            .from("notification_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const storedGamificationResetAt = readGamificationResetAt(user.id);
        setGamificationResetAt(storedGamificationResetAt);

        const localCustomData = readLocalCustomData(user.id);
        const [
          { data: customHabitsData, error: customHabitsError },
          { data: customLogsData, error: customLogsError },
        ] = await Promise.all([
          supabase
            .from("custom_habits")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase.from("custom_habit_logs").select("*").eq("user_id", user.id),
        ]);

        if (customHabitsError || customLogsError) {
          setCustomHabits([]);
          setCustomHabitLogs([]);
          toast.error(
            "Hábitos personalizados precisam do schema aplicado no Supabase."
          );
        } else {
          const mappedCustomHabits = (customHabitsData || []).map(
            mapCustomHabitRow
          );
          const mappedCustomLogs = (customLogsData || []).map(
            mapCustomHabitLogRow
          );
          const mergedCustomHabits = mergeCustomHabits(
            mappedCustomHabits,
            localCustomData.habits
          );
          const mergedCustomLogs = mergeCustomHabitLogs(
            mappedCustomLogs,
            localCustomData.logs,
            mergedCustomHabits
          );

          setCustomHabits(mergedCustomHabits);
          setCustomHabitLogs(mergedCustomLogs);

          if (
            localCustomData.habits.length > 0 ||
            localCustomData.logs.length > 0
          ) {
            const migrated = await syncLocalCustomDataToSupabase(
              user.id,
              mergedCustomHabits,
              mergedCustomLogs
            );
            if (migrated) {
              clearLocalCustomData(user.id);
              toast.success("Hábitos antigos migrados para o Supabase.");
            } else {
              toast.error(
                "Não consegui migrar os hábitos antigos para o Supabase."
              );
            }
          }
        }

        if (water) setWaterEntries(water);
        if (workouts) setWorkoutEntries(workouts);
        if (food) setFoodEntries(food);
        if (savedMealsError) {
          setSavedMeals([]);
        } else if (savedMealsData) {
          setSavedMeals(savedMealsData.map(mapSavedMealRow));
        }
        if (foodLibraryError) {
          setFoodLibrary([]);
        } else if (foodLibraryData) {
          setFoodLibrary(foodLibraryData.map(mapFoodLibraryRow));
        }
        if (sleep) setSleepEntries(sleep);
        if (weight)
          setWeightEntries(
            weight.map(w => ({
              id: w.id,
              weight: w.weight,
              bodyFat: w.body_fat,
              notes: w.notes,
              date: w.date,
              created_at: w.created_at,
            }))
          );
        if (measurementsError) {
          setBodyMeasurements([]);
        } else if (measurements) {
          setBodyMeasurements(measurements.map(mapBodyMeasurementRow));
        }
        if (photos) {
          const mappedPhotos = await resolveProgressPhotoUrls(photos);
          setProgressPhotos(mappedPhotos);
        }
        if (fasting) setFastingSessions(fasting.map(mapFastingSessionRow));
        if (profile)
          setUserProfileState({
            name: profile.name,
            age: profile.age,
            gender: profile.gender,
            height: profile.height,
            weight: profile.weight,
            activityLevel: profile.activity_level,
            goal: profile.goal,
          });
        if (userGoals)
          setGoalsState({
            water: userGoals.water,
            waterGlasses: userGoals.water_glasses,
            glassSize: userGoals.glass_size,
            workoutMinutes: userGoals.workout_minutes,
            calories: userGoals.calories,
            protein: userGoals.protein,
            carbs: userGoals.carbs,
            fat: userGoals.fat,
            sleepHours: userGoals.sleep_hours,
            weightGoal: userGoals.weight_goal,
          });

        if (notificationPrefsError) {
          setNotificationPreferencesState(defaultNotificationPreferences);
        } else if (notificationPrefsData) {
          setNotificationPreferencesState(
            mapNotificationPreferencesRow(notificationPrefsData)
          );
        } else {
          setNotificationPreferencesState(defaultNotificationPreferences);
        }

        if (unlocked) {
          const updatedAchievements = defaultAchievements.map(a => {
            const found = unlocked.find(u => u.achievement_id === a.id);
            return found
              ? { ...a, unlocked: true, unlockedDate: found.unlocked_date }
              : a;
          });
          setAchievements(updatedAchievements);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addWaterEntry = async (amount: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newEntry = {
      user_id: user.id,
      amount,
      time: formatTime(),
      date: formatDate(currentDate),
    };

    const { data, error } = await supabase
      .from("water_entries")
      .insert(newEntry)
      .select()
      .single();
    if (error) toast.error("Erro ao salvar água");
    else setWaterEntries(prev => [...prev, data]);
  };

  const removeLastWaterEntry = async () => {
    const todayEntries = waterEntries.filter(
      e => e.date === formatDate(currentDate)
    );
    if (todayEntries.length === 0) return;
    const last = todayEntries[todayEntries.length - 1];

    const { error } = await supabase
      .from("water_entries")
      .delete()
      .eq("id", last.id);
    if (error) toast.error("Erro ao remover água");
    else setWaterEntries(prev => prev.filter(e => e.id !== last.id));
  };

  const resetWaterToday = async () => {
    const dateStr = formatDate(currentDate);
    const { error } = await supabase
      .from("water_entries")
      .delete()
      .eq("date", dateStr);
    if (error) toast.error("Erro ao resetar água");
    else setWaterEntries(prev => prev.filter(e => e.date !== dateStr));
  };

  const addWorkoutEntry = async (
    entry: Omit<WorkoutEntry, "id" | "date" | "time">
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newEntry = {
      user_id: user.id,
      exercises: entry.exercises,
      duration: entry.duration,
      date: formatDate(currentDate),
      time: formatTime(),
    };

    const { data, error } = await supabase
      .from("workout_entries")
      .insert(newEntry)
      .select()
      .single();
    if (error) toast.error("Erro ao salvar treino");
    else setWorkoutEntries(prev => [...prev, data]);
  };

  const removeWorkoutEntry = async (id: string) => {
    const { error } = await supabase
      .from("workout_entries")
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao remover treino");
    else setWorkoutEntries(prev => prev.filter(e => e.id !== id));
  };

  const addFoodEntry = async (entry: FoodEntryInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario nao autenticado");

    const newEntry = {
      user_id: user.id,
      name: entry.name.trim(),
      calories: Math.max(0, Number(entry.calories) || 0),
      protein: Math.max(0, Number(entry.protein) || 0),
      carbs: Math.max(0, Number(entry.carbs) || 0),
      fat: Math.max(0, Number(entry.fat) || 0),
      meal: entry.meal,
      date: entry.date || formatDate(currentDate),
      time: entry.time || formatTime(),
    };

    const { data, error } = await supabase
      .from("food_entries")
      .insert(newEntry)
      .select()
      .single();
    if (error || !data) {
      throw error || new Error("Erro ao salvar alimento");
    }

    setFoodEntries(prev => [...prev, data]);
  };

  const removeFoodEntry = async (id: string) => {
    const { error } = await supabase.from("food_entries").delete().eq("id", id);
    if (error) throw error;

    setFoodEntries(prev => prev.filter(e => e.id !== id));
  };

  const addSavedMeal = async (meal: SavedMealInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario nao autenticado");

    const { data, error } = await supabase
      .from("saved_meals")
      .insert({
        user_id: user.id,
        name: meal.name.trim(),
        calories: Math.max(0, Number(meal.calories) || 0),
        protein: Math.max(0, Number(meal.protein) || 0),
        carbs: Math.max(0, Number(meal.carbs) || 0),
        fat: Math.max(0, Number(meal.fat) || 0),
        meal: meal.meal,
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Erro ao salvar refeicao favorita");
    }

    setSavedMeals(prev => [mapSavedMealRow(data), ...prev]);
  };

  const removeSavedMeal = async (id: string) => {
    const { error } = await supabase.from("saved_meals").delete().eq("id", id);
    if (error) throw error;

    setSavedMeals(prev => prev.filter(meal => meal.id !== id));
  };

  const addFoodLibraryItem = async (item: FoodLibraryInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario nao autenticado");

    const servingLabel = item.servingLabel.trim() || "100g";
    const servingGrams = Math.max(1, Number(item.servingGrams) || 100);
    const servingOptions = resolveFoodServingOptions(
      servingLabel,
      servingGrams,
      item.servingOptions
    );

    const insertPayload = {
      user_id: user.id,
      name: item.name.trim(),
      brand: item.brand?.trim() || null,
      serving_label: servingLabel,
      serving_grams: servingGrams,
      calories_per_100g: Math.max(0, Number(item.caloriesPer100g) || 0),
      protein_per_100g: Math.max(0, Number(item.proteinPer100g) || 0),
      carbs_per_100g: Math.max(0, Number(item.carbsPer100g) || 0),
      fat_per_100g: Math.max(0, Number(item.fatPer100g) || 0),
      source: item.source,
      barcode: item.barcode?.trim() || null,
    };

    let data: CustomHabitDataRow | null = null;
    let error: { code?: string; message?: string } | null = null;

    const withServingOptions = await supabase
      .from("food_library")
      .insert({
        ...insertPayload,
        serving_options: servingOptions,
      })
      .select()
      .single();

    data = withServingOptions.data as CustomHabitDataRow | null;
    error = withServingOptions.error as { code?: string; message?: string } | null;

    const missingServingOptionsColumn =
      error &&
      (error.code === "PGRST204" ||
        String(error.message || "").toLowerCase().includes("serving_options"));

    if (missingServingOptionsColumn) {
      const fallbackInsert = await supabase
        .from("food_library")
        .insert(insertPayload)
        .select()
        .single();

      data = fallbackInsert.data as CustomHabitDataRow | null;
      error = fallbackInsert.error as { code?: string; message?: string } | null;
    }

    if (error || !data) {
      throw error || new Error("Erro ao salvar alimento na biblioteca");
    }

    setFoodLibrary(prev =>
      [...prev, mapFoodLibraryRow(data)].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
  };

  const removeFoodLibraryItem = async (id: string) => {
    const { error } = await supabase.from("food_library").delete().eq("id", id);
    if (error) throw error;

    setFoodLibrary(prev => prev.filter(item => item.id !== id));
  };

  const addSleepEntry = async (entry: Omit<SleepEntry, "id" | "date">) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newEntry = {
      user_id: user.id,
      ...entry,
      date: formatDate(currentDate),
    };

    const { data, error } = await supabase
      .from("sleep_entries")
      .insert(newEntry)
      .select()
      .single();
    if (error) toast.error("Erro ao salvar sono");
    else setSleepEntries(prev => [...prev, data]);
  };

  const removeSleepEntry = async (id: string) => {
    const { error } = await supabase
      .from("sleep_entries")
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao remover sono");
    else setSleepEntries(prev => prev.filter(e => e.id !== id));
  };

  const addWeightEntry = async (
    weight: number,
    bodyFat?: number,
    notes?: string
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newEntry = {
      user_id: user.id,
      weight,
      body_fat: bodyFat,
      notes,
      date: formatDate(currentDate),
    };

    const { data, error } = await supabase
      .from("weight_entries")
      .insert(newEntry)
      .select()
      .single();
    if (error) toast.error("Erro ao salvar peso");
    else
      setWeightEntries(prev => [
        ...prev,
        {
          id: data.id,
          weight: data.weight,
          bodyFat: data.body_fat,
          notes: data.notes,
          date: data.date,
          created_at: data.created_at,
        },
      ]);
  };

  const removeWeightEntry = async (id: string) => {
    const { error } = await supabase
      .from("weight_entries")
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao remover peso");
    else setWeightEntries(prev => prev.filter(e => e.id !== id));
  };

  const addBodyMeasurement = async (
    measurement: Omit<BodyMeasurement, "id" | "created_at">
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("body_measurements")
      .insert({
        user_id: user.id,
        date: measurement.date,
        weight: measurement.weight,
        body_fat: measurement.bodyFat,
        neck: measurement.neck,
        chest: measurement.chest,
        waist: measurement.waist,
        hips: measurement.hips,
        arm: measurement.arm,
        thigh: measurement.thigh,
        calf: measurement.calf,
        notes: measurement.notes,
      })
      .select()
      .single();

    if (error || !data) throw error || new Error("Erro ao salvar medidas");

    const savedMeasurement = mapBodyMeasurementRow(data);
    setBodyMeasurements(prev =>
      [savedMeasurement, ...prev].sort(
        (a, b) => getEntryTimestamp(b) - getEntryTimestamp(a)
      )
    );
  };

  const removeBodyMeasurement = async (id: string) => {
    const { error } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id);
    if (error) throw error;

    setBodyMeasurements(prev => prev.filter(entry => entry.id !== id));
  };

  const setUserProfile = async (profile: UserProfile) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      activity_level: profile.activityLevel,
      goal: profile.goal,
      updated_at: new Date().toISOString(),
    });

    if (error) toast.error("Erro ao salvar perfil");
    else {
      setUserProfileState(profile);
      const newGoals = calculateAutoGoals(profile);
      setGoals(newGoals);
    }
  };

  const setGoals = async (newGoals: Partial<DailyGoals>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const updatedGoals = { ...goals, ...newGoals };
    const { error } = await supabase.from("user_goals").upsert({
      user_id: user.id,
      water: updatedGoals.water,
      water_glasses: updatedGoals.waterGlasses,
      glass_size: updatedGoals.glassSize,
      workout_minutes: updatedGoals.workoutMinutes,
      calories: updatedGoals.calories,
      protein: updatedGoals.protein,
      carbs: updatedGoals.carbs,
      fat: updatedGoals.fat,
      sleep_hours: updatedGoals.sleepHours,
      weight_goal: updatedGoals.weightGoal,
      updated_at: new Date().toISOString(),
    });

    if (error) toast.error("Erro ao salvar metas");
    else setGoalsState(updatedGoals);
  };

  const calculateAutoGoals = (profile: UserProfile): DailyGoals => {
    let bmr = 0;
    if (profile.gender === "male") {
      bmr =
        88.362 +
        13.397 * profile.weight +
        4.799 * profile.height -
        5.677 * profile.age;
    } else {
      bmr =
        447.593 +
        9.247 * profile.weight +
        3.098 * profile.height -
        4.33 * profile.age;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * activityMultipliers[profile.activityLevel];

    if (profile.goal === "lose") tdee -= 500;
    if (profile.goal === "gain") tdee += 500;

    const calories = Math.round(tdee);
    const protein = getProteinGoal(profile);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

    return {
      ...defaultGoals,
      calories,
      protein,
      carbs,
      fat,
      water: Math.round(profile.weight * 35),
      weightGoal:
        profile.goal === "lose"
          ? profile.weight * 0.9
          : profile.goal === "gain"
            ? profile.weight * 1.1
            : profile.weight,
    };
  };

  const resetAchievements = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("unlocked_achievements")
      .delete()
      .eq("user_id", user.id);
    if (error) throw error;

    const resetAt = new Date().toISOString();
    writeGamificationResetAt(user.id, resetAt);
    setGamificationResetAt(resetAt);
    setAchievements(freshAchievements());
    void logAuditEvent({
      action: "gamification_reset",
      scope: "profile",
      metadata: { resetAt },
    });
  };

  const resetAllData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data: progressPhotoRows, error: progressPhotoRowsError } =
      await supabase
        .from("progress_photos")
        .select("storage_path")
        .eq("user_id", user.id);

    if (progressPhotoRowsError) throw progressPhotoRowsError;

    const progressPhotoStoragePaths = (
      (progressPhotoRows ?? []) as ProgressPhotoStorageRow[]
    )
      .map(row => row.storage_path)
      .filter(
        (path): path is string =>
          typeof path === "string" && path.startsWith(`${user.id}/`)
      );

    const resetProfile = {
      id: user.id,
      name: defaultProfile.name,
      age: defaultProfile.age,
      gender: defaultProfile.gender,
      height: defaultProfile.height,
      weight: defaultProfile.weight,
      activity_level: defaultProfile.activityLevel,
      goal: defaultProfile.goal,
      updated_at: new Date().toISOString(),
    };

    const results = await Promise.all([
      supabase.from("water_entries").delete().eq("user_id", user.id),
      supabase.from("workout_entries").delete().eq("user_id", user.id),
      supabase.from("food_entries").delete().eq("user_id", user.id),
      supabase.from("saved_meals").delete().eq("user_id", user.id),
      supabase.from("food_library").delete().eq("user_id", user.id),
      supabase.from("sleep_entries").delete().eq("user_id", user.id),
      supabase.from("weight_entries").delete().eq("user_id", user.id),
      supabase.from("body_measurements").delete().eq("user_id", user.id),
      supabase.from("progress_photos").delete().eq("user_id", user.id),
      supabase.from("fasting_sessions").delete().eq("user_id", user.id),
      supabase.from("unlocked_achievements").delete().eq("user_id", user.id),
      supabase.from("user_goals").delete().eq("user_id", user.id),
      supabase
        .from("notification_preferences")
        .delete()
        .eq("user_id", user.id),
      supabase.from("profiles").upsert(resetProfile),
    ]);

    const habitCleanupResults = await Promise.all([
      supabase.from("custom_habit_logs").delete().eq("user_id", user.id),
      supabase.from("custom_habits").delete().eq("user_id", user.id),
    ]);

    const failed = [...results, ...habitCleanupResults].find(
      result => result.error
    );
    if (failed?.error) {
      throw failed.error;
    }

    if (progressPhotoStoragePaths.length > 0) {
      const { error: storageCleanupError } = await supabase.storage
        .from("progress-photos")
        .remove(progressPhotoStoragePaths);

      if (storageCleanupError) {
        toast.warning(
          "Dados apagados, mas algumas fotos antigas ficaram no Storage."
        );
      }
    }

    writeGamificationResetAt(user.id, null);
    clearLocalCustomData(user.id);
    setGamificationResetAt(null);
    setCurrentDate(new Date());
    setWaterEntries([]);
    setWorkoutEntries([]);
    setFoodEntries([]);
    setSavedMeals([]);
    setFoodLibrary([]);
    setSleepEntries([]);
    setWeightEntries([]);
    setBodyMeasurements([]);
    setProgressPhotos([]);
    setFastingSessions([]);
    setCustomHabits([]);
    setCustomHabitLogs([]);
    setUserProfileState(defaultProfile);
    setGoalsState(defaultGoals);
    setNotificationPreferencesState(defaultNotificationPreferences);
    setAchievements(freshAchievements());
    void logAuditEvent({
      action: "full_data_reset",
      scope: "profile",
      metadata: {
        removedProgressPhotos: progressPhotoStoragePaths.length,
      },
    });
  };

  const addProgressPhoto = async (photo: Omit<ProgressPhoto, "id">) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("progress_photos")
      .insert({
        user_id: user.id,
        url: photo.url,
        storage_path: photo.storagePath,
        weight: photo.weight,
        note: photo.note,
        date: photo.date,
      })
      .select()
      .single();

    if (error || !data) throw error || new Error("Erro ao salvar foto");

    const [savedPhoto] = await resolveProgressPhotoUrls([data]);
    setProgressPhotos(prev =>
      [savedPhoto, ...prev].sort(
        (a, b) => getEntryTimestamp(b) - getEntryTimestamp(a)
      )
    );
  };

  const removeProgressPhoto = async (id: string) => {
    const photo = progressPhotos.find(entry => entry.id === id);
    const { error } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (photo?.storagePath) {
      const { error: storageError } = await supabase.storage
        .from("progress-photos")
        .remove([photo.storagePath]);

      if (storageError) {
        toast.warning(
          "Registro removido, mas o arquivo não foi apagado do Storage."
        );
      }
    }

    setProgressPhotos(prev => prev.filter(e => e.id !== id));
  };

  const startFasting = async ({
    durationHours,
    startTime,
  }: StartFastingInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (fastingSessions.some(session => session.isActive)) {
      throw new Error("Ja existe um jejum em andamento.");
    }

    const parsedDuration = Math.max(1, Math.round(durationHours));
    const parsedStartTime = startTime ? new Date(startTime) : new Date();

    if (Number.isNaN(parsedStartTime.getTime())) {
      throw new Error("Horario inicial invalido.");
    }

    const { data, error } = await supabase
      .from("fasting_sessions")
      .insert({
        user_id: user.id,
        start_time: parsedStartTime.toISOString(),
        target_duration: parsedDuration,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    setFastingSessions(prev => [...prev, mapFastingSessionRow(data)]);
    void logAuditEvent({
      action: "fasting_started",
      scope: "fasting",
      metadata: {
        durationHours: parsedDuration,
        startTime: parsedStartTime.toISOString(),
      },
    });
  };

  const updateActiveFasting = async ({
    durationHours,
    startTime,
  }: UpdateActiveFastingInput) => {
    const active = fastingSessions.find(session => session.isActive);
    if (!active) {
      throw new Error("Nenhum jejum ativo para atualizar.");
    }

    const updates: Record<string, unknown> = {};

    if (typeof durationHours === "number") {
      updates.target_duration = Math.max(1, Math.round(durationHours));
    }

    if (typeof startTime === "string") {
      const parsedStartTime = new Date(startTime);
      if (Number.isNaN(parsedStartTime.getTime())) {
        throw new Error("Horario inicial invalido.");
      }

      updates.start_time = parsedStartTime.toISOString();
    }

    if (Object.keys(updates).length === 0) return;

    const { data, error } = await supabase
      .from("fasting_sessions")
      .update(updates)
      .eq("id", active.id)
      .select()
      .single();

    if (error) throw error;

    setFastingSessions(prev =>
      prev.map(session =>
        session.id === active.id ? mapFastingSessionRow(data) : session
      )
    );

    void logAuditEvent({
      action: "fasting_updated",
      scope: "fasting",
      metadata: {
        sessionId: active.id,
        durationHours:
          typeof updates.target_duration === "number"
            ? updates.target_duration
            : undefined,
        startTime:
          typeof updates.start_time === "string" ? updates.start_time : undefined,
      },
    });
  };

  const endFasting = async () => {
    const active = fastingSessions.find(s => s.isActive);
    if (!active) return;

    const now = new Date();
    const start = new Date(active.startTime);
    const elapsedHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
    const completedGoal = elapsedHours >= active.targetDuration;

    const { data, error } = await supabase
      .from("fasting_sessions")
      .update({
        is_active: false,
        end_time: now.toISOString(),
      })
      .eq("id", active.id)
      .select()
      .single();

    if (error) throw error;

    setFastingSessions(prev =>
      prev.map(s => (s.id === active.id ? mapFastingSessionRow(data) : s))
    );

    if (completedGoal) {
      toast.success("Meta de Jejum Atingida! +50 XP Bonus");
    } else {
      toast.info("Jejum encerrado antes da meta.");
    }

    void logAuditEvent({
      action: "fasting_ended",
      scope: "fasting",
      metadata: {
        sessionId: active.id,
        completedGoal,
        targetDuration: active.targetDuration,
        elapsedHours: Number(elapsedHours.toFixed(2)),
      },
    });
  };

  const removeFastingSession = async (id: string) => {
    const { error } = await supabase
      .from("fasting_sessions")
      .delete()
      .eq("id", id);
    if (error) throw error;

    setFastingSessions(prev => prev.filter(s => s.id !== id));
    void logAuditEvent({
      action: "fasting_session_deleted",
      scope: "fasting",
      metadata: { sessionId: id },
    });
  };

  const addCustomHabit = async (
    habit: Omit<CustomHabit, "id" | "created_at">
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("custom_habits")
      .insert({
        user_id: user.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        category: habit.category,
        difficulty: habit.difficulty,
        type: habit.type,
        target: habit.target,
        unit: habit.unit || "",
        xp: habit.xp,
        is_active: habit.isActive,
        reminder_enabled: habit.reminderEnabled,
        reminder_time: habit.reminderTime || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Não foi possível salvar o hábito no Supabase.");
    }

    const savedHabit = mapCustomHabitRow(data);
    setCustomHabits(prev => {
      return [...prev, savedHabit];
    });
  };

  const updateCustomHabit = async (
    id: string,
    habit: Partial<Omit<CustomHabit, "id" | "created_at">>
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("custom_habits")
      .update({
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        category: habit.category,
        difficulty: habit.difficulty,
        type: habit.type,
        target: habit.target,
        unit: habit.unit,
        xp: habit.xp,
        is_active: habit.isActive,
        reminder_enabled: habit.reminderEnabled,
        reminder_time: habit.reminderTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    setCustomHabits(prev => {
      return prev.map(item => (item.id === id ? { ...item, ...habit } : item));
    });
  };

  const removeCustomHabit = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("custom_habits")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;

    const nextHabits = customHabits.filter(item => item.id !== id);
    const nextLogs = customHabitLogs.filter(log => log.habitId !== id);
    setCustomHabits(nextHabits);
    setCustomHabitLogs(nextLogs);
  };

  const setCustomHabitLog = async (
    habitId: string,
    value: number,
    date?: Date
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const dateStr = formatDate(date || currentDate);
    const { data, error } = await supabase
      .from("custom_habit_logs")
      .upsert(
        {
          user_id: user.id,
          habit_id: habitId,
          value,
          date: dateStr,
        },
        { onConflict: "user_id,habit_id,date" }
      )
      .select()
      .single();

    if (error || !data) {
      throw (
        error || new Error("Não foi possível salvar o registro no Supabase.")
      );
    }

    const savedLog = mapCustomHabitLogRow(data);
    setCustomHabitLogs(prev => {
      const next = prev.some(
        log => log.habitId === habitId && log.date === dateStr
      )
        ? prev.map(log =>
            log.habitId === habitId && log.date === dateStr ? savedLog : log
          )
        : [...prev, savedLog];
      return next;
    });
  };

  const removeCustomHabitLog = async (habitId: string, date?: Date) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const dateStr = formatDate(date || currentDate);
    const { error } = await supabase
      .from("custom_habit_logs")
      .delete()
      .eq("user_id", user.id)
      .eq("habit_id", habitId)
      .eq("date", dateStr);

    if (error) throw error;

    setCustomHabitLogs(prev => {
      const next = prev.filter(
        log => !(log.habitId === habitId && log.date === dateStr)
      );
      return next;
    });
  };

  const getDayEntries = <T extends { date: string }>(
    entries: T[],
    date?: Date
  ) => {
    const dateStr = formatDate(date || currentDate);
    return entries.filter(e => e.date === dateStr);
  };

  const getTodayWaterTotal = () =>
    getDayEntries(waterEntries).reduce((sum, e) => sum + e.amount, 0);
  const getTodayCalories = () =>
    getDayEntries(foodEntries).reduce((sum, e) => sum + e.calories, 0);
  const getTodayMacros = () => {
    const entries = getDayEntries(foodEntries);
    return {
      protein: entries.reduce((sum, e) => sum + e.protein, 0),
      carbs: entries.reduce((sum, e) => sum + e.carbs, 0),
      fat: entries.reduce((sum, e) => sum + e.fat, 0),
    };
  };
  const getTodayWorkoutMinutes = () =>
    getDayEntries(workoutEntries).reduce((sum, e) => sum + e.duration, 0);
  const getTodaySleep = () => getDayEntries(sleepEntries)[0];

  const getTodayCustomHabitStatus = () => {
    const todayLogs = getDayEntries(customHabitLogs);
    return customHabits
      .filter(habit => habit.isActive)
      .map(habit => {
        const log = todayLogs.find(entry => entry.habitId === habit.id);
        return isCustomHabitComplete(habit, log);
      });
  };

  const getProgressPercent = () => {
    const habits = [
      getTodayWaterTotal() >= goals.water,
      getTodayWorkoutMinutes() >= goals.workoutMinutes,
      getTodayCalories() > 0 && getTodayCalories() <= goals.calories,
      !!getTodaySleep(),
      ...getTodayCustomHabitStatus(),
    ];
    return (habits.filter(Boolean).length / habits.length) * 100;
  };

  const getCompletedHabits = () => {
    const habits = [
      getTodayWaterTotal() >= goals.water,
      getTodayWorkoutMinutes() >= goals.workoutMinutes,
      getTodayCalories() > 0 && getTodayCalories() <= goals.calories,
      !!getTodaySleep(),
      ...getTodayCustomHabitStatus(),
    ];
    return habits.filter(Boolean).length;
  };

  const getTotalHabits = () =>
    4 + customHabits.filter(habit => habit.isActive).length;

  const streaks = useMemo(() => {
    const today = new Date();
    const calcStreak = (checkFn: (dateStr: string) => boolean): number => {
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        if (checkFn(dateStr)) streak++;
        else break;
      }
      return streak;
    };

    return {
      water: calcStreak(
        d =>
          waterEntries
            .filter(e => e.date === d)
            .reduce((s, e) => s + e.amount, 0) >= goals.water
      ),
      workout: calcStreak(d => workoutEntries.some(e => e.date === d)),
      food: calcStreak(d => foodEntries.some(e => e.date === d)),
      sleep: calcStreak(d => sleepEntries.some(e => e.date === d)),
      weight: calcStreak(d => weightEntries.some(e => e.date === d)),
    };
  }, [
    waterEntries,
    workoutEntries,
    foodEntries,
    sleepEntries,
    weightEntries,
    goals,
  ]);

  const xp = useMemo(() => {
    const waterAfterReset = waterEntries.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const workoutsAfterReset = workoutEntries.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const foodAfterReset = foodEntries.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const sleepAfterReset = sleepEntries.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const weightAfterReset = weightEntries.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const measurementsAfterReset = bodyMeasurements.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const photosAfterReset = progressPhotos.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );
    const customLogsAfterReset = customHabitLogs.filter(entry =>
      isAfterGamificationReset(entry, gamificationResetAt)
    );

    const baseXP =
      waterAfterReset.length * 5 +
      workoutsAfterReset.length * 50 +
      foodAfterReset.length * 10 +
      sleepAfterReset.length * 20 +
      weightAfterReset.length * 15 +
      measurementsAfterReset.length * 15 +
      photosAfterReset.length * 30;

    // Bônus por jejuns concluídos (meta atingida)
    const fastingBonus = fastingSessions
      .filter(
        s =>
          !s.isActive &&
          s.endTime &&
          isFastingAfterGamificationReset(s, gamificationResetAt)
      )
      .reduce((acc, s) => {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime!).getTime();
        const elapsed = (end - start) / (1000 * 60 * 60);
        return acc + (elapsed >= s.targetDuration ? 50 : 0);
      }, 0);

    const customHabitXP = customLogsAfterReset.reduce((sum, log) => {
      const habit = customHabits.find(item => item.id === log.habitId);
      return habit && isCustomHabitComplete(habit, log) ? sum + habit.xp : sum;
    }, 0);

    return baseXP + fastingBonus + customHabitXP;
  }, [
    waterEntries,
    workoutEntries,
    foodEntries,
    sleepEntries,
    weightEntries,
    bodyMeasurements,
    progressPhotos,
    fastingSessions,
    customHabits,
    customHabitLogs,
    gamificationResetAt,
  ]);

  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = level * 100;

  const timeToMinutes = (value: string): number => {
    const [hourRaw, minuteRaw] = value.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
    return hour * 60 + minute;
  };

  const isQuietHoursNow = (
    nowTime: string,
    quietStart: string,
    quietEnd: string
  ): boolean => {
    const nowMinutes = timeToMinutes(nowTime);
    const startMinutes = timeToMinutes(quietStart);
    const endMinutes = timeToMinutes(quietEnd);

    if (startMinutes === endMinutes) return false;
    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }

    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  };

  const emitNotification = useCallback(
    ({
      key,
      title,
      body,
      toastMessage,
    }: {
      key: string;
      title: string;
      body: string;
      toastMessage?: string;
    }) => {
      if (notificationKeysRef.current.has(key)) return false;
      notificationKeysRef.current.add(key);

      toast.info(toastMessage || body);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, tag: key });
      }

      return true;
    },
    []
  );

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  const setNotificationPreferences = async (
    updates: Partial<NotificationPreferences>
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const nextPreferences = normalizeNotificationPreferences({
      ...notificationPreferences,
      ...updates,
    });

    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      enabled: nextPreferences.enabled,
      water_enabled: nextPreferences.waterEnabled,
      water_time: nextPreferences.waterTime,
      meal_enabled: nextPreferences.mealEnabled,
      meal_time: nextPreferences.mealTime,
      workout_enabled: nextPreferences.workoutEnabled,
      workout_time: nextPreferences.workoutTime,
      fasting_start_enabled: nextPreferences.fastingStartEnabled,
      fasting_start_time: nextPreferences.fastingStartTime,
      fasting_phase_enabled: nextPreferences.fastingPhaseEnabled,
      fasting_end_enabled: nextPreferences.fastingEndEnabled,
      sleep_enabled: nextPreferences.sleepEnabled,
      sleep_time: nextPreferences.sleepTime,
      daily_summary_enabled: nextPreferences.dailySummaryEnabled,
      daily_summary_time: nextPreferences.dailySummaryTime,
      quiet_hours_enabled: nextPreferences.quietHoursEnabled,
      quiet_start: nextPreferences.quietStart,
      quiet_end: nextPreferences.quietEnd,
      frequency: nextPreferences.frequency,
      active_days: nextPreferences.activeDays,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Nao foi possivel salvar as notificacoes.");
      throw error;
    }

    setNotificationPreferencesState(nextPreferences);
    void logAuditEvent({
      action: "notification_preferences_updated",
      scope: "notifications",
      metadata: {
        enabled: nextPreferences.enabled,
        frequency: nextPreferences.frequency,
      },
    });
  };

  const sendTestNotification = async (type: NotificationTestType) => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const templates: Record<NotificationTestType, { title: string; body: string }> = {
      water: {
        title: "FitLife • Agua",
        body: "Hora da hidratacao — Beba 300 ml agora.",
      },
      meal: {
        title: "FitLife • Refeicoes",
        body: "Lembrete de refeicao — Planeje a proxima refeicao.",
      },
      workout: {
        title: "FitLife • Treino",
        body: "Treino do dia — Alguns minutos hoje mantem seu streak vivo.",
      },
      fasting_start: {
        title: "FitLife • Jejum",
        body: "Pronto para iniciar seu jejum no horario planejado?",
      },
      fasting_phase: {
        title: "FitLife • Fase do Jejum",
        body: "Fase avancada alcancada. Continue firme e hidratado.",
      },
      fasting_end: {
        title: "FitLife • Meta de Jejum",
        body: "Meta atingida — Deseja encerrar agora?",
      },
      sleep: {
        title: "FitLife • Sono",
        body: "Rotina de sono — Hora de desacelerar para dormir melhor.",
      },
      daily_summary: {
        title: "FitLife • Resumo Diario",
        body: "Seu resumo do dia esta pronto para revisao.",
      },
    };

    const template = templates[type];
    emitNotification({
      key: `test:${type}:${Date.now()}`,
      title: template.title,
      body: template.body,
      toastMessage: `Teste enviado: ${template.body}`,
    });
  };

  useEffect(() => {
    if (loading || typeof window === "undefined") return;

    const notifyScheduledEvents = () => {
      const now = new Date();
      const dateStr = formatDate(now);
      const timeStr = now.toTimeString().slice(0, 5);
      const dayLogs = customHabitLogs.filter(log => log.date === dateStr);
      const dayKey = now.getDay();
      const weekDayMap: NotificationDay[] = [
        "sun",
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
      ];
      const weekDay = weekDayMap[dayKey];

      if (notificationDateRef.current !== dateStr) {
        notificationDateRef.current = dateStr;
        notificationKeysRef.current.clear();
      }

      if (!notificationPreferences.enabled) return;
      if (!notificationPreferences.activeDays.includes(weekDay)) return;
      if (
        notificationPreferences.quietHoursEnabled &&
        isQuietHoursNow(
          timeStr,
          notificationPreferences.quietStart,
          notificationPreferences.quietEnd
        )
      ) {
        return;
      }

      const waterTotal = waterEntries
        .filter(entry => entry.date === dateStr)
        .reduce((sum, entry) => sum + entry.amount, 0);
      const caloriesTotal = foodEntries
        .filter(entry => entry.date === dateStr)
        .reduce((sum, entry) => sum + entry.calories, 0);
      const workoutMinutes = workoutEntries
        .filter(entry => entry.date === dateStr)
        .reduce((sum, entry) => sum + entry.duration, 0);
      const hasSleep = sleepEntries.some(entry => entry.date === dateStr);
      const activeFasting = fastingSessions.find(session => session.isActive);

      if (
        notificationPreferences.waterEnabled &&
        notificationPreferences.waterTime === timeStr &&
        waterTotal < goals.water
      ) {
        const remainingWater = Math.max(0, goals.water - waterTotal);
        emitNotification({
          key: `water:${dateStr}:${timeStr}`,
          title: "FitLife • Agua",
          body: `Hora da hidratacao — Faltam ${remainingWater} ml para a meta.`,
        });
      }

      if (
        notificationPreferences.mealEnabled &&
        notificationPreferences.mealTime === timeStr &&
        caloriesTotal <= Math.round(goals.calories * 0.5)
      ) {
        emitNotification({
          key: `meal:${dateStr}:${timeStr}`,
          title: "FitLife • Refeicoes",
          body:
            caloriesTotal === 0
              ? "Lembrete de refeicao — Registre sua primeira refeicao do dia."
              : "Lembrete de refeicao — Ajuste sua alimentacao para manter a meta.",
        });
      }

      if (
        notificationPreferences.workoutEnabled &&
        notificationPreferences.workoutTime === timeStr &&
        workoutMinutes < goals.workoutMinutes
      ) {
        const remainingWorkout = Math.max(0, goals.workoutMinutes - workoutMinutes);
        emitNotification({
          key: `workout:${dateStr}:${timeStr}`,
          title: "FitLife • Treino",
          body: `Treino do dia — Faltam ${remainingWorkout} min para sua meta.`,
        });
      }

      if (
        notificationPreferences.fastingStartEnabled &&
        notificationPreferences.fastingStartTime === timeStr &&
        !activeFasting
      ) {
        emitNotification({
          key: `fasting-start:${dateStr}:${timeStr}`,
          title: "FitLife • Jejum",
          body: "Seu horario de jejum chegou. Quer iniciar agora?",
        });
      }

      if (activeFasting) {
        const elapsedHours =
          (now.getTime() - new Date(activeFasting.startTime).getTime()) /
          (1000 * 60 * 60);

        if (notificationPreferences.fastingPhaseEnabled) {
          const milestones =
            notificationPreferences.frequency === "light"
              ? [12]
              : notificationPreferences.frequency === "strong"
                ? [4, 8, 12, 16, 20]
                : [8, 12, 16];

          const phaseLabels: Record<number, string> = {
            4: "Queda de glicose",
            8: "Transicao metabolica",
            12: "Queima de gordura",
            16: "Cetose leve",
            20: "Jejum prolongado",
          };

          milestones.forEach(milestone => {
            if (elapsedHours >= milestone) {
              emitNotification({
                key: `fasting-phase:${activeFasting.id}:${milestone}`,
                title: "FitLife • Fase do Jejum",
                body: `${milestone}h concluidas — ${phaseLabels[milestone] || "Fase avancada"}.`,
              });
            }
          });
        }

        if (
          notificationPreferences.fastingEndEnabled &&
          elapsedHours >= activeFasting.targetDuration
        ) {
          emitNotification({
            key: `fasting-end:${activeFasting.id}`,
            title: "FitLife • Meta de Jejum",
            body: "Meta de jejum batida. Deseja encerrar agora?",
          });
        }
      }

      if (
        notificationPreferences.sleepEnabled &&
        notificationPreferences.sleepTime === timeStr &&
        !hasSleep
      ) {
        emitNotification({
          key: `sleep:${dateStr}:${timeStr}`,
          title: "FitLife • Sono",
          body: "Rotina de sono — Hora de desacelerar para dormir melhor.",
        });
      }

      if (
        notificationPreferences.dailySummaryEnabled &&
        notificationPreferences.dailySummaryTime === timeStr
      ) {
        const waterDone = waterTotal >= goals.water;
        const workoutDone = workoutMinutes >= goals.workoutMinutes;
        const foodDone = caloriesTotal > 0 && caloriesTotal <= goals.calories;
        const sleepDone = hasSleep;
        const customStatus = customHabits
          .filter(habit => habit.isActive)
          .map(habit => {
            const log = dayLogs.find(entry => entry.habitId === habit.id);
            return isCustomHabitComplete(habit, log);
          });
        const completedCount = [
          waterDone,
          workoutDone,
          foodDone,
          sleepDone,
          ...customStatus,
        ].filter(Boolean).length;
        const totalCount = 4 + customStatus.length;

        emitNotification({
          key: `daily-summary:${dateStr}:${timeStr}`,
          title: "FitLife • Resumo Diario",
          body: `${completedCount} de ${totalCount} metas concluidas hoje.`,
        });
      }

      for (const habit of customHabits) {
        if (
          !habit.isActive ||
          !habit.reminderEnabled ||
          habit.reminderTime !== timeStr
        )
          continue;

        const log = dayLogs.find(entry => entry.habitId === habit.id);
        if (isCustomHabitComplete(habit, log)) continue;

        emitNotification({
          key: `custom:${habit.id}:${dateStr}:${timeStr}`,
          title: "FitLife • Habito Personalizado",
          body: `Hora de fazer: ${habit.name}`,
          toastMessage: `Lembrete: ${habit.name}`,
        });
      }
    };

    notifyScheduledEvents();
    const intervalId = window.setInterval(notifyScheduledEvents, 30000);

    return () => window.clearInterval(intervalId);
  }, [
    customHabits,
    customHabitLogs,
    emitNotification,
    fastingSessions,
    foodEntries,
    goals.calories,
    goals.water,
    goals.workoutMinutes,
    loading,
    notificationPreferences,
    sleepEntries,
    waterEntries,
    workoutEntries,
  ]);

  // Verificar conquistas
  useEffect(() => {
    const checkAchievements = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newUnlocked: string[] = [];
      const isUnlocked = (id: string) =>
        achievements.find(achievement => achievement.id === id)?.unlocked;
      const queueAchievement = (condition: boolean, id: string) => {
        if (condition && !isUnlocked(id) && !newUnlocked.includes(id))
          newUnlocked.push(id);
      };

      const waterAfterReset = waterEntries.filter(entry =>
        isAfterGamificationReset(entry, gamificationResetAt)
      );
      const workoutsAfterReset = workoutEntries.filter(entry =>
        isAfterGamificationReset(entry, gamificationResetAt)
      );
      const foodAfterReset = foodEntries.filter(entry =>
        isAfterGamificationReset(entry, gamificationResetAt)
      );
      const customHabitsAfterReset = customHabits.filter(habit =>
        isAfterGamificationReset(habit, gamificationResetAt)
      );
      const customLogsAfterReset = customHabitLogs.filter(entry =>
        isAfterGamificationReset(entry, gamificationResetAt)
      );
      const activeCustomHabits = customHabits.filter(habit => habit.isActive);
      const completedCustomLogs = customLogsAfterReset.filter(log => {
        const habit = customHabits.find(item => item.id === log.habitId);
        return habit ? isCustomHabitComplete(habit, log) : false;
      });
      const customHabitXp = completedCustomLogs.reduce((sum, log) => {
        const habit = customHabits.find(item => item.id === log.habitId);
        return habit ? sum + habit.xp : sum;
      }, 0);
      const activeCustomCategories = new Set(
        activeCustomHabits.map(habit => habit.category)
      );
      const customCompletionsByDate = completedCustomLogs.reduce((map, log) => {
        map.set(log.date, (map.get(log.date) || 0) + 1);
        return map;
      }, new Map<string, number>());
      const customDatesByHabit = completedCustomLogs.reduce((map, log) => {
        const dates = map.get(log.habitId) || new Set<string>();
        dates.add(log.date);
        map.set(log.habitId, dates);
        return map;
      }, new Map<string, Set<string>>());

      // Lógica simplificada de conquistas para o exemplo
      queueAchievement(waterAfterReset.length >= 1, "a1");
      queueAchievement(workoutsAfterReset.length >= 1, "a4");
      queueAchievement(foodAfterReset.length >= 1, "a8");
      queueAchievement(customHabitsAfterReset.length >= 1, "a19");
      queueAchievement(completedCustomLogs.length >= 1, "a20");
      queueAchievement(
        Array.from(customDatesByHabit.values()).some(dates => dates.size >= 7),
        "a21"
      );
      queueAchievement(
        Array.from(customCompletionsByDate.values()).some(count => count >= 3),
        "a22"
      );
      queueAchievement(activeCustomHabits.length >= 5, "a23");
      queueAchievement(completedCustomLogs.length >= 10, "a24");
      queueAchievement(completedCustomLogs.length >= 25, "a25");
      queueAchievement(
        activeCustomHabits.some(habit => habit.difficulty === "hard"),
        "a26"
      );
      queueAchievement(
        activeCustomCategories.size >=
          Object.keys(CUSTOM_HABIT_CATEGORIES).length,
        "a27"
      );
      queueAchievement(customHabitXp >= 500, "a28");
      queueAchievement(
        activeCustomHabits.some(habit => habit.reminderEnabled),
        "a29"
      );

      for (const id of newUnlocked) {
        await supabase.from("unlocked_achievements").upsert({
          user_id: user.id,
          achievement_id: id,
          unlocked_date: formatDate(new Date()),
        });
        toast.success(
          `Conquista Desbloqueada: ${achievements.find(a => a.id === id)?.title}`
        );
      }

      if (newUnlocked.length > 0) {
        setAchievements(prev =>
          prev.map(a =>
            newUnlocked.includes(a.id)
              ? { ...a, unlocked: true, unlockedDate: formatDate(new Date()) }
              : a
          )
        );
      }
    };

    if (!loading) checkAchievements();
  }, [
    waterEntries,
    workoutEntries,
    foodEntries,
    customHabits,
    customHabitLogs,
    achievements,
    gamificationResetAt,
    loading,
  ]);

  const value = {
    currentDate,
    setCurrentDate,
    waterEntries,
    addWaterEntry,
    removeLastWaterEntry,
    resetWaterToday,
    workoutEntries,
    addWorkoutEntry,
    removeWorkoutEntry,
    foodEntries,
    savedMeals,
    addFoodEntry,
    removeFoodEntry,
    addSavedMeal,
    removeSavedMeal,
    foodLibrary,
    addFoodLibraryItem,
    removeFoodLibraryItem,
    sleepEntries,
    addSleepEntry,
    removeSleepEntry,
    weightEntries,
    addWeightEntry,
    removeWeightEntry,
    bodyMeasurements,
    addBodyMeasurement,
    removeBodyMeasurement,
    userProfile,
    setUserProfile,
    goals,
    setGoals,
    calculateAutoGoals,
    streaks,
    achievements,
    resetAchievements,
    resetAllData,
    progressPhotos,
    addProgressPhoto,
    removeProgressPhoto,
    fastingSessions,
    startFasting,
    updateActiveFasting,
    endFasting,
    removeFastingSession,
    customHabits,
    customHabitLogs,
    addCustomHabit,
    updateCustomHabit,
    removeCustomHabit,
    setCustomHabitLog,
    removeCustomHabitLog,
    getDayEntries,
    getTodayWaterTotal,
    getTodayCalories,
    getTodayMacros,
    getTodayWorkoutMinutes,
    getTodaySleep,
    getProgressPercent,
    getCompletedHabits,
    getTotalHabits,
    xp,
    level,
    xpToNextLevel,
    requestNotificationPermission,
    notificationPreferences,
    setNotificationPreferences,
    sendTestNotification,
  };

  if (loading) return null;

  return (
    <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context)
    throw new Error("useHabits must be used within a HabitsProvider");
  return context;
}
