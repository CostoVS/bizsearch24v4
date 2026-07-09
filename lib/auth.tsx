"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  plan: "FREE" | "PREMIUM";
};

type AuthContextType = {
  user: User | null;
  login: (email: string, role?: "ADMIN" | "USER", plan?: "FREE" | "PREMIUM") => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session
    let session = null;
    try {
      session = typeof window !== 'undefined' ? localStorage.getItem("searchbiz_session") : null;
    } catch (e) {
      console.warn("localStorage is not available:", e);
    }
    let initialUser = null;
    if (session) {
      try {
        initialUser = JSON.parse(session);
      } catch (e) {
        console.error(e);
      }
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (initialUser && JSON.stringify(initialUser) !== JSON.stringify(user)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(initialUser);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false);
  }, [user]);

  const login = (email: string, role: "ADMIN" | "USER" = "USER", plan: "FREE" | "PREMIUM" = "FREE") => {
    const isOwnerAdmin = email.trim().toLowerCase() === "nicholauscostochetty@gmail.com";
    const resolvedRole = isOwnerAdmin ? "ADMIN" : role;
    const resolvedPlan = isOwnerAdmin ? "PREMIUM" : plan;

    const loggedInUser: User = {
      id: isOwnerAdmin ? "admin-1" : "user-" + Math.random().toString(36).substring(7),
      email,
      role: resolvedRole,
      plan: resolvedPlan,
    };
    
    setUser(loggedInUser);
    try {
      localStorage.setItem("searchbiz_session", JSON.stringify(loggedInUser));
    } catch (err) {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("searchbiz_session");
      localStorage.removeItem("searchbiz_remembered_email");
      localStorage.removeItem("searchbiz_remembered_password");
    } catch (err) {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  const isAdmin = context.user?.role === "ADMIN" || context.user?.email?.toLowerCase() === "nicholauscostochetty@gmail.com";
  return { ...context, isAdmin };
};
