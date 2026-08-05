import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isCreatingUser = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isCreatingUser.current) {
          console.log('Ignoring auth change during user creation');
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          return;
        }

        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const heartbeat = setInterval(async () => {
      const { error } = await supabase
        .from("USER")
        .update({
          last_seen: new Date().toISOString()
        })
        .eq("email", user.email);

      if (error) {
        console.error("Heartbeat failed:", error);
      }
    }, 5000); // Every 5 seconds

    return () => clearInterval(heartbeat);
  }, [user]);

  const ignoreNextAuthChange = () => {
    isCreatingUser.current = true;
    setTimeout(() => {
      isCreatingUser.current = false;
    }, 5000);
  };

  return (
    <AuthContext.Provider value={{ user, loading, ignoreNextAuthChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);