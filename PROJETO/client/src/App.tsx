import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { HabitsProvider } from "./contexts/HabitsContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import WaterPage from "./pages/WaterPage";
import WorkoutPage from "./pages/WorkoutPage";
import FoodPage from "./pages/FoodPage";
import SleepPage from "./pages/SleepPage";
import WeightPage from "./pages/WeightPage";
import CustomHabitsPage from "./pages/CustomHabitsPage";
import ReportPage from "./pages/ReportPage";
import AchievementsPage from "./pages/AchievementsPage";
import ProfilePage from "./pages/ProfilePage";
import ProgressPage from "./pages/ProgressPage";
import FastingPage from "./pages/FastingPage";
import LoginPage from "./pages/LoginPage";
import { useState, useEffect } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { MotionConfig } from "framer-motion";
import { installGlobalErrorHandlers } from "./lib/observability";

const AUTH_BOOT_TIMEOUT_MS = 8000;
const MOBILE_PERF_MEDIA_QUERY = "(max-width: 768px), (pointer: coarse), (prefers-reduced-motion: reduce)";

function LoginRoute() {
  return <LoginPage />;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Tempo limite ao verificar a sessao."));
    }, timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/agua" component={WaterPage} />
        <Route path="/treinos" component={WorkoutPage} />
        <Route path="/alimentacao" component={FoodPage} />
        <Route path="/sono" component={SleepPage} />
        <Route path="/peso" component={WeightPage} />
        <Route path="/habitos" component={CustomHabitsPage} />
        <Route path="/relatorio" component={ReportPage} />
        <Route path="/conquistas" component={AchievementsPage} />
        <Route path="/perfil" component={ProfilePage} />
        <Route path="/progresso" component={ProgressPage} />
        <Route path="/jejum" component={FastingPage} />
        <Route path="/login" component={LoginRoute} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia(MOBILE_PERF_MEDIA_QUERY);
    const sync = () => setReduceMotion(media.matches);

    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    withTimeout(supabase.auth.getSession(), AUTH_BOOT_TIMEOUT_MS)
      .then(({ data: { session } }) => {
        if (isMounted) setSession(session);
      })
      .catch((error) => {
        console.error("Nao foi possivel verificar a sessao:", error);
        if (isMounted) setSession(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
        setLocation("/login"); // Garante que o usuário vá para a tela de login/reset
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setLocation]);

  useEffect(() => {
    return installGlobalErrorHandlers();
  }, []);

  if (loading) {
    return (
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </MotionConfig>
    );
  }

  // Se estiver em recuperação de senha, mostra a LoginPage com a prop de recuperação
  if (isRecovering || !session) {
    return (
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <ThemeProvider defaultTheme="dark" switchable>
          <Toaster />
          <LoginPage initialView={isRecovering ? "update-password" : "auth"} onComplete={() => setIsRecovering(false)} />
        </ThemeProvider>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark" switchable>
          <HabitsProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </HabitsProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </MotionConfig>
  );
}

export default App;
