import React, { createContext, useContext } from 'react';
import useTalentAuth from '@/features/auth/hooks/useAuth';

const CrmAuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, logout } = useTalentAuth();

  const formattedUser = user ? {
    ...user,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    avatar: user.profilePicture,
    role: user.roles?.[0]?.name || 'sales_executive',
  } : null;

  const value = {
    user: formattedUser,
    isAuthenticated: Boolean(user),
    isLoading: false,
    logout,
    organization: {
      name: user?.company?.name || 'TalentCIO Sales Cloud',
      currency: 'INR',
      currencySymbol: '₹',
    },
  };

  return (
    <CrmAuthContext.Provider value={value}>
      {children}
    </CrmAuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(CrmAuthContext);
  if (ctx) return ctx;
  const talentAuth = useTalentAuth();
  return {
    ...talentAuth,
    isAuthenticated: Boolean(talentAuth.user),
    user: talentAuth.user ? {
      ...talentAuth.user,
      name: `${talentAuth.user.firstName || ''} ${talentAuth.user.lastName || ''}`.trim() || talentAuth.user.email,
      avatar: talentAuth.user.profilePicture,
    } : null,
  };
};
