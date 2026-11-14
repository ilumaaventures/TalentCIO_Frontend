import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

const AttendanceSkeleton = () => {
    return (
        <div className="h-[calc(100vh-64px)] w-full bg-slate-100 font-sans flex flex-col overflow-hidden">
            <div className="flex-none px-4 pt-4 md:px-6 md:pt-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="hidden sm:block">
                        <Skeleton className="h-10 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
                    <div className="xl:col-span-1 space-y-6 overflow-y-auto pr-2 h-full custom-scrollbar pb-2">
                        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-t-slate-200 flex flex-col items-center">
                            <Skeleton className="w-36 h-36 rounded-full mb-6" />
                            <Skeleton className="h-6 w-24 mb-2" />
                            <Skeleton className="h-8 w-32 mb-6" />
                            <Skeleton className="h-10 w-full mb-3" />
                        </div>
                        <div className="bg-white p-5 rounded-lg shadow-sm">
                            <Skeleton className="h-4 w-32 mb-4" />
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="xl:col-span-3 flex flex-col h-full overflow-hidden">
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex-1 overflow-y-auto">
                            <div className="flex justify-between mb-6">
                                <Skeleton className="h-8 w-48" />
                                <div className="flex space-x-2">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-4">
                                {[...Array(35)].map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full rounded" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceSkeleton;

