import { useState, useEffect } from "react";
import { useHabits, type UserProfile } from "@/contexts/HabitsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { User, Save, Calculator, Activity, Target, Bell, BellOff, CheckCircle2, Trash2, AlertTriangle, LogOut, Sun, Moon, Download, Bug } from "lucide-react";
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
] as const;

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
  const { userProfile, setUserProfile, requestNotificationPermission, resetAllData, resetAchievements } = useHabits();
  const { theme, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [resetting, setResetting] = useState<"all" | "gamification" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingDiagnostics, setExportingDiagnostics] = useState(false);
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

  const handleToggleNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled(!notificationsEnabled);
      toast.success(notificationsEnabled ? "Lembretes desativados" : "Lembretes ativados!");
    } else {
      toast.error("Permissão de notificação negada");
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
            onClick={handleToggleNotifications}
            className={`py-3.5 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
              notificationsEnabled 
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                : "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
            }`}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-4 h-4" />
                Lembretes Ativados
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                Ativar Lembretes
              </>
            )}
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
