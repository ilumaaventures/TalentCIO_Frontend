import React, { useState, useMemo } from 'react';
import { Briefcase, ChevronRight, ChevronLeft, CheckSquare, Layers, Edit2, Trash2 } from 'lucide-react';
import { getLocalDateInputValue } from '../utils/attendanceFormatters';

const AssignedTasksView = ({
    assignedTasks = [],
    canLogWork,
    attendanceActionLabel,
    onLogWork,
    logForm,
    setLogForm,
    expandedLogTaskId,
    recentLogs = [],
    onDeleteLog,
    toggleLogForm,
    editingLogId
}) => {
    // 1. Group Tasks by Project -> Module
    const groupedData = useMemo(() => {
        const projects = {};
        assignedTasks.forEach(task => {
            const projectId = task.module?.project?._id || 'unknown';
            const projectName = task.module?.project?.name || 'Unknown Project';
            const moduleId = task.module?._id || 'unknown';
            const moduleName = task.module?.name || 'Unknown Module';

            if (!projects[projectId]) {
                projects[projectId] = { id: projectId, name: projectName, modules: {} };
            }
            if (!projects[projectId].modules[moduleId]) {
                projects[projectId].modules[moduleId] = { id: moduleId, name: moduleName, tasks: [] };
            }
            projects[projectId].modules[moduleId].tasks.push(task);
        });

        return Object.values(projects).map(p => ({
            ...p,
            modules: Object.values(p.modules)
        }));
    }, [assignedTasks]);

    // 2. Selection State
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedModuleId, setSelectedModuleId] = useState(null);

    // Derived Data for Views
    const selectedProject = selectedProjectId ? groupedData.find(p => p.id === selectedProjectId) : null;
    const selectedModule = (selectedProject && selectedModuleId) ? selectedProject.modules.find(m => m.id === selectedModuleId) : null;

    // Helper
    const getTodayLogForTask = (taskId) => {
        const today = getLocalDateInputValue();
        return recentLogs.find(log =>
            log.task &&
            log.task._id === taskId &&
            getLocalDateInputValue(log.date) === today
        );
    };

    // --- VIEW 1: PROJECTS GRID ---
    if (!selectedProjectId) {
        return (
            <div className="h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">My Projects</h3>
                    <span className="text-xs text-slate-500">{groupedData.length} Projects</span>
                </div>

                {groupedData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupedData.map(project => (
                            <button
                                key={project.id}
                                onClick={() => setSelectedProjectId(project.id)}
                                className="flex items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
                            >
                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4 group-hover:scale-110 transition-transform">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{project.name}</h4>
                                    <p className="text-xs text-slate-500">{project.modules.length} Modules • {project.modules.reduce((acc, m) => acc + m.tasks.length, 0)} Tasks</p>
                                </div>
                                <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-400" size={20} />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <CheckSquare size={48} className="mx-auto text-slate-200 mb-3" />
                        <p>No tasks assigned.</p>
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW 2: MODULES GRID ---
    if (!selectedModuleId) {
        return (
            <div className="h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="sticky top-0 bg-white z-10 pb-4 border-b border-slate-100 mb-4">
                    <button
                        onClick={() => setSelectedProjectId(null)}
                        className="flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors mb-2"
                    >
                        <ChevronLeft size={16} className="mr-1" /> Back to Projects
                    </button>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <span className="text-slate-400 font-normal mr-2">Project:</span>
                        {selectedProject?.name}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProject?.modules.map(module => (
                        <button
                            key={module.id}
                            onClick={() => setSelectedModuleId(module.id)}
                            className="flex items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left group"
                        >
                            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mr-4 group-hover:scale-110 transition-transform">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{module.name}</h4>
                                <p className="text-xs text-slate-500">{module.tasks.length} Assigned Tasks</p>
                            </div>
                            <ChevronRight className="ml-auto text-slate-300 group-hover:text-emerald-400" size={20} />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // --- VIEW 3: TASKS LIST ---
    return (
        <div className="h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="sticky top-0 bg-white z-10 pb-4 border-b border-slate-100 mb-4">
                <button
                    onClick={() => setSelectedModuleId(null)}
                    className="flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors mb-2"
                >
                    <ChevronLeft size={16} className="mr-1" /> Back to Modules
                </button>
                <div className="flex flex-col">
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
                        <span>{selectedProject?.name}</span>
                        <span>/</span>
                        <span>{selectedModule?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Tasks</h3>
                        {!canLogWork && <span className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full border border-amber-200">⚠️ {attendanceActionLabel} to log work</span>}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {selectedModule?.tasks.map(task => {
                    const existingLog = getTodayLogForTask(task._id);
                    const isExpanded = expandedLogTaskId === task._id;

                    return (
                        <div key={task._id} className={`border rounded-lg transition-all ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100 bg-white' : 'border-slate-200 hover:border-blue-200 bg-white hover:bg-slate-50'}`}>
                            {/* Task Items */}
                            <div className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h4 className={`font-semibold text-sm ${isExpanded ? 'text-blue-700' : 'text-slate-800'}`}>{task.name}</h4>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description || 'No description'}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {existingLog ? (
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center">
                                                    <CheckSquare size={12} className="mr-1.5" />
                                                    {existingLog.hours}h Logged
                                                </div>
                                                <button
                                                    onClick={() => toggleLogForm(task._id, existingLog)}
                                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteLog(existingLog._id)}
                                                    className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => toggleLogForm(task._id)}
                                                disabled={!canLogWork}
                                                className={`flex items-center px-3 py-1.5 rounded text-xs font-medium transition-all ${canLogWork ? (isExpanded ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm') : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                            >
                                                {isExpanded ? 'Cancel' : 'Log Work'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Log Form Area */}
                            {isExpanded && (
                                <div className="bg-slate-50 p-4 border-t border-slate-100 rounded-b-lg animate-fadeIn">
                                    <form onSubmit={onLogWork} className="flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="w-full sm:w-32 flex space-x-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hrs</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    required
                                                    autoFocus
                                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                                    placeholder="0"
                                                    value={logForm.hours}
                                                    onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min</label>
                                                <input
                                                    type="number"
                                                    min="0" max="59"
                                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                                    placeholder="0"
                                                    value={logForm.minutes}
                                                    onChange={(e) => setLogForm({ ...logForm, minutes: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                                placeholder="What did you work on?"
                                                value={logForm.description}
                                                onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full sm:w-auto px-6 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm h-[38px] flex items-center justify-center"
                                        >
                                            <CheckSquare size={16} className="mr-2" />
                                            {editingLogId ? 'Update' : 'Save'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AssignedTasksView;

