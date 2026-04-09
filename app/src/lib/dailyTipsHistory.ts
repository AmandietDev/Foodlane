/**
 * Gestion de l'historique des conseils et défis du jour
 * Stocke les IDs des conseils/défis récents dans Supabase et localStorage (fallback)
 */

import { supabase } from "./supabaseClient";
import type { Tip, Challenge } from "./dailyTips";

const HISTORY_STORAGE_KEY = "foodlane_daily_tips_history";
const MAX_HISTORY_DAYS = 30; // Garder l'historique sur 30 jours
let canUseSupabaseTipsHistory: boolean | null = null;

function isNonBlockingSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const text = `${e.message || ""} ${e.details || ""}`.toLowerCase();
  // table manquante, schema pas à jour, RLS/policy pas encore prête
  return (
    e.code === "42P01" ||
    e.code === "42501" ||
    text.includes("daily_tips_history") ||
    text.includes("permission denied") ||
    text.includes("row-level security")
  );
}

export interface DailyTipsHistory {
  date: string; // YYYY-MM-DD
  tipId: string;
  challengeId: string;
  tipCategory?: string;
  challengeCategory?: string;
}

/**
 * Charge l'historique depuis Supabase (avec fallback localStorage)
 */
export async function loadTipsHistory(): Promise<DailyTipsHistory[]> {
  try {
    // Essayer d'abord Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && canUseSupabaseTipsHistory !== false) {
      const { data, error } = await supabase
        .from("daily_tips_history")
        .select("date, tip_id, challenge_id, tip_category, challenge_category")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(MAX_HISTORY_DAYS);

      if (!error && data) {
        canUseSupabaseTipsHistory = true;
        return data.map(row => ({
          date: row.date,
          tipId: row.tip_id,
          challengeId: row.challenge_id,
          tipCategory: row.tip_category || undefined,
          challengeCategory: row.challenge_category || undefined,
        }));
      }
      if (error && isNonBlockingSupabaseError(error)) {
        canUseSupabaseTipsHistory = false;
      }
    }
  } catch (error) {
    if (isNonBlockingSupabaseError(error)) {
      canUseSupabaseTipsHistory = false;
      console.warn("[TipsHistory] Supabase indisponible, fallback localStorage.");
    } else {
      console.error("[TipsHistory] Erreur chargement Supabase:", error);
    }
  }

  // Fallback localStorage
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored) as DailyTipsHistory[];
    
    // Nettoyer l'historique (garder seulement les 30 derniers jours)
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];
    
    return history.filter(h => h.date >= cutoffDateStr);
  } catch (error) {
    console.error("[TipsHistory] Erreur chargement localStorage:", error);
    return [];
  }
}

/**
 * Sauvegarde l'historique dans localStorage (fallback uniquement)
 */
export function saveTipsHistory(history: DailyTipsHistory[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("[TipsHistory] Erreur sauvegarde localStorage:", error);
  }
}

/**
 * Ajoute un conseil et un défi à l'historique pour aujourd'hui (Supabase + localStorage)
 */
export async function addToHistory(tip: Tip, challenge: Challenge): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  
  try {
    // Enregistrer dans Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && canUseSupabaseTipsHistory !== false) {
      const { error } = await supabase
        .from("daily_tips_history")
        .upsert({
          user_id: session.user.id,
          date: today,
          tip_id: tip.id,
          challenge_id: challenge.id,
          tip_category: tip.category,
          challenge_category: challenge.category,
        }, {
          onConflict: "user_id,date"
        });

      if (error) {
        if (isNonBlockingSupabaseError(error)) {
          canUseSupabaseTipsHistory = false;
          console.warn("[TipsHistory] Supabase indisponible, fallback localStorage.");
        } else {
          // Ne pas polluer l'UI de dev avec un overlay rouge : fallback localStorage suffit.
          console.warn("[TipsHistory] Sauvegarde Supabase non disponible, fallback localStorage.");
        }
      } else {
        canUseSupabaseTipsHistory = true;
        console.log("[TipsHistory] Enregistré dans Supabase:", { tipId: tip.id, challengeId: challenge.id });
      }
    }
  } catch (error) {
    if (isNonBlockingSupabaseError(error)) {
      canUseSupabaseTipsHistory = false;
      console.warn("[TipsHistory] Supabase indisponible, fallback localStorage.");
    } else {
      // Ne pas bloquer l'expérience utilisateur : on bascule localStorage.
      console.warn("[TipsHistory] Erreur enregistrement Supabase, fallback localStorage.");
    }
  }

  // Fallback localStorage
  if (typeof window !== "undefined") {
    try {
      const history = await loadTipsHistory();
      const filteredHistory = history.filter(h => h.date !== today);
      
      filteredHistory.push({
        date: today,
        tipId: tip.id,
        challengeId: challenge.id,
        tipCategory: tip.category,
        challengeCategory: challenge.category,
      });
      
      saveTipsHistory(filteredHistory);
    } catch (error) {
      console.error("[TipsHistory] Erreur sauvegarde localStorage:", error);
    }
  }
}

/**
 * Récupère les IDs des conseils et défis récents (derniers 7 jours)
 */
export async function getRecentIds(): Promise<{ tipIds: string[]; challengeIds: string[] }> {
  const history = await loadTipsHistory();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  
  const recentHistory = history.filter(h => h.date >= sevenDaysAgoStr);
  
  return {
    tipIds: recentHistory.map(h => h.tipId),
    challengeIds: recentHistory.map(h => h.challengeId),
  };
}

/**
 * Récupère le conseil et le défi d'aujourd'hui s'ils existent déjà
 */
export async function getTodayTips(): Promise<{ tipId: string | null; challengeId: string | null }> {
  const today = new Date().toISOString().split("T")[0];
  const history = await loadTipsHistory();
  const todayEntry = history.find(h => h.date === today);
  
  if (todayEntry) {
    return {
      tipId: todayEntry.tipId,
      challengeId: todayEntry.challengeId,
    };
  }
  
  return {
    tipId: null,
    challengeId: null,
  };
}

