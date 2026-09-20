import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
  browserSessionPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { cachedFetch, clearAllCachedFetch } from "@/lib/fetching-data-cache";
import { auth } from "@/lib/firebase";
import FullscreenSpinner from "@/components/ui/FullscreenSpinner";
import type { LoginData } from "@/features/auth/login/types/login-types";
import {
  AuthContextType,
  AuthUserType,
  DEFAULT_AVATAR,
  LoggedInProfileResponse,
  ProfilePayload,
  StaffRoles,
  STAFF_ROLE_KEYS,
  UserProfile,
} from "@/lib/auth/auth-types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ResolvedSession {
  userType: AuthUserType | null;
  profile: UserProfile | null;
  staffRoles: StaffRoles | null;
}

const EMPTY_SESSION: ResolvedSession = {
  userType: null,
  profile: null,
  staffRoles: null,
};

function toProfile(payload: ProfilePayload | undefined): UserProfile {
  return {
    firstName: payload?.FirstName || "User",
    lastName: payload?.LastName || "",
    middleName: payload?.MiddleName || "",
    suffix: payload?.Suffix || "",
    UID: payload?.UID || "",
    publicUID: payload?.PublicUID || "",
    email: payload?.Email || "",
    avatar: payload?.Avatar || DEFAULT_AVATAR,
    phoneNumber: payload?.PhoneNumber || "",
    City: payload?.City || "",
    barangay: payload?.Barangay || "",
    birthDate: payload?.BirthDate || "",
    sex: payload?.Sex || "",
    staffCode: payload?.StaffCode || "",
    jobTitle: payload?.JobTitle || "",
    state: payload?.State || "",
    status: payload?.Status || "",
    schoolWork: payload?.SchoolWork || "",
    ID: payload?.ID || "",
  };
}

function toStaffRoles(roles: Partial<StaffRoles> | null | undefined): StaffRoles {
  return STAFF_ROLE_KEYS.reduce((acc, key) => {
    acc[key] = roles?.[key] === true;
    return acc;
  }, {} as StaffRoles);
}

function toSession(response: LoggedInProfileResponse | null): ResolvedSession {
  const userType = response?.userType ?? null;
  if (!userType) return EMPTY_SESSION;

  return {
    userType,
    profile: toProfile(response?.profile),
    staffRoles: userType === "Staff" ? toStaffRoles(response?.roles) : null,
  };
}

async function fetchSession(force: boolean): Promise<ResolvedSession> {
  const response = await cachedFetch<LoggedInProfileResponse | null>(
    "loggedInProfile",
    {},
    { force },
  );
  return toSession(response);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<ResolvedSession>(EMPTY_SESSION);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const sessionRequestRef = useRef<{
    uid: string;
    promise: Promise<ResolvedSession>;
  } | null>(null);

  const navigate = useNavigate();

  const loadSession = useCallback((uid: string): Promise<ResolvedSession> => {
    const inFlight = sessionRequestRef.current;
    if (inFlight && inFlight.uid === uid) return inFlight.promise;

    const promise = fetchSession(true).catch((error: unknown) => {
      if (sessionRequestRef.current?.uid === uid) {
        sessionRequestRef.current = null;
      }
      throw error;
    });

    sessionRequestRef.current = { uid, promise };
    return promise;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || firebaseUser.isAnonymous) {
        sessionRequestRef.current = null;
        setUser(null);
        setSession(EMPTY_SESSION);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        setSession(await loadSession(firebaseUser.uid));
      } catch (error) {
        console.error("Failed to fetch logged in profile:", error);
        setSession(EMPTY_SESSION);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadSession]);

  const login = useCallback(
    async (data: LoginData): Promise<{ uid: string; userType: AuthUserType }> => {
      setLoading(true);
      try {
        await auth.setPersistence(
          data.rememberMe ? browserLocalPersistence : browserSessionPersistence,
        );

        const credential = await signInWithEmailAndPassword(
          auth,
          data.email,
          data.password,
        );

        const resolved = await loadSession(credential.user.uid);
        if (!resolved.userType || !resolved.profile) {
          throw new Error("No user profile found.");
        }

        setSession(resolved);
        setUser(credential.user);

        return { uid: credential.user.uid, userType: resolved.userType };
      } finally {
        setLoading(false);
      }
    },
    [loadSession],
  );

  const refreshProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    sessionRequestRef.current = null;

    try {
      setSession(await loadSession(uid));
    } catch (error) {
      console.error("Failed to refresh logged in profile:", error);
    }
  }, [loadSession]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setLoading(true);

    sessionRequestRef.current = null;

    try {
      await firebaseSignOut(auth);
    } finally {
      setUser(null);
      setSession(EMPTY_SESSION);

      try {
        clearAllCachedFetch();
      } catch (error) {
        console.warn("Failed to clear fetch cache on logout:", error);
      }

      setLoading(false);
      setIsLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      userType: session.userType,
      staffRoles: session.staffRoles,
      profile: session.profile,
      staffCode: session.profile?.staffCode || null,
      login,
      logout,
      refreshProfile,
      loading,
    }),
    [user, session, loading, login, logout, refreshProfile],
  );

  return (
    <>
      {isLoggingOut && <FullscreenSpinner />}
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
