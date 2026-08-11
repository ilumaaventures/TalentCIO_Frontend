import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  login as loginThunk,
  setLoginWithToken,
  register as registerThunk,
  logout as logoutThunk,
  refreshProfile as refreshProfileThunk,
  selectCurrentUser,
  selectToken,
  selectAuthLoading,
  selectWorkspace,
  selectInvalidWorkspace,
  selectIsDossierComplete,
  selectDossierMissingSections,
  selectDossierMissingFields
} from '@/features/auth/authSlice';
import { hasModuleEnabled } from '@/config/enabledModules';

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

  const hasModule = useCallback((moduleName) => {
    return hasModuleEnabled(user?.company?.enabledModules || [], moduleName);
  }, [user?.company?.enabledModules]);

  return {
    user,
    token,
    login,
    loginWithToken,
    register,
    logout,
    refreshProfile,
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
