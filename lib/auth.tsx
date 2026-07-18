"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  plan: "FREE" | "PREMIUM" | "ESSENTIAL" | "PRO" | "SPONSOR";
  fullName?: string;
  address?: string;
  businessName?: string;
  businessCategory?: string;
  phone?: string;
  idNumber?: string;
  memberId?: string;
};

type AuthContextType = {
  user: User | null;
  login: (
    email: string, 
    role?: "ADMIN" | "USER", 
    plan?: "FREE" | "PREMIUM" | "ESSENTIAL" | "PRO" | "SPONSOR",
    id?: string,
    fullName?: string,
    address?: string,
    businessName?: string,
    businessCategory?: string,
    phone?: string,
    idNumber?: string,
    memberId?: string
  ) => void;
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

  const login = (
    email: string, 
    role: "ADMIN" | "USER" = "USER", 
    plan: "FREE" | "PREMIUM" | "ESSENTIAL" | "PRO" | "SPONSOR" = "FREE",
    id?: string,
    fullName?: string,
    address?: string,
    businessName?: string,
    businessCategory?: string,
    phone?: string,
    idNumber?: string,
    memberId?: string
  ) => {
    const isOwnerAdmin = email.trim().toLowerCase() === "nicholauscostochetty@gmail.com" || email.trim().toLowerCase() === "admin" || email.trim().toLowerCase() === "admin@searchbiz.co.za";
    const resolvedRole = isOwnerAdmin ? "ADMIN" : role;
    const resolvedPlan = isOwnerAdmin ? "PREMIUM" : plan;

    const loggedInUser: User = {
      id: id || (isOwnerAdmin ? "admin-1" : "user-" + Math.random().toString(36).substring(7)),
      email,
      role: resolvedRole,
      plan: resolvedPlan,
      fullName,
      address,
      businessName,
      businessCategory,
      phone,
      idNumber,
      memberId: memberId || (email ? "SB-" + Math.abs(email.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0) % 900000 + 100000) : ""),
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
  const isAdmin = context.user?.role === "ADMIN" || 
                  context.user?.email?.toLowerCase() === "nicholauscostochetty@gmail.com" || 
                  context.user?.email?.toLowerCase() === "admin" ||
                  context.user?.email?.toLowerCase() === "admin@searchbiz.co.za";
  return { ...context, isAdmin };
};
