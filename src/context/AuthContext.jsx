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