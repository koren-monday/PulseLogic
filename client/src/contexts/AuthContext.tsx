import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  signInWithToken,
  firebaseSignOut,
  subscribeToAuthState,
  getCurrentUser,
  isFirebaseConfigured,
  type User,
} from '../config/firebase';

interface AuthContextValue {
  // Auth state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // User identifiers
  userId: string | null; // Email - used as Firestore document key for consistency
  email: string | null;

  // Actions
  signInWithFirebase: (customToken: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    // If Firebase isn't configured, stop loading immediately
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
    }

    return unsubscribe;
  }, []);

  const signInWithFirebase = useCallback(async (customToken: string, email: string) => {
    setIsLoading(true);
    try {
      const firebaseUser = await signInWithToken(customToken);
      if (firebaseUser) {
        setUser(firebaseUser);
        setFallbackEmail(null);
      } else {
        // Firebase not configured - use email as fallback
        setFallbackEmail(email);
      }
    } catch (error) {
      // On error, fall back to email-based auth
      console.error('Firebase auth failed, using email fallback:', error);
      setFallbackEmail(email);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut();
    } finally {
      setUser(null);
      setFallbackEmail(null);
      setIsLoading(false);
    }
  }, []);

  // Compute derived values
  const isAuthenticated = !!user || !!fallbackEmail;
  // IMPORTANT: Use email as userId for Firestore document key consistency across platforms
  // Server stores data at firestore.collection('users').doc(email), not Firebase UID
  const userId = user?.email ?? fallbackEmail;
  const email = user?.email ?? fallbackEmail;

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    userId,
    email,
    signInWithFirebase,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
