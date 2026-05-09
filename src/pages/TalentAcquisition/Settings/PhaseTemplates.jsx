import React, { useEffect, useMemo, useState } from 'react';
import {
    BadgePlus,
    Check,
    Copy,
    GripVertical,
    Loader,
    Pencil,
    Plus,
    Settings2,
    Star,
    Trash2,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import Skeleton from '../../../components/Skeleton';

const createLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const slugifyValue = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const createBlankStatus = (isDefault = false) => ({
    localId: createLocalId(),
    value: '',
    label: '',
    color: '#3B82F6',
    isDefault
});

const createBlankDecision = (type = 'hold') => ({
    localId: createLocalId(),
    value: '',
    label: '',
    color: type === 'reject' ? '#EF4444' : type === 'hold' ? '#F59E0B' : '#10B981',
    type,
    nextPhaseId: ''
});

const createBlankPhase = (order = 1) => ({
    localId: createLocalId(),
    name: '',
    description: '',
    color: '#3B82F6',
    order,
    statusOptions: [createBlankStatus(true)],
    decisionOptions: [createBlankDecision('hold')],
    allowedActions: []
});

const createEmptyTemplate = () => ({
    name: '',
    description: '',
    isDefault: false,
    phases: [createBlankPhase(1)]
});

const normalizePhaseOrders = (phases = []) => phases.map((phase, index) => ({
    ...phase,
    order: index + 1
}));

const mapTemplateToDraft = (template) => {
    const phases = (template?.phases || []).map((phase) => ({
        localId: phase._id || phase.phaseId || createLocalId(),
        name: phase.name || '',
        description: phase.description || '',
        color: phase.color || '#3B82F6',
        order: phase.order,
        allowedActions: Array.isArray(phase.allowedActions) ? phase.allowedActions : [],
        statusOptions: (phase.statusOptions || []).map((statusOption, index) => ({
            localId: `${phase._id || phase.phaseId || createLocalId()}-status-${index}`,
            value: statusOption.value || '',
            label: statusOption.label || '',
            color: statusOption.color || '#3B82F6',
            isDefault: Boolean(statusOption.isDefault)
        })),
        decisionOptions: (phase.decisionOptions || []).map((decisionOption, index) => ({
            localId: `${phase._id || phase.phaseId || createLocalId()}-decision-${index}`,
            value: decisionOption.value || '',
            label: decisionOption.label || '',
            color: decisionOption.color || '#10B981',
            type: decisionOption.type || 'hold',
            nextPhaseOrder: decisionOption.nextPhaseOrder,
            nextPhaseId: ''
        }))
    }));

    const orderedPhases = normalizePhaseOrders([...phases].sort((left, right) => left.order - right.order));
    const phaseIdByOrder = new Map(orderedPhases.map((phase) => [phase.order, phase.localId]));

    return {
        name: template?.name || '',
        description: template?.description || '',
        isDefault: Boolean(template?.isDefault),
        phases: orderedPhases.map((phase) => ({
            ...phase,
            decisionOptions: phase.decisionOptions.map((decisionOption) => ({
                ...decisionOption,
                nextPhaseId: decisionOption.nextPhaseOrder ? (phaseIdByOrder.get(decisionOption.nextPhaseOrder) || '') : ''
            }))
        }))
    };
};

const buildPayloadFromDraft = (draft) => {
    const orderedPhases = normalizePhaseOrders([...draft.phases]);
    const phaseOrderByLocalId = new Map(orderedPhases.map((phase) => [phase.localId, phase.order]));

    return {
        name: draft.name.trim(),
        description: draft.description.trim(),
        isDefault: Boolean(draft.isDefault),
        phases: orderedPhases.map((phase) => ({
            name: phase.name.trim(),
            description: phase.description.trim(),
            order: phase.order,
            color: phase.color,
            statusOptions: phase.statusOptions.map((statusOption) => ({
                value: slugifyValue(statusOption.value || statusOption.label),
                label: statusOption.label.trim(),
                color: statusOption.color,
                isDefault: Boolean(statusOption.isDefault)
            })),
            decisionOptions: phase.decisionOptions.map((decisionOption) => {
                const payload = {
                    value: slugifyValue(decisionOption.value || decisionOption.label),
                    label: decisionOption.label.trim(),
                    color: decisionOption.color,
                    type: decisionOption.type
                };

                if (decisionOption.type === 'advance' && decisionOption.nextPhaseId) {
                    payload.nextPhaseOrder = phaseOrderByLocalId.get(decisionOption.nextPhaseId);
                }

                return payload;
            }),
            allowedActions: Array.isArray(phase.allowedActions) ? phase.allowedActions : []
        }))
    };
};

const validateDraft = (draft) => {
    if (!draft.name.trim()) {
        return 'Template name is required';
    }

    if (!draft.phases.length) {
        return 'At least one phase is required';
    }

    for (let index = 0; index < draft.phases.length; index += 1) {
        const phase = draft.phases[index];
        if (!phase.name.trim()) {
            return `Phase ${index + 1} requires a name`;
        }

        if (!phase.statusOptions.length) {
            return `Phase "${phase.name}" requires at least one status option`;
        }

        if (!phase.decisionOptions.length) {
            return `Phase "${phase.name}" requires at least one decision option`;
        }

        for (const statusOption of phase.statusOptions) {
            if (!statusOption.label.trim()) {
                return `Every status in "${phase.name}" needs a label`;
            }
        }

        for (const decisionOption of phase.decisionOptions) {
            if (!decisionOption.label.trim()) {
                return `Every decision in "${phase.name}" needs a label`;
            }

            if (decisionOption.type === 'advance' && index < draft.phases.length - 1 && !decisionOption.nextPhaseId) {
                return `Advance decisions in "${phase.name}" must point to a next phase`;
            }
        }
    }

    return null;
};

const Badge = ({ label, color }) => (
    <span
        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
        style={{ color, borderColor: `${color}33`, backgroundColor: `${color}12` }}
    >
        {label}
    </span>
);

const PhaseTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [phaseEditorIndex, setPhaseEditorIndex] = useState(null);
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [draft, setDraft] = useState(createEmptyTemplate());
    const [actionLoading, setActionLoading] = useState(false);
    const [draggedPhaseId, setDraggedPhaseId] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template._id === selectedTemplateId) || templates[0] || null,
        [templates, selectedTemplateId]
    );

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await api.get('/ta/phase-templates');
            const fetchedTemplates = response.data?.templates || [];
            setTemplates(fetchedTemplates);
            setSelectedTemplateId((current) => current || fetchedTemplates[0]?._id || null);
        } catch (error) {
            console.error('Failed to fetch phase templates:', error);
            toast.error(error.response?.data?.message || 'Failed to load phase templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const openCreateEditor = () => {
        setEditingTemplateId(null);
        setDraft(createEmptyTemplate());
        setPhaseEditorIndex(null);
        setEditorOpen(true);
    };

    const openEditEditor = (template) => {
        setEditingTemplateId(template._id);
        setDraft(mapTemplateToDraft(template));
        setPhaseEditorIndex(null);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setPhaseEditorIndex(null);
        setEditingTemplateId(null);
        setDraft(createEmptyTemplate());
    };

    const updateDraft = (updater) => {
        setDraft((current) => typeof updater === 'function' ? updater(current) : updater);
    };

    const saveTemplate = async () => {
        const validationMessage = validateDraft(draft);
        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        const payload = buildPayloadFromDraft(draft);

        try {
            setActionLoading(true);
            if (editingTemplateId) {
                const response = await api.put(`/ta/phase-templates/${editingTemplateId}`, payload);
                toast.success(response.data?.message || 'Template updated successfully');
                if (response.data?.warning) {
                    toast(response.data.warning, { icon: '⚠️' });
                }
            } else {
                await api.post('/ta/phase-templates', payload);
                toast.success('Template created successfully');
            }

            closeEditor();
            await fetchTemplates();
        } catch (error) {
            console.error('Failed to save phase template:', error);
            toast.error(error.response?.data?.message || 'Failed to save template');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClone = async (templateId) => {
        try {
            await api.post(`/ta/phase-templates/${templateId}/clone`);
            toast.success('Template cloned successfully');
            await fetchTemplates();
        } catch (error) {
            console.error('Failed to clone phase template:', error);
            toast.error(error.response?.data?.message || 'Failed to clone template');
        }
    };

    const handleSetDefault = async (templateId) => {
        try {
            await api.patch(`/ta/phase-templates/${templateId}/set-default`);
            toast.success('Default template updated');
            await fetchTemplates();
        } catch (error) {
            console.error('Failed to set default phase template:', error);
            toast.error(error.response?.data?.message || 'Failed to set default template');
        }
    };

    const handleDelete = async (template) => {
        if (template.activeHiringRequestCount > 0) {
            return;
        }

        if (!window.confirm(`Delete "${template.name}"?`)) {
            return;
        }

        try {
            await api.delete(`/ta/phase-templates/${template._id}`);
            toast.success('Template deleted successfully');
            await fetchTemplates();
        } catch (error) {
            console.error('Failed to delete phase template:', error);
            toast.error(error.response?.data?.message || 'Failed to delete template');
        }
    };

    const addPhase = () => {
        updateDraft((current) => ({
            ...current,
            phases: normalizePhaseOrders([...current.phases, createBlankPhase(current.phases.length + 1)])
        }));
    };

    const deletePhase = (indexToRemove) => {
        updateDraft((current) => ({
            ...current,
            phases: normalizePhaseOrders(current.phases.filter((_, index) => index !== indexToRemove))
        }));
        setPhaseEditorIndex((currentIndex) => {
            if (currentIndex === null) return currentIndex;
            if (currentIndex === indexToRemove) return null;
            return currentIndex > indexToRemove ? currentIndex - 1 : currentIndex;
        });
    };

    const movePhase = (targetLocalId) => {
        if (!draggedPhaseId || draggedPhaseId === targetLocalId) {
            return;
        }

        updateDraft((current) => {
            const phases = [...current.phases];
            const fromIndex = phases.findIndex((phase) => phase.localId === draggedPhaseId);
            const toIndex = phases.findIndex((phase) => phase.localId === targetLocalId);

            if (fromIndex === -1 || toIndex === -1) {
                return current;
            }

            const [draggedPhase] = phases.splice(fromIndex, 1);
            phases.splice(toIndex, 0, draggedPhase);

            return {
                ...current,
                phases: normalizePhaseOrders(phases)
            };
        });
    };

    const activePhaseDraft = phaseEditorIndex !== null ? draft.phases[phaseEditorIndex] : null;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Phase Templates</h1>
                        <p className="mt-1 text-sm text-slate-500">Build reusable hiring workflows with custom phases, statuses, and decisions.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateEditor}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <Plus size={16} />
                        Create New Template
                    </button>
                </div>
            </div>

            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px,1fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Template Library</h2>
                            <p className="text-xs text-slate-500">Reusable workflows for each requisition.</p>
                        </div>
                        <BadgePlus className="text-slate-400" size={18} />
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, index) => (
                                <Skeleton key={index} className="h-28 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                            <p className="text-sm font-medium text-slate-700">No phase templates yet.</p>
                            <p className="mt-1 text-xs text-slate-500">Create your first workflow template to reuse across requisitions.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {templates.map((template) => {
                                const isSelected = selectedTemplate?._id === template._id;
                                return (
                                    <button
                                        key={template._id}
                                        type="button"
                                        onClick={() => setSelectedTemplateId(template._id)}
                                        className={`w-full rounded-2xl border p-4 text-left transition ${
                                            isSelected
                                                ? 'border-blue-200 bg-blue-50 shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-slate-900">{template.name}</h3>
                                                    {template.isDefault && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                                            <Star size={12} />
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{template.description || 'No description added yet.'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                                            <span>{template.phases?.length || 0} phases</span>
                                            <span>{template.hiringRequestCount || 0} requests</span>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditEditor(template);
                                                }}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleClone(template._id);
                                                }}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
                                            >
                                                Clone
                                            </button>
                                            {!template.isDefault && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleSetDefault(template._id);
                                                    }}
                                                    className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-white"
                                                >
                                                    Set as Default
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                title={template.activeHiringRequestCount > 0 ? 'This template is used by active hiring requests and cannot be deleted.' : 'Delete template'}
                                                disabled={template.activeHiringRequestCount > 0}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDelete(template);
                                                }}
                                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    {selectedTemplate ? (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-xl font-bold text-slate-900">{selectedTemplate.name}</h2>
                                        {selectedTemplate.isDefault && (
                                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Default Template</span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-500">{selectedTemplate.description || 'No description added for this template yet.'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Phases</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{selectedTemplate.phases?.length || 0}</div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Requests Using It</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{selectedTemplate.hiringRequestCount || 0}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                {(selectedTemplate.phases || [])
                                    .slice()
                                    .sort((left, right) => left.order - right.order)
                                    .map((phase) => (
                                        <div key={phase._id || phase.phaseId} className="rounded-2xl border border-slate-200 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                                                            style={{ backgroundColor: phase.color || '#3B82F6' }}
                                                        >
                                                            {phase.order}
                                                        </span>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-slate-900">{phase.name}</h3>
                                                            <p className="text-xs text-slate-500">{phase.description || 'No description added.'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {(phase.statusOptions || []).map((statusOption) => (
                                                        <Badge key={`${phase.order}-${statusOption.value}`} label={statusOption.label} color={statusOption.color || '#3B82F6'} />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-4 border-t border-slate-100 pt-4">
                                                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Decisions</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {(phase.decisionOptions || []).map((decisionOption) => (
                                                        <Badge key={`${phase.order}-${decisionOption.value}`} label={decisionOption.label} color={decisionOption.color || '#10B981'} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                            <div className="text-center">
                                <Settings2 className="mx-auto text-slate-400" size={28} />
                                <p className="mt-3 text-sm font-medium text-slate-700">Select a template to review its workflow.</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {editorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {editingTemplateId ? 'Edit Phase Template' : 'Create Phase Template'}
                                </h2>
                                <p className="text-sm text-slate-500">Save the full workflow in one request and reuse it across hiring requests.</p>
                            </div>
                            <button type="button" onClick={closeEditor} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr,0.8fr]">
                            <div className="overflow-y-auto px-6 py-6">
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Template Name</label>
                                        <input
                                            type="text"
                                            value={draft.name}
                                            onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            placeholder="e.g. Standard Hiring Process"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Default Template</label>
                                        <button
                                            type="button"
                                            onClick={() => updateDraft((current) => ({ ...current, isDefault: !current.isDefault }))}
                                            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                                draft.isDefault
                                                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                    : 'border-slate-300 bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <span>{draft.isDefault ? 'This will become the default workflow' : 'Set this workflow as the default option'}</span>
                                            <span className={`inline-flex h-5 w-10 items-center rounded-full p-1 ${draft.isDefault ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                                <span className={`h-3 w-3 rounded-full bg-white transition ${draft.isDefault ? 'translate-x-5' : ''}`} />
                                            </span>
                                        </button>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
                                        <textarea
                                            rows={3}
                                            value={draft.description}
                                            onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            placeholder="Describe when this workflow should be used."
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Phase Builder</h3>
                                        <p className="text-xs text-slate-500">Drag to reorder phases. Decisions keep their target phase mapping while you reorder.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addPhase}
                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                                    >
                                        <Plus size={16} />
                                        Add Phase
                                    </button>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {draft.phases.map((phase, index) => (
                                        <div
                                            key={phase.localId}
                                            draggable
                                            onDragStart={() => setDraggedPhaseId(phase.localId)}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => movePhase(phase.localId)}
                                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <button type="button" className="mt-1 text-slate-400">
                                                        <GripVertical size={16} />
                                                    </button>
                                                    <span
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                                                        style={{ backgroundColor: phase.color || '#3B82F6' }}
                                                    >
                                                        {phase.order}
                                                    </span>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">{phase.name || `Untitled Phase ${phase.order}`}</h4>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {phase.statusOptions.length} statuses • {phase.decisionOptions.length} decisions
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPhaseEditorIndex(index)}
                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={draft.phases.length === 1}
                                                        onClick={() => deletePhase(index)}
                                                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-y-auto border-l border-slate-200 bg-slate-50 px-6 py-6">
                                <h3 className="text-lg font-bold text-slate-900">Live Preview</h3>
                                <p className="mt-1 text-xs text-slate-500">Review how the workflow will read before saving.</p>

                                <div className="mt-5 space-y-4">
                                    {draft.phases.map((phase) => (
                                        <div key={phase.localId} className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                                                    style={{ backgroundColor: phase.color || '#3B82F6' }}
                                                >
                                                    {phase.order}
                                                </span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">{phase.name || `Phase ${phase.order}`}</h4>
                                                    <p className="text-xs text-slate-500">{phase.description || 'No phase description yet.'}</p>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Statuses</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {phase.statusOptions.map((statusOption) => (
                                                        <Badge
                                                            key={statusOption.localId}
                                                            label={`${statusOption.label || 'Untitled'}${statusOption.isDefault ? ' • Default' : ''}`}
                                                            color={statusOption.color || '#3B82F6'}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Decisions</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {phase.decisionOptions.map((decisionOption) => (
                                                        <Badge
                                                            key={decisionOption.localId}
                                                            label={decisionOption.label || 'Untitled'}
                                                            color={decisionOption.color || '#10B981'}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeEditor}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveTemplate}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {actionLoading ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editorOpen && activePhaseDraft && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/35 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Phase Editor</h3>
                                <p className="text-sm text-slate-500">Configure custom statuses and decision paths for this phase.</p>
                            </div>
                            <button type="button" onClick={() => setPhaseEditorIndex(null)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6 px-6 py-6">
                            <div className="grid gap-5 md:grid-cols-3">
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Phase Name</label>
                                    <input
                                        type="text"
                                        value={activePhaseDraft.name}
                                        onChange={(event) => updateDraft((current) => {
                                            const phases = [...current.phases];
                                            phases[phaseEditorIndex] = { ...phases[phaseEditorIndex], name: event.target.value };
                                            return { ...current, phases };
                                        })}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Phase Color</label>
                                    <input
                                        type="color"
                                        value={activePhaseDraft.color}
                                        onChange={(event) => updateDraft((current) => {
                                            const phases = [...current.phases];
                                            phases[phaseEditorIndex] = { ...phases[phaseEditorIndex], color: event.target.value };
                                            return { ...current, phases };
                                        })}
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-2"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
                                    <textarea
                                        rows={3}
                                        value={activePhaseDraft.description}
                                        onChange={(event) => updateDraft((current) => {
                                            const phases = [...current.phases];
                                            phases[phaseEditorIndex] = { ...phases[phaseEditorIndex], description: event.target.value };
                                            return { ...current, phases };
                                        })}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900">Status Options</h4>
                                            <p className="text-xs text-slate-500">At least one status is required.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateDraft((current) => {
                                                const phases = [...current.phases];
                                                phases[phaseEditorIndex] = {
                                                    ...phases[phaseEditorIndex],
                                                    statusOptions: [...phases[phaseEditorIndex].statusOptions, createBlankStatus(false)]
                                                };
                                                return { ...current, phases };
                                            })}
                                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                        >
                                            Add Status
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {activePhaseDraft.statusOptions.map((statusOption) => (
                                            <div key={statusOption.localId} className="rounded-2xl border border-slate-200 p-3">
                                                <div className="grid gap-3 md:grid-cols-[1fr,1fr,90px,90px,44px]">
                                                    <input
                                                        type="text"
                                                        value={statusOption.value}
                                                        placeholder="Value"
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.statusOptions = phase.statusOptions.map((item) => (
                                                                item.localId === statusOption.localId ? { ...item, value: event.target.value } : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={statusOption.label}
                                                        placeholder="Label"
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.statusOptions = phase.statusOptions.map((item) => (
                                                                item.localId === statusOption.localId ? { ...item, label: event.target.value } : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    />
                                                    <input
                                                        type="color"
                                                        value={statusOption.color}
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.statusOptions = phase.statusOptions.map((item) => (
                                                                item.localId === statusOption.localId ? { ...item, color: event.target.value } : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="h-10 rounded-xl border border-slate-300 bg-white px-2"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.statusOptions = phase.statusOptions.map((item) => ({
                                                                ...item,
                                                                isDefault: item.localId === statusOption.localId
                                                            }));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                                                            statusOption.isDefault
                                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        Default
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={activePhaseDraft.statusOptions.length === 1}
                                                        onClick={() => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            const nextStatuses = phase.statusOptions.filter((item) => item.localId !== statusOption.localId);
                                                            if (!nextStatuses.some((item) => item.isDefault) && nextStatuses[0]) {
                                                                nextStatuses[0] = { ...nextStatuses[0], isDefault: true };
                                                            }
                                                            phase.statusOptions = nextStatuses;
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-red-200 px-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Trash2 size={14} className="mx-auto" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900">Decision Options</h4>
                                            <p className="text-xs text-slate-500">At least one decision is required.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateDraft((current) => {
                                                const phases = [...current.phases];
                                                phases[phaseEditorIndex] = {
                                                    ...phases[phaseEditorIndex],
                                                    decisionOptions: [...phases[phaseEditorIndex].decisionOptions, createBlankDecision('hold')]
                                                };
                                                return { ...current, phases };
                                            })}
                                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                        >
                                            Add Decision
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {activePhaseDraft.decisionOptions.map((decisionOption) => (
                                            <div key={decisionOption.localId} className="rounded-2xl border border-slate-200 p-3">
                                                <div className="grid gap-3 md:grid-cols-[1fr,1fr,92px,120px,44px]">
                                                    <input
                                                        type="text"
                                                        value={decisionOption.value}
                                                        placeholder="Value"
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.decisionOptions = phase.decisionOptions.map((item) => (
                                                                item.localId === decisionOption.localId ? { ...item, value: event.target.value } : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={decisionOption.label}
                                                        placeholder="Label"
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.decisionOptions = phase.decisionOptions.map((item) => (
                                                                item.localId === decisionOption.localId ? { ...item, label: event.target.value } : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    />
                                                    <input
                                                        type="color"
                                                        value={decisionOption.color}
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.decisionOptions = phase.decisionOptions.map((item) => (
                                                                item.localId === decisionOption.localId ? { ...item, color: event.target.value } : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="h-10 rounded-xl border border-slate-300 bg-white px-2"
                                                    />
                                                    <select
                                                        value={decisionOption.type}
                                                        onChange={(event) => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.decisionOptions = phase.decisionOptions.map((item) => (
                                                                item.localId === decisionOption.localId
                                                                    ? {
                                                                        ...item,
                                                                        type: event.target.value,
                                                                        color: event.target.value === 'reject' ? '#EF4444' : event.target.value === 'hold' ? '#F59E0B' : '#10B981',
                                                                        nextPhaseId: event.target.value === 'advance' ? item.nextPhaseId : ''
                                                                    }
                                                                    : item
                                                            ));
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    >
                                                        <option value="advance">Advance</option>
                                                        <option value="hold">Hold</option>
                                                        <option value="reject">Reject</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        disabled={activePhaseDraft.decisionOptions.length === 1}
                                                        onClick={() => updateDraft((current) => {
                                                            const phases = [...current.phases];
                                                            const phase = { ...phases[phaseEditorIndex] };
                                                            phase.decisionOptions = phase.decisionOptions.filter((item) => item.localId !== decisionOption.localId);
                                                            phases[phaseEditorIndex] = phase;
                                                            return { ...current, phases };
                                                        })}
                                                        className="rounded-xl border border-red-200 px-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Trash2 size={14} className="mx-auto" />
                                                    </button>
                                                </div>

                                                {decisionOption.type === 'advance' && (
                                                    <div className="mt-3">
                                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Next Phase</label>
                                                        <select
                                                            value={decisionOption.nextPhaseId}
                                                            onChange={(event) => updateDraft((current) => {
                                                                const phases = [...current.phases];
                                                                const phase = { ...phases[phaseEditorIndex] };
                                                                phase.decisionOptions = phase.decisionOptions.map((item) => (
                                                                    item.localId === decisionOption.localId ? { ...item, nextPhaseId: event.target.value } : item
                                                                ));
                                                                phases[phaseEditorIndex] = phase;
                                                                return { ...current, phases };
                                                            })}
                                                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        >
                                                            <option value="">Select next phase</option>
                                                            {draft.phases
                                                                .filter((phase) => phase.localId !== activePhaseDraft.localId)
                                                                .map((phase) => (
                                                                    <option key={phase.localId} value={phase.localId}>
                                                                        {phase.order}. {phase.name || `Phase ${phase.order}`}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-3 text-sm font-bold text-slate-900">Live Preview</div>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {activePhaseDraft.statusOptions.map((statusOption) => (
                                            <Badge
                                                key={statusOption.localId}
                                                label={`${statusOption.label || 'Untitled'}${statusOption.isDefault ? ' • Default' : ''}`}
                                                color={statusOption.color || '#3B82F6'}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {activePhaseDraft.decisionOptions.map((decisionOption) => (
                                            <Badge
                                                key={decisionOption.localId}
                                                label={decisionOption.label || 'Untitled'}
                                                color={decisionOption.color || '#10B981'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setPhaseEditorIndex(null)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhaseTemplates;
