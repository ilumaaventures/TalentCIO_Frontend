const LEGACY_PROJECT_MODULE_ID = 'projectManagement';
const PROJECTS_MODULE_ID = 'projects';
const BUSINESS_UNITS_MODULE_ID = 'businessUnits';
const CLIENTS_MODULE_ID = 'clients';

export const normalizeEnabledModules = (moduleIds = []) => {
  const normalizedIds = new Set(
    (Array.isArray(moduleIds) ? moduleIds : [])
      .map((moduleId) => String(moduleId || '').trim())
      .filter(Boolean)
  );

  if (normalizedIds.has(LEGACY_PROJECT_MODULE_ID)) {
    normalizedIds.add(BUSINESS_UNITS_MODULE_ID);
    normalizedIds.add(CLIENTS_MODULE_ID);
    normalizedIds.add(PROJECTS_MODULE_ID);
    normalizedIds.delete(LEGACY_PROJECT_MODULE_ID);
  }

  if (normalizedIds.has(PROJECTS_MODULE_ID)) {
    normalizedIds.add(BUSINESS_UNITS_MODULE_ID);
    normalizedIds.add(CLIENTS_MODULE_ID);
  }

  return Array.from(normalizedIds);
};

export const hasModuleEnabled = (moduleIds = [], targetModuleId = '') => {
  const normalizedIds = normalizeEnabledModules(moduleIds);

  if (targetModuleId === LEGACY_PROJECT_MODULE_ID) {
    return normalizedIds.includes(PROJECTS_MODULE_ID);
  }

  return normalizedIds.includes(targetModuleId);
};
