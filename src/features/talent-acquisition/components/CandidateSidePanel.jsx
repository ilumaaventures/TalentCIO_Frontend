import React from 'react';
import { X } from 'lucide-react';
import CandidateDetails from '@/features/talent-acquisition/pages/CandidateDetails';

const CandidateSidePanel = ({
    selectedCandidateId,
    hiringRequestId,
    isSidePanelMaximized,
    handleCloseCandidate,
    handleToggleMaximize,
    fetchCandidates
}) => {
    if (!selectedCandidateId) return null;

    return (
        <div className={`${isSidePanelMaximized ? 'fixed top-0 right-0 bottom-0 left-0 md:left-64 z-100' : 'w-full lg:w-[72%] sticky top-20 h-[calc(100vh-100px)]'} bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300`}>
            {/* Side Panel Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-800">Quick Profile View</h2>
                <button
                    onClick={handleCloseCandidate}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800 shadow-sm bg-white border border-slate-200"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="scrollbar-hide flex-1 overflow-y-auto bg-slate-50/50">
                <CandidateDetails
                    key={selectedCandidateId}
                    candidateId={selectedCandidateId}
                    hiringRequestId={hiringRequestId}
                    isSidePanel={true}
                    onUpdate={() => fetchCandidates(true)}
                    isSidePanelMaximized={isSidePanelMaximized}
                    onToggleMaximize={handleToggleMaximize}
                />
            </div>
        </div>
    );
};

export default CandidateSidePanel;
