import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SignUpResult = {
  needsEmailConfirmation: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const missingSupabaseError = () =>
  new Error("Supabase chưa được cấu hình. Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase auth session timeout")), 4000)
        );

        const { data } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error("Error during auth session synchronization:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void syncSession();

    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!isMounted) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsLoading(false);
      });
      subscription = data.subscription;
    } catch (error) {
      console.error("Error setting up auth state listener:", error);
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn: async (email, password) => {
        if (!supabase) {
          throw missingSupabaseError();
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      },
      signUp: async (email, password, fullName) => {
        if (!supabase) {
          throw missingSupabaseError();
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
            data: fullName ? { full_name: fullName } : undefined,
          },
        });

        if (error) {
          throw error;
        }

        return {
          needsEmailConfirmation: !data.session,
        };
      },
      signOut: async () => {
        if (!supabase) {
          throw missingSupabaseError();
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      },
    }),
    [isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
