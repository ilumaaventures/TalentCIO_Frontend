import React from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';

const RegularizationModal = ({
    isOpen,
    onClose,
    regDate,
    regForm,
    setRegForm,
    onSubmit,
    isPresentOnlyMode
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Request Regularization</h3>
                        <p className="text-xs text-slate-500 font-medium">
                            {regDate ? format(new Date(regDate), 'MMMM dd, yyyy') : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    {isPresentOnlyMode ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <label className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                                Regularize For
                            </label>
                            <div className="text-sm font-semibold text-emerald-800">Mark as Present</div>
                            <p className="mt-1 text-xs text-emerald-700">
                                This user uses present-only attendance, so this request will only mark the selected day as present.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Regularize For
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['IN', 'OUT', 'BOTH'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setRegForm({ ...regForm, type })}
                                            className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                                                regForm.type === type
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`grid ${regForm.type === 'BOTH' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                {(regForm.type === 'IN' || regForm.type === 'BOTH') && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Check In Time
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            value={regForm.checkIn}
                                            onChange={(e) => setRegForm({ ...regForm, checkIn: e.target.value })}
                                        />
                                    </div>
                                )}
                                {(regForm.type === 'OUT' || regForm.type === 'BOTH') && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Check Out Time
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            value={regForm.checkOut}
                                            onChange={(e) => setRegForm({ ...regForm, checkOut: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Reason for Regularization
                        </label>
                        <textarea
                            required
                            rows="3"
                            placeholder="Please provide a valid reason..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                            value={regForm.reason}
                            onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                        >
                            {isPresentOnlyMode ? 'Submit Presence Request' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegularizationModal;

