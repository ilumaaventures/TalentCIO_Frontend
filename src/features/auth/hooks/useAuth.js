import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  login as loginThunk,
  setLoginWithToken,
  register as registerThunk,
  logout as logoutThunk,
  refreshProfile as refreshProfileThunk,
  startImpersonation as startImpersonationThunk,
  endImpersonation as endImpersonationThunk,
  checkImpersonationStatus as checkImpersonationStatusThunk,
  selectCurrentUser,
  selectToken,
  selectAuthLoading,
  selectWorkspace,
  selectInvalidWorkspace,
  selectIsDossierComplete,
  selectDossierMissingSections,
  selectDossierMissingFields,
  selectImpersonation
} from '@/features/auth/authSlice';
import { hasModuleEnabled } from '@/config/enabledModules';
import { isAdminUser } from '@/config/accessPolicies';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector(selectToken);
  const loading = useAppSelector(selectAuthLoading);
  const workspace = useAppSelector(selectWorkspace);
  const invalidWorkspace = useAppSelector(selectInvalidWorkspace);
  const isDossierComplete = useAppSelector(selectIsDossierComplete);
  const dossierMissingSections = useAppSelector(selectDossierMissingSections);
  const dossierMissingFields = useAppSelector(selectDossierMissingFields);
  const impersonation = useAppSelector(selectImpersonation);

  const login = useCallback((email, password, companyId = null) => {
    return dispatch(loginThunk({ email, password, companyId })).unwrap();
  }, [dispatch]);

  const loginWithToken = useCallback((userData) => {
    dispatch(setLoginWithToken(userData));
  }, [dispatch]);

  const register = useCallback((data) => {
    return dispatch(registerThunk(data)).unwrap();
  }, [dispatch]);

  const logout = useCallback(() => {
    return dispatch(logoutThunk()).unwrap();
  }, [dispatch]);

  const refreshProfile = useCallback(() => {
    return dispatch(refreshProfileThunk()).unwrap();
  }, [dispatch]);

  const startImpersonation = useCallback((userId, reason = '') => {
    return dispatch(startImpersonationThunk({ userId, reason })).unwrap();
  }, [dispatch]);

  const endImpersonation = useCallback(() => {
    return dispatch(endImpersonationThunk()).unwrap();
  }, [dispatch]);

  const checkImpersonationStatus = useCallback(() => {
    return dispatch(checkImpersonationStatusThunk()).unwrap();
  }, [dispatch]);

  const hasModule = useCallback((moduleName) => {
    if (!user) return false;
    return hasModuleEnabled(user?.company?.enabledModules || [], moduleName);
  }, [user]);

  return {
    user,
    token,
    login,
    loginWithToken,
    register,
    logout,
    refreshProfile,
    startImpersonation,
    endImpersonation,
    checkImpersonationStatus,
    impersonation,
    hasModule,
    loading,
    workspace,
    invalidWorkspace,
    isDossierComplete,
    dossierMissingSections,
    dossierMissingFields
  };
};

export default useAuth;
