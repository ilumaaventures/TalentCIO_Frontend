import React, { useRef } from 'react';
import { Settings, ArrowLeft, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

// Constants
const COMPANY_LOGO_DISPLAY_OPTIONS = [
    {
        value: 'talentcio',
        label: 'Talentcio Logo',
        description: 'Show the default Talentcio logo in the workspace sidebar.'
    },
    {
        value: 'company',
        label: 'Company Logo',
        description: 'Use your uploaded company logo in place of the default logo.'
    },
    {
        value: 'none',
        label: 'No Logo',
        description: 'Keep the logo area empty.'
    }
];

const COMPANY_LOGO_ALIGNMENT_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' }
];

const DEFAULT_COMPANY_LOGO_ALIGNMENT = 'left';
const DEFAULT_COMPANY_LOGO_SIZE = 140;
const MIN_COMPANY_LOGO_SIZE = 80;
const MAX_COMPANY_LOGO_SIZE = 170;

export const SettingsTab = ({
    canViewRolesSettings,
    canViewAttendanceSettings,
    canViewLeavePolicies,
    canManageCompanyBranding,
    isCompanySettingsOpen,
    setIsCompanySettingsOpen,
    companyBranding,
    setCompanyBranding,
    loadingCompanyBranding,
    savingCompanyBranding,
    uploadingCompanyLogo,
    handleCompanyBrandingSave,
    handleCompanyLogoUpload,
    handleCompanyLogoRemove
}) => {
    const navigate = useNavigate();
    const companySettingsSectionRef = useRef(null);

    const settingCards = [
        {
            key: 'roles',
            visible: canViewRolesSettings,
            label: 'Roles & Permissions',
            description: 'Manage role access and permission mappings across the workspace.',
            route: '/roles'
        },
        {
            key: 'attendance',
            visible: canViewAttendanceSettings,
            label: 'Attendance Settings',
            description: 'Configure attendance modes, shifts, location rules, and policy defaults.',
            route: '/attendance-settings'
        },
        {
            key: 'leave',
            visible: canViewLeavePolicies,
            label: 'Leave Policies',
            description: 'Review and update leave types, accrual rules, and leave balances policy setup.',
            route: '/leave-config'
        },
        {
            key: 'company',
            visible: canManageCompanyBranding,
            label: 'Company Setting',
            description: 'Choose the workspace sidebar logo, upload branding, and preview the company look.',
            action: () => setIsCompanySettingsOpen(true)
        }
    ].filter((card) => card.visible);

    const previewLogoSrc = companyBranding.displayMode === 'talentcio'
        ? '/dark-logo-compact.png'
        : companyBranding.displayMode === 'company'
            ? companyBranding.companyLogoUrl
            : '';

    const previewLogoAlignmentClass = companyBranding.logoAlignment === 'center'
        ? 'justify-center'
        : companyBranding.logoAlignment === 'right'
            ? 'justify-end'
            : 'justify-start';

    const previewLogoSize = Math.min(
        Math.max(Number(companyBranding.logoSize) || DEFAULT_COMPANY_LOGO_SIZE, MIN_COMPANY_LOGO_SIZE),
        MAX_COMPANY_LOGO_SIZE
    );

    return (
        <div className="space-y-6 text-xs font-sans">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Admin Settings</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Open the core company setup pages directly from your profile.
                        </p>
                    </div>
                </div>

                {settingCards.length > 0 ? (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {settingCards.map((card) => (
                            <button
                                key={card.key}
                                type="button"
                                onClick={() => {
                                    if (card.action) {
                                        card.action();
                                        return;
                                    }
                                    navigate(card.route);
                                }}
                                className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
                            >
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="text-base font-semibold text-slate-800 transition-colors group-hover:text-blue-700">
                                        {card.label}
                                    </span>
                                    <span className="rounded-full bg-white p-2 text-slate-400 transition-colors group-hover:text-blue-600">
                                        <ArrowLeft size={16} className="rotate-180" />
                                    </span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                    {card.description}
                                </p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        No settings shortcuts are available for your access level.
                    </div>
                )}
            </div>

            {canManageCompanyBranding && isCompanySettingsOpen && (
                <div
                    ref={companySettingsSectionRef}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Company Setting</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Choose which logo should appear in the workspace sidebar.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCompanySettingsOpen(false)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                            >
                                Hide
                            </button>
                            <Button
                                onClick={handleCompanyBrandingSave}
                                isLoading={savingCompanyBranding}
                                disabled={loadingCompanyBranding || uploadingCompanyLogo}
                                className="px-4 py-2"
                            >
                                Save Settings
                            </Button>
                        </div>
                    </div>

                    {loadingCompanyBranding ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                            Loading company branding settings...
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
                            <div className="space-y-4">
                                {COMPANY_LOGO_DISPLAY_OPTIONS.map((option) => {
                                    const isSelected = companyBranding.displayMode === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setCompanyBranding((current) => ({ ...current, displayMode: option.value }))}
                                            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${isSelected
                                                ? 'border-blue-300 bg-blue-50 shadow-sm'
                                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3 text-xs">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800">{option.label}</div>
                                                    <p className="mt-1 text-sm leading-6 text-slate-500">{option.description}</p>
                                                </div>
                                                {isSelected && <CheckCircle size={18} className="mt-0.5 shrink-0 text-blue-600" />}
                                            </div>
                                        </button>
                                    );
                                })}

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Uploaded company logo</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Upload JPG, PNG, SVG, or WEBP up to 3MB.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <label
                                                htmlFor="company-logo-upload"
                                                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 ${uploadingCompanyLogo ? 'pointer-events-none opacity-60' : ''}`}
                                            >
                                                <Upload size={16} />
                                                {companyBranding.companyLogoUrl ? 'Change Logo' : 'Upload Logo'}
                                            </label>
                                            <input
                                                id="company-logo-upload"
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.svg,.webp,image/jpeg,image/png,image/svg+xml,image/webp"
                                                className="hidden"
                                                onChange={handleCompanyLogoUpload}
                                                disabled={uploadingCompanyLogo}
                                            />
                                            {companyBranding.companyLogoUrl && (
                                                <button
                                                    type="button"
                                                    onClick={handleCompanyLogoRemove}
                                                    disabled={uploadingCompanyLogo}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <Trash2 size={16} />
                                                    Remove Logo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {companyBranding.displayMode === 'company' && !companyBranding.companyLogoUrl && (
                                        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                            No company logo is uploaded yet, so the sidebar logo area will stay empty until you add one.
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Logo size</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Use one slider. Width changes and height adjusts automatically to keep the logo proportional.
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                                            {previewLogoSize}px
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <input
                                            type="range"
                                            min={MIN_COMPANY_LOGO_SIZE}
                                            max={MAX_COMPANY_LOGO_SIZE}
                                            step="1"
                                            value={previewLogoSize}
                                            onChange={(event) => setCompanyBranding((current) => ({
                                                ...current,
                                                logoSize: Number(event.target.value)
                                            }))}
                                            className="w-full accent-blue-600"
                                        />
                                        <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
                                            <span>Compact</span>
                                            <span>Balanced</span>
                                            <span>Large</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-800">Logo alignment</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Choose where the logo should stay in the sidebar header.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {COMPANY_LOGO_ALIGNMENT_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setCompanyBranding((current) => ({
                                                    ...current,
                                                    logoAlignment: option.value
                                                }))}
                                                className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${companyBranding.logoAlignment === option.value
                                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Sidebar Preview</p>
                                <div className="mt-4 flex justify-center">
                                    <div className="w-64 overflow-hidden rounded-[28px] bg-[#111315] shadow-[0_18px_40px_rgba(15,23,42,0.22)] ring-1 ring-black/5">
                                        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
                                            <div className={`flex h-12 w-[200px] items-center ${previewLogoAlignmentClass}`}>
                                                {previewLogoSrc ? (
                                                    <div style={{ width: `${previewLogoSize}px` }}>
                                                        <img
                                                            src={previewLogoSrc}
                                                            alt="Workspace logo preview"
                                                            className="block max-h-12 w-full object-contain"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-[200px]" />
                                                )}
                                            </div>
                                            <div className="mt-1 h-5 w-5 rounded-full border border-white/10" />
                                        </div>

                                        <div className="px-4 py-6">
                                            <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d6258]">
                                                Main
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                <div className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-3.5 py-2.5 text-[13px] font-semibold text-white">
                                                    <div className="h-[18px] w-[18px] rounded-full bg-white/20" />
                                                    <div className="h-3 w-20 rounded bg-white/20" />
                                                </div>
                                                <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                    <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                    <div className="h-3 w-24 rounded bg-white/10" />
                                                </div>
                                                <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                    <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                    <div className="h-3 w-16 rounded bg-white/10" />
                                                </div>
                                            </div>

                                            <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d6258]">
                                                Manage
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                    <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                    <div className="h-3 w-24 rounded bg-white/10" />
                                                </div>
                                                <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-400">
                                                    <div className="h-[18px] w-[18px] rounded-full bg-white/10" />
                                                    <div className="h-3 w-20 rounded bg-white/10" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-6 text-slate-500">
                                    {previewLogoSrc
                                        ? 'This is how the selected logo will appear in the sidebar.'
                                        : 'No logo will be shown in the sidebar when this option is active.'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Profile Photo Settings</h4>
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={Boolean(companyBranding.requireCameraCapture)}
                                onChange={(e) => setCompanyBranding((current) => ({
                                    ...current,
                                    requireCameraCapture: e.target.checked
                                }))}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 group-hover:border-blue-400 transition mt-0.5"
                            />
                            <div>
                                <span className="text-sm font-semibold text-slate-800 select-none">Require Camera Capture</span>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Force employees to take their profile picture directly using their device camera instead of choosing a pre-saved file from their local storage.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};
