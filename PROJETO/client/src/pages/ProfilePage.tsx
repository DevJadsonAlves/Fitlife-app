import { useState, useEffect } from "react";
import {
  useHabits,
  type NotificationDay,
  type NotificationPreferences,
  type NotificationTestType,
  type UserProfile,
} from "@/contexts/HabitsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  User,
  Save,
  Calculator,
  Activity,
  Target,
  Bell,
  BellOff,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  LogOut,
  Sun,
  Moon,
  Download,
  Bug,
  Flame,
  Droplets,
  UtensilsCrossed,
  Dumbbell,
  MoonStar,
  CalendarCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import { getLocalClientErrors } from "@/lib/observability";

const EXPORT_USER_TABLES = [
  "water_entries",
  "workout_entries",
  "food_entries",
  "saved_meals",
  "food_library",
  "sleep_entries",
  "weight_entries",
  "body_measurements",
  "progress_photos",
  "fasting_sessions",
  "custom_habits",
  "custom_habit_logs",
  "unlocked_achievements",
  "user_goals",
  "notification_preferences",
] as const;

const WEEK_DAY_OPTIONS: Array<{ day: NotificationDay; label: string }> = [
  { day: "sun", label: "D" },
  { day: "mon", label: "S" },
  { day: "tue", label: "T" },
  { day: "wed", label: "Q" },
  { day: "thu", label: "Q" },
  { day: "fri", label: "S" },
  { day: "sat", label: "S" },
];

const NOTIFICATION_TEST_ACTIONS: Array<{
  type: NotificationTestType;
  label: string;
}> = [
  { type: "water", label: "Teste Agua" },
  { type: "meal", label: "Teste Refeicao" },
  { type: "workout", label: "Teste Treino" },
  { type: "fasting_start", label: "Teste Inicio Jejum" },
  { type: "fasting_phase", label: "Teste Fase Jejum" },
  { type: "fasting_end", label: "Teste Fim Jejum" },
  { type: "sleep", label: "Teste Sono" },
  { type: "daily_summary", label: "Teste Resumo Diario" },
];

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function ProfilePage() {
  const {
    userProfile,
    setUserProfile,
    requestNotificationPermission,
    resetAllData,
    resetAchievements,
    notificationPreferences,
    setNotificationPreferences,
    sendTestNotification,
  } = useHabits();
  const { theme, toggleTheme } = useTheme();
  const [resetting, setResetting] = useState<"all" | "gamification" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingDiagnostics, setExportingDiagnostics] = useState(false);
  const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);
  const [sendingTestType, setSendingTestType] =
    useState<NotificationTestType | null>(null);
  const [formData, setFormData] = useState<UserProfile>(userProfile || {
    name: "",
    age: 25,
    gender: "male",
    height: 170,
    weight: 70,
    activityLevel: "moderate",
    goal: "maintain"
  });
  const [ageInput, setAgeInput] = useState(String((userProfile || { age: 25 }).age));
  const [heightInput, setHeightInput] = useState(String((userProfile || { height: 170 }).height));
  const [weightInput, setWeightInput] = useState(String((userProfile || { weight: 70 }).weight));

  useEffect(() => {
    if (userProfile) {
      setFormData(userProfile);
      setAgeInput(String(userProfile.age));
      setHeightInput(String(userProfile.height));
      setWeightInput(String(userProfile.weight));
    }
  }, [userProfile]);

  const handleSave = () => {
    const age = Number.parseInt(ageInput, 10);
    const height = Number.parseInt(heightInput, 10);
    const weight = Number.parseFloat(weightInput.replace(",", "."));

    if (!formData.name.trim()) {
      toast.error("Por favor, insira seu nome");
      return;
    }
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      toast.error("Idade inválida (1-120)");
      return;
    }
    if (!Number.isFinite(height) || height < 50 || height > 250) {
      toast.error("Altura inválida (50-250cm)");
      return;
    }
    if (!Number.isFinite(weight) || weight < 20 || weight > 500) {
      toast.error("Peso inválido (20-500kg)");
      return;
    }
    const nextProfile: UserProfile = {
      ...formData,
      age,
      height,
      weight,
    };
    setFormData(nextProfile);
    setUserProfile(nextProfile);
    toast.success("Perfil e metas atualizados!");
  };

  const updateNotificationPrefs = async (
    updates: Partial<NotificationPreferences>
  ) => {
    setSavingNotificationPrefs(true);
    try {
      await setNotificationPreferences(updates);
    } catch (error) {
      console.error("Erro ao atualizar notificacoes:", error);
      toast.error("Nao foi possivel atualizar as notificacoes.");
    } finally {
      setSavingNotificationPrefs(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast.success("Permissao de notificacao concedida.");
    } else {
      toast.error("Permissao de notificacao negada.");
    }
  };

  const toggleActiveDay = async (day: NotificationDay) => {
    const days = notificationPreferences.activeDays.includes(day)
      ? notificationPreferences.activeDays.filter(item => item !== day)
      : [...notificationPreferences.activeDays, day];

    await updateNotificationPrefs({
      activeDays: days.length > 0 ? days : [day],
    });
  };

  const handleSendTestNotification = async (type: NotificationTestType) => {
    setSendingTestType(type);
    try {
      await sendTestNotification(type);
    } finally {
      setSendingTestType(null);
    }
  };

  const handleFullReset = async () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODOS os seus dados (treinos, alimentação, peso, perfil e conquistas). Esta ação não pode ser desfeita. Deseja continuar?")) {
      setResetting("all");
      try {
        await resetAllData();
        void logAuditEvent({
          action: "full_data_reset_from_profile",
          scope: "profile",
        });
        toast.success("Todos os dados foram apagados.");
        window.location.href = "/";
      } catch (error) {
        console.error("Erro ao apagar dados:", error);
        toast.error("Não foi possível apagar os dados. Tente novamente.");
        setResetting(null);
      }
    }
  };

  const handleGamificationReset = async () => {
    if (window.confirm("Isso resetará apenas suas conquistas, nível e XP. Seu histórico de saúde será mantido. Continuar?")) {
      setResetting("gamification");
      try {
        await resetAchievements();
        void logAuditEvent({
          action: "gamification_reset_from_profile",
          scope: "profile",
        });
        toast.success("Gamificação resetada!");
      } catch (error) {
        console.error("Erro ao resetar gamificação:", error);
        toast.error("Não foi possível resetar a gamificação. Tente novamente.");
      } finally {
        setResetting(null);
      }
    }
  };

  const handleSignOut = async () => {
    await logAuditEvent({
      action: "sign_out",
      scope: "auth",
    });
    await supabase.auth.signOut();
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Usuário não autenticado.");
        return;
      }

      const [profileResult, ...tableResults] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        ...EXPORT_USER_TABLES.map(table =>
          supabase.from(table).select("*").eq("user_id", user.id)
        ),
      ]);

      if (profileResult.error) throw profileResult.error;

      const exportTables = EXPORT_USER_TABLES.reduce<Record<string, unknown[]>>(
        (acc, table, index) => {
          const result = tableResults[index];
          if (result.error) throw result.error;
          acc[table] = result.data ?? [];
          return acc;
        },
        {}
      );

      const nowIso = new Date().toISOString();
      const fileDate = nowIso.slice(0, 10);

      const exportPayload = {
        app: "FitLife",
        version: "1.0",
        exportedAt: nowIso,
        userId: user.id,
        profile: profileResult.data ?? null,
        tables: exportTables,
      };

      downloadJsonFile(`fitlife-backup-${fileDate}.json`, exportPayload);
      void logAuditEvent({
        action: "data_export",
        scope: "profile",
        metadata: {
          tableCount: EXPORT_USER_TABLES.length + 1,
        },
      });
      toast.success("Backup exportado com sucesso.");
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast.error("Não foi possível exportar os dados.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportDiagnostics = () => {
    setExportingDiagnostics(true);
    try {
      const errors = getLocalClientErrors();
      const payload = {
        app: "FitLife",
        exportedAt: new Date().toISOString(),
        errors,
      };

      downloadJsonFile("fitlife-diagnostico-client.json", payload);
      toast.success(`Diagnóstico exportado (${errors.length} erros locais).`);
    } catch (error) {
      console.error("Erro ao exportar diagnóstico:", error);
      toast.error("Não foi possível exportar o diagnóstico.");
    } finally {
      setExportingDiagnostics(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10">
            <User className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-400">Seu Perfil</h2>
            <p className="text-sm text-muted-foreground">Personalize suas metas e informacoes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-card text-muted-foreground transition-all hover:border-emerald-500/40 hover:text-foreground"
        >
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-emerald-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border/50 bg-card p-6 sm:p-8 space-y-8 shadow-xl shadow-black/20"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Seu nome"
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-sm focus:border-emerald-500/50 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Gênero</label>
            <div className="grid grid-cols-2 gap-2">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setFormData({ ...formData, gender: g as any })}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.gender === g 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {g === "male" ? "Masculino" : "Feminino"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Idade</label>
            <input
              type="number"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-sm font-mono focus:border-emerald-500/50 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Altura (cm)</label>
              <input
                type="number"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-sm font-mono focus:border-emerald-500/50 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Peso (kg)</label>
              <input
                type="number"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-sm font-mono focus:border-emerald-500/50 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Nível de Atividade
            </label>
            <select
              value={formData.activityLevel}
              onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as any })}
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-sm focus:border-emerald-500/50 focus:outline-none transition-all appearance-none"
            >
              <option value="sedentary">Sedentário (Pouco ou nenhum exercício)</option>
              <option value="light">Leve (Exercício 1-3 dias/semana)</option>
              <option value="moderate">Moderado (Exercício 3-5 dias/semana)</option>
              <option value="active">Ativo (Exercício 6-7 dias/semana)</option>
              <option value="very_active">Muito Ativo (Atleta ou trabalho físico pesado)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Seu Objetivo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["lose", "maintain", "gain"].map((goal) => (
                <button
                  key={goal}
                  onClick={() => setFormData({ ...formData, goal: goal as any })}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    formData.goal === goal 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10" 
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {goal === "lose" ? "Emagrecer" : goal === "maintain" ? "Manter" : "Ganhar Massa"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleSave}
            className="py-3.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            Salvar e Calcular Metas
          </button>
          
          <button
            onClick={handleEnableNotifications}
            className="py-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-blue-500/20"
          >
            <Bell className="w-4 h-4" />
            Permitir Notificacoes
          </button>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Calculator className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2">
                Como funciona o cálculo? <CheckCircle2 className="w-4 h-4 opacity-50" />
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nossa inteligência calcula suas metas ideais de calorias e nutrientes baseada no seu corpo e nível de atividade física. 
                As metas são ajustadas automaticamente para ajudar você a atingir seu objetivo de forma saudável.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Notificacoes Inteligentes
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste horarios, intensidade, dias da semana e teste cada tipo de alerta.
              </p>
            </div>
            <button
              type="button"
              disabled={savingNotificationPrefs}
              onClick={() =>
                void updateNotificationPrefs({
                  enabled: !notificationPreferences.enabled,
                })
              }
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50 ${
                notificationPreferences.enabled
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-border/50 bg-secondary/20 text-muted-foreground"
              }`}
            >
              {notificationPreferences.enabled ? "Notificacoes ON" : "Notificacoes OFF"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Intensidade
              </label>
              <select
                value={notificationPreferences.frequency}
                disabled={savingNotificationPrefs}
                onChange={event =>
                  void updateNotificationPrefs({
                    frequency: event.target.value as NotificationPreferences["frequency"],
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              >
                <option value="light">Leve</option>
                <option value="normal">Normal</option>
                <option value="strong">Forte</option>
              </select>
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Dias Ativos
              </label>
              <div className="grid grid-cols-7 gap-2">
                {WEEK_DAY_OPTIONS.map(option => (
                  <button
                    key={option.day}
                    type="button"
                    disabled={savingNotificationPrefs}
                    onClick={() => void toggleActiveDay(option.day)}
                    className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                      notificationPreferences.activeDays.includes(option.day)
                        ? "border-sky-500/60 bg-sky-500/20 text-sky-300"
                        : "border-border/50 bg-background/50 text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">Quiet Hours</p>
              <button
                type="button"
                disabled={savingNotificationPrefs}
                onClick={() =>
                  void updateNotificationPrefs({
                    quietHoursEnabled: !notificationPreferences.quietHoursEnabled,
                  })
                }
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  notificationPreferences.quietHoursEnabled
                    ? "border-violet-500/50 bg-violet-500/20 text-violet-300"
                    : "border-border/50 bg-background/50 text-muted-foreground"
                }`}
              >
                {notificationPreferences.quietHoursEnabled ? "Ativo" : "Inativo"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Inicio</label>
                <input
                  type="time"
                  value={notificationPreferences.quietStart}
                  onChange={event =>
                    void updateNotificationPrefs({ quietStart: event.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Fim</label>
                <input
                  type="time"
                  value={notificationPreferences.quietEnd}
                  onChange={event =>
                    void updateNotificationPrefs({ quietEnd: event.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Droplets className="w-4 h-4" /> Agua
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      waterEnabled: !notificationPreferences.waterEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    notificationPreferences.waterEnabled
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {notificationPreferences.waterEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="time"
                value={notificationPreferences.waterTime}
                onChange={event =>
                  void updateNotificationPrefs({ waterTime: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              />
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-lime-300 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" /> Refeicoes
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      mealEnabled: !notificationPreferences.mealEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    notificationPreferences.mealEnabled
                      ? "bg-lime-500/20 text-lime-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {notificationPreferences.mealEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="time"
                value={notificationPreferences.mealTime}
                onChange={event =>
                  void updateNotificationPrefs({ mealTime: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              />
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-orange-300 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" /> Treino
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      workoutEnabled: !notificationPreferences.workoutEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    notificationPreferences.workoutEnabled
                      ? "bg-orange-500/20 text-orange-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {notificationPreferences.workoutEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="time"
                value={notificationPreferences.workoutTime}
                onChange={event =>
                  void updateNotificationPrefs({ workoutTime: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              />
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-red-300 flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Jejum
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      fastingStartEnabled: !notificationPreferences.fastingStartEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    notificationPreferences.fastingStartEnabled
                      ? "bg-red-500/20 text-red-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Inicio {notificationPreferences.fastingStartEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="time"
                value={notificationPreferences.fastingStartTime}
                onChange={event =>
                  void updateNotificationPrefs({
                    fastingStartTime: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      fastingPhaseEnabled: !notificationPreferences.fastingPhaseEnabled,
                    })
                  }
                  className={`px-2.5 py-2 rounded-md text-xs font-bold ${
                    notificationPreferences.fastingPhaseEnabled
                      ? "bg-red-500/20 text-red-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Fases {notificationPreferences.fastingPhaseEnabled ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      fastingEndEnabled: !notificationPreferences.fastingEndEnabled,
                    })
                  }
                  className={`px-2.5 py-2 rounded-md text-xs font-bold ${
                    notificationPreferences.fastingEndEnabled
                      ? "bg-red-500/20 text-red-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Fim {notificationPreferences.fastingEndEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <MoonStar className="w-4 h-4" /> Sono
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      sleepEnabled: !notificationPreferences.sleepEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    notificationPreferences.sleepEnabled
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {notificationPreferences.sleepEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="time"
                value={notificationPreferences.sleepTime}
                onChange={event =>
                  void updateNotificationPrefs({ sleepTime: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              />
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <CalendarCheck2 className="w-4 h-4" /> Resumo Diario
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void updateNotificationPrefs({
                      dailySummaryEnabled: !notificationPreferences.dailySummaryEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    notificationPreferences.dailySummaryEnabled
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {notificationPreferences.dailySummaryEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="time"
                value={notificationPreferences.dailySummaryTime}
                onChange={event =>
                  void updateNotificationPrefs({
                    dailySummaryTime: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Testar Notificacoes
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NOTIFICATION_TEST_ACTIONS.map(action => (
                <button
                  key={action.type}
                  type="button"
                  onClick={() => void handleSendTestNotification(action.type)}
                  disabled={sendingTestType === action.type}
                  className="px-2 py-2 rounded-lg border border-border/60 bg-background/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-sky-500/40 transition-all disabled:opacity-60"
                >
                  {sendingTestType === action.type ? "Enviando..." : action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Backup e Diagnóstico
          </p>
          <p className="text-sm text-muted-foreground">
            Exporte um backup completo em JSON e um diagnóstico técnico local para facilitar suporte e investigação.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting || resetting !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exportando..." : "Exportar Dados (JSON)"}
            </button>
            <button
              type="button"
              onClick={handleExportDiagnostics}
              disabled={exportingDiagnostics || resetting !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bug className="w-4 h-4" />
              {exportingDiagnostics
                ? "Gerando diagnóstico..."
                : "Exportar Diagnóstico"}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 mb-4 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Zona de Perigo</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleSignOut}
              disabled={resetting !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border/50 bg-secondary/30 text-muted-foreground text-sm font-medium hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
            <button
              onClick={handleGamificationReset}
              disabled={resetting !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {resetting === "gamification" ? "Resetando..." : "Resetar Gamificação"}
            </button>
            <button
              onClick={handleFullReset}
              disabled={resetting !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {resetting === "all" ? "Apagando..." : "Apagar Tudo (Reset Total)"}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Cuidado: Estas ações são permanentes e não podem ser desfeitas.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
