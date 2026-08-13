import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
    LEGACY_EXPORT_STATUS_OPTIONS,
    EXPORT_INTERVIEW_STATUS_OPTIONS,
    PROFILE_SHORTLISTED_EXPORT_OPTIONS,
    PROFILE_SHORTLISTED_HEADER
} from '@/features/talent-acquisition/utils/CandidateListConstants';
import {
    getRoundExportInterviewStatus,
    getPhase2InterviewStatusExportValue,
    getInterviewStatusSummary
} from '@/features/talent-acquisition/utils/candidateHelpers';

export const exportCandidatesToExcel = async ({
    hiringRequestId,
    positionName,
    activePhase,
    fetchAllMatchingCandidates,
    users = [],
    isProfileSharedCandidate
}) => {
    try {
        toast.loading('Preparing export...', { id: 'export-excel' });

        const toEmptyCell = (value, { zeroIsEmpty = false } = {}) => {
            if (value === undefined || value === null) {
                return null;
            }

            if (typeof value === 'number') {
                if (zeroIsEmpty && value === 0) {
                    return null;
                }

                return value;
            }

            if (typeof value === 'string') {
                const normalized = value.trim();
                const upperValue = normalized.toUpperCase();
                const isZeroLike = /^0+(?:\.0+)?$/.test(normalized);
                if (!normalized || normalized === '-' || normalized === '--' || upperValue === 'N/A' || (zeroIsEmpty && isZeroLike)) {
                    return null;
                }

                return normalized;
            }

            return value;
        };

        // 1. Fetch Requisition Details for Dynamic Skills
        let softSkillsFromReq = [];
        let techSkillsFromReq = [];
        let requisitionData = null;

        try {
            const reqRes = await api.get(`/ta/hiring-request/${hiringRequestId}`);
            requisitionData = reqRes.data || {};
            const requirements = requisitionData.requirements || {};
            const mustHave = requirements.mustHaveSkills || {};

            softSkillsFromReq = Array.isArray(mustHave.softSkills) ? mustHave.softSkills : [];
            techSkillsFromReq = Array.isArray(mustHave.technical) ? mustHave.technical :
                (Array.isArray(mustHave) ? mustHave : []);
        } catch (err) {
            console.error('Failed to fetch requisition for dynamic skills', err);
        }

        // 2. Prepare Sections for Dynamic Header Generation
        const softSkillsHeaders = Array.isArray(softSkillsFromReq) ? softSkillsFromReq : [];
        const techSkillsHeaders = Array.isArray(techSkillsFromReq) ? techSkillsFromReq : [];

        // 3. Determine Maximum Interview Rounds among all candidates for sizing the table
        const dataToExport = await fetchAllMatchingCandidates();
        let maxRoundsCount = 1;
        dataToExport.forEach(candidate => {
            const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => Number(r.phase || 1) === Number(activePhase)) : [];
            if (rounds.length > maxRoundsCount) maxRoundsCount = rounds.length;
        });

        const roundSections = [];
        for (let i = 1; i <= maxRoundsCount; i++) {
            roundSections.push({
                title: `Round ${i}`,
                subHeaders: [
                    'Interviewer Feedback',
                    'Interview date',
                    'Interviewer Name',
                    ...softSkillsHeaders,
                    ...techSkillsHeaders,
                    'Performance Rating',
                    'Interview Status'
                ],
                width: 5 + softSkillsHeaders.length + techSkillsHeaders.length
            });
        }

        // Helper functions to parse and format candidate skills and experience
        const getAllCandidateSkills = (candidate) => {
            const list = [];
            const seen = new Set();

            const addSkill = (name, exp) => {
                if (!name || typeof name !== 'string') return;
                const cleanName = name.trim();
                if (!cleanName) return;
                const key = cleanName.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);

                const expNum = Number(exp);
                const validExp = (!isNaN(expNum) && expNum >= 0) ? expNum : null;
                list.push({ skill: cleanName, experience: validExp });
            };

            const processItem = (item) => {
                if (!item) return;
                if (typeof item === 'string') {
                    if (item.includes(',')) {
                        item.split(',').forEach(processItem);
                        return;
                    }
                    const match = item.match(/^([^(]+)(?:\((\d+(?:\.\d+)?)\s*(?:yrs|years|yr)?\))?/i);
                    if (match) {
                        const name = match[1].trim();
                        const exp = match[2] ? parseFloat(match[2]) : null;
                        addSkill(name, exp);
                    } else {
                        addSkill(item, null);
                    }
                } else if (typeof item === 'object') {
                    const name = (item.skill || item.name || item.skillName || item.title || '').trim();
                    const exp = item.experience !== undefined && item.experience !== null ? item.experience : item.yearsOfExperience;
                    addSkill(name, exp);
                }
            };

            const sources = [
                candidate?.mustHaveSkills,
                candidate?.niceToHaveSkills,
                candidate?.skills,
                candidate?.technicalSkills,
                candidate?.primarySkills
            ];

            sources.forEach(src => {
                if (Array.isArray(src)) {
                    src.forEach(processItem);
                } else if (typeof src === 'string') {
                    processItem(src);
                } else if (typeof src === 'object' && src !== null) {
                    if (Array.isArray(src.technical)) src.technical.forEach(processItem);
                    if (Array.isArray(src.softSkills)) src.softSkills.forEach(processItem);
                }
            });

            return list;
        };

        const formatAllSkillsSummary = (candidate) => {
            const skills = getAllCandidateSkills(candidate);
            if (!skills.length) return null;

            return skills.map(s => {
                if (s.experience !== null && s.experience !== undefined) {
                    return `${s.skill} (${s.experience} yrs)`;
                }
                return s.skill;
            }).join(', ');
        };

        const getCandidateSkillExp = (candidate, targetSkillName) => {
            if (!targetSkillName) return null;
            const allSkills = getAllCandidateSkills(candidate);
            const targetKey = targetSkillName.trim().toLowerCase();

            const match = allSkills.find(s => {
                const key = s.skill.toLowerCase();
                return key === targetKey || key.includes(targetKey) || targetKey.includes(key);
            });

            if (match) {
                if (match.experience !== null && match.experience !== undefined) {
                    return `${match.experience} yrs`;
                }
                return 'Yes';
            }
            return null;
        };

        // Define sections to iterate over for building Row 1, Row 2 and rowData
        const excelSections = [
            { title: 'Basic Info', subHeaders: ['S.no', 'Submission Date', 'Source', 'Profile pulled by', 'Calling by', 'Name of Candidate', 'Total Experience'], width: 7 },
            { title: 'Internal Round', subHeaders: ['TAT', 'Rate', 'Remarks'], width: 3 },
            { title: 'Experience', subHeaders: ['Relevant Experience'], width: 1 },
            { title: 'Technical Skills (Experience)', subHeaders: techSkillsHeaders, width: techSkillsHeaders.length },
            { title: 'Education & Employment', subHeaders: ['Qualification', 'Company'], width: 2 },
            { title: 'Compensation', subHeaders: ['CTC', 'Expected CTC'], width: 2 },
            { title: 'Availability & Location', subHeaders: ['Notice Period(Days)', 'Last Working Day', 'Location', 'Preferred Location'], width: 4 },
            { title: 'Contact Details', subHeaders: ['Email', 'Mobile No.'], width: 2 },
            { title: 'Offer Details', subHeaders: ['Offer Company', 'Date Of Joining new company'], width: 2 },
            { title: 'Status & Remarks', subHeaders: ['Status', 'Remark', 'Custom Remark'], width: 3 },
            ...roundSections,
            { title: 'Final Status & Decision', subHeaders: [PROFILE_SHORTLISTED_HEADER, 'Final Scoring', 'Profile Shared', 'Shortlisted (Phase 2)', 'Selected (Phase 2)', 'Interviewer Feedback (Phase 2)', 'Interview Status (Phase2)', 'Reason', 'Decision Status (Auto-calculated)'], width: 9 }
        ].filter(sec => sec.width > 0);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Candidates');
        const validationSheet = workbook.addWorksheet('_ValidationLists');

        const buildValidationRangeFormula = (columnLetter, itemCount) => (
            `'${validationSheet.name}'!$${columnLetter}$1:$${columnLetter}$${Math.max(itemCount, 1)}`
        );

        LEGACY_EXPORT_STATUS_OPTIONS.forEach((option, index) => {
            validationSheet.getCell(`A${index + 1}`).value = option;
        });
        PROFILE_SHORTLISTED_EXPORT_OPTIONS.forEach((option, index) => {
            validationSheet.getCell(`B${index + 1}`).value = option;
        });
        validationSheet.state = 'hidden';
        const candidateStatusValidationFormula = buildValidationRangeFormula('A', LEGACY_EXPORT_STATUS_OPTIONS.length);
        const profileShortlistedValidationFormula = buildValidationRangeFormula('B', PROFILE_SHORTLISTED_EXPORT_OPTIONS.length);

        // Row 1: MAIN HEADINGS
        const row1Data = [];
        excelSections.forEach(sec => {
            row1Data.push(sec.title);
            for (let i = 1; i < sec.width; i++) row1Data.push('');
        });
        const row1 = sheet.addRow(row1Data);

        // Row 2: SUB-HEADERS
        const row2Data = [];
        excelSections.forEach(sec => {
            sec.subHeaders.forEach(sub => row2Data.push(sub));
        });
        const row2 = sheet.addRow(row2Data);

        // Merging Row 1 for Main Headings
        let currentCol = 1;
        excelSections.forEach(sec => {
            if (sec.width > 1) {
                sheet.mergeCells(1, currentCol, 1, currentCol + sec.width - 1);
            }
            currentCol += sec.width;
        });

        const applyRoundColumnValidation = (startRow, endRow) => {
            let sectionStartCol = 1;
            excelSections.forEach((section) => {
                if (section.title.startsWith('Round ')) {
                    const performanceRatingOffset = section.subHeaders.indexOf('Performance Rating');
                    const interviewStatusOffset = section.subHeaders.indexOf('Interview Status');

                    if (performanceRatingOffset >= 0) {
                        const performanceRatingCol = sectionStartCol + performanceRatingOffset;
                        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                            sheet.getCell(rowNumber, performanceRatingCol).dataValidation = {
                                type: 'whole',
                                operator: 'between',
                                allowBlank: true,
                                showErrorMessage: true,
                                formulae: [1, 10],
                                errorTitle: 'Invalid Rating',
                                error: 'Performance Rating must be a whole number between 1 and 10.'
                            };
                        }
                    }

                    if (interviewStatusOffset >= 0) {
                        const interviewStatusCol = sectionStartCol + interviewStatusOffset;
                        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                            sheet.getCell(rowNumber, interviewStatusCol).dataValidation = {
                                type: 'list',
                                allowBlank: true,
                                showErrorMessage: true,
                                formulae: [`"${EXPORT_INTERVIEW_STATUS_OPTIONS.join(',')}"`],
                                errorTitle: 'Invalid Interview Status',
                                error: `Interview Status must be one of: ${EXPORT_INTERVIEW_STATUS_OPTIONS.join(', ')}.`
                            };
                        }
                    }
                }

                sectionStartCol += section.width;
            });
        };

        const applyCandidateStatusValidation = (startRow, endRow) => {
            let sectionStartCol = 1;
            excelSections.forEach((section) => {
                if (section.title === 'Status & Remarks') {
                    const statusOffset = section.subHeaders.indexOf('Status');
                    if (statusOffset >= 0) {
                        const statusCol = sectionStartCol + statusOffset;
                        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                            sheet.getCell(rowNumber, statusCol).dataValidation = {
                                type: 'list',
                                allowBlank: true,
                                showErrorMessage: true,
                                formulae: [candidateStatusValidationFormula],
                                errorTitle: 'Invalid Status',
                                error: `Status must be one of: ${LEGACY_EXPORT_STATUS_OPTIONS.join(', ')}.`
                            };
                        }
                    }
                }

                sectionStartCol += section.width;
            });
        };

        const applyPhase2InterviewStatusValidation = (startRow, endRow) => {
            let sectionStartCol = 1;
            excelSections.forEach((section) => {
                if (section.title === 'Final Status & Decision') {
                    const phase2InterviewStatusOffset = section.subHeaders.indexOf('Interview Status (Phase2)');
                    if (phase2InterviewStatusOffset >= 0) {
                        const phase2InterviewStatusCol = sectionStartCol + phase2InterviewStatusOffset;
                        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                            sheet.getCell(rowNumber, phase2InterviewStatusCol).dataValidation = {
                                type: 'list',
                                allowBlank: true,
                                showErrorMessage: true,
                                formulae: ['"Scheduled,Did not Turn up"'],
                                errorTitle: 'Invalid Phase 2 Interview Status',
                                error: 'Interview Status (Phase2) must be: Scheduled or Did not Turn up.'
                            };
                        }
                    }
                }
                sectionStartCol += section.width;
            });
        };

        const applyFinalDecisionValidation = (startRow, endRow) => {
            let sectionStartCol = 1;
            excelSections.forEach((section) => {
                if (section.title === 'Final Status & Decision') {
                    const profileShortlistedOffset = section.subHeaders.indexOf(PROFILE_SHORTLISTED_HEADER);
                    if (profileShortlistedOffset >= 0) {
                        const targetCol = sectionStartCol + profileShortlistedOffset;
                        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                            sheet.getCell(rowNumber, targetCol).dataValidation = {
                                type: 'list',
                                allowBlank: true,
                                showErrorMessage: true,
                                formulae: [profileShortlistedValidationFormula],
                                errorTitle: 'Invalid Value',
                                error: `${PROFILE_SHORTLISTED_HEADER} must be one of: ${PROFILE_SHORTLISTED_EXPORT_OPTIONS.join(', ')}.`
                            };
                        }
                    }

                    ['Profile Shared', 'Shortlisted (Phase 2)', 'Selected (Phase 2)'].forEach((headerName) => {
                        const offset = section.subHeaders.indexOf(headerName);
                        if (offset >= 0) {
                            const targetCol = sectionStartCol + offset;
                            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                                sheet.getCell(rowNumber, targetCol).dataValidation = {
                                    type: 'list',
                                    allowBlank: true,
                                    showErrorMessage: true,
                                    formulae: ['"Yes,No"'],
                                    errorTitle: 'Invalid Value',
                                    error: `${headerName} must be either Yes or No.`
                                };
                            }
                        }
                    });
                }
                sectionStartCol += section.width;
            });
        };

        // Set Column Widths and Formatting
        row2Data.forEach((_, i) => {
            const col = sheet.getColumn(i + 1);
            col.width = 18; // default
            if (i === 0) col.width = 8; // S.no
            if (row2Data[i] === 'Remarks' || row2Data[i] === 'Interviewer Feedback' || row2Data[i] === 'Interviewer Feedback (Phase 2)') col.width = 35;
            if (row2Data[i] === 'Name of Candidate' || row2Data[i].includes('Skill')) col.width = 25;

            col.alignment = { wrapText: true, vertical: 'middle' };
        });

        // Formatting headers
        [row1, row2].forEach((row, rowIndex) => {
            row.font = { bold: true };
            row.alignment = { horizontal: 'center', vertical: 'middle' };
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowIndex === 0 ? 'FFD9EAD3' : 'FFE0E0E0' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Freeze top 2 rows
        sheet.views = [{ state: 'frozen', ySplit: 2 }];

        // Add Filters to Row 2
        sheet.autoFilter = {
            from: { row: 2, column: 1 },
            to: { row: 2, column: row2Data.length }
        };

        dataToExport.forEach((candidate, index) => {
            const rounds = candidate.interviewRounds ? candidate.interviewRounds.filter(r => Number(r.phase || 1) === Number(activePhase)) : [];

            const techSkillRatings = techSkillsHeaders.map(skillName => getCandidateSkillExp(candidate, skillName));
            const allCandidateSkillsSummary = formatAllSkillsSummary(candidate);

            // Collect data for each round
            const roundsData = [];
            for (let i = 0; i < maxRoundsCount; i++) {
                const r = rounds[i];
                if (r) {
                    const feedback = toEmptyCell(r.feedback);
                    const dateVal = r.scheduledDate || r.evaluatedAt;
                    const date = dateVal ? format(new Date(dateVal), 'dd-MMM-yyyy') : null;
                    const resolveUserName = (u) => {
                        if (!u) return '';
                        if (typeof u === 'object') {
                            return `${u.firstName || ''} ${u.lastName || ''}`.trim();
                        }
                        if (typeof u === 'string') {
                            const found = users.find(usr => String(usr._id) === String(u));
                            if (found) {
                                return `${found.firstName || ''} ${found.lastName || ''}`.trim();
                            }
                        }
                        return '';
                    };

                    let interviewer = '';
                    if (r.evaluatedBy && resolveUserName(r.evaluatedBy)) {
                        interviewer = resolveUserName(r.evaluatedBy);
                    } else if (Array.isArray(r.assignedTo) && r.assignedTo.length > 0) {
                        interviewer = r.assignedTo
                            .map(u => resolveUserName(u))
                            .filter(Boolean)
                            .join(', ');
                    }

                    if (!interviewer) {
                        interviewer = r.interviewerName || '';
                    }
                    const performanceRating = toEmptyCell(r.rating, { zeroIsEmpty: true });
                    const roundInterviewStatus = getRoundExportInterviewStatus(r);

                    const rSoftSkillRatings = softSkillsHeaders.map(skillName => {
                        const rating = (r.skillRatings || []).find(sr => sr.skill === skillName)?.rating;
                        return rating !== undefined ? `${rating}/10` : null;
                    });

                    const rTechSkillRatings = techSkillsHeaders.map(skillName => {
                        const sr = (r.skillRatings || []).find(s => s.skill === skillName);
                        return sr ? `${sr.rating}/10` : null;
                    });

                    roundsData.push(feedback, date, toEmptyCell(interviewer), ...rSoftSkillRatings, ...rTechSkillRatings, performanceRating, roundInterviewStatus);
                } else {
                    const fieldCount = 5 + softSkillsHeaders.length + techSkillsHeaders.length;
                    for (let j = 0; j < fieldCount; j++) roundsData.push(null);
                }
            }

            const profileShortlisted = candidate.decision === 'Shortlisted'
                ? 'Yes'
                : candidate.decision === 'Rejected'
                    ? 'No'
                    : candidate.decision === 'Did Not Turn Up'
                        ? 'Did Not Turn Up'
                        : candidate.decision === 'On Hold'
                            ? 'On Hold'
                            : '';
            // "Shortlisted (Phase 2)" = Yes if shortlisted/selected, No if rejected — so round-trip import restores phase2Decision correctly
            const phase2Shortlisted = (candidate.phase2Decision === 'Shortlisted' || candidate.phase2Decision === 'Selected')
                ? 'Yes'
                : (candidate.phase2Decision === 'Rejected' || candidate.phase2Decision === 'On Hold' || candidate.phase2Decision === 'Left in between')
                    ? 'No'
                    : null;
            const phase2Selected = candidate.phase2Decision === 'Selected' ? 'Yes' : null;
            const phase2InterviewStatus = getPhase2InterviewStatusExportValue(candidate);

            // Construct row data according to sections order
            const rowData = [
                index + 1,
                candidate.uploadedAt ? format(new Date(candidate.uploadedAt), 'dd-MMM-yyyy') : null,
                toEmptyCell(candidate.source),
                toEmptyCell(candidate.profilePulledBy),
                toEmptyCell(candidate.calledBy),
                toEmptyCell(candidate.candidateName),
                toEmptyCell(candidate.totalExperience !== undefined && candidate.totalExperience !== null ? `${candidate.totalExperience} yrs` : null),

                toEmptyCell(candidate.tatToJoin, { zeroIsEmpty: true }),
                toEmptyCell(candidate.rate, { zeroIsEmpty: true }),
                toEmptyCell(candidate.remark),

                toEmptyCell(candidate.relevantExperience !== undefined && candidate.relevantExperience !== null ? `${candidate.relevantExperience} yrs` : null),
                ...techSkillRatings,

                toEmptyCell(candidate.qualification),
                toEmptyCell(candidate.currentCompany),

                toEmptyCell(candidate.currentCTC, { zeroIsEmpty: true }),
                toEmptyCell(candidate.expectedCTC, { zeroIsEmpty: true }),

                toEmptyCell(candidate.noticePeriod, { zeroIsEmpty: true }),
                candidate.lastWorkingDay ? format(new Date(candidate.lastWorkingDay), 'dd-MMM-yyyy') : null,
                toEmptyCell(candidate.currentLocation),
                toEmptyCell(candidate.preferredLocation),

                toEmptyCell(candidate.email),
                toEmptyCell(candidate.mobile),

                toEmptyCell(candidate.offerCompany),
                candidate.offerJoiningDate ? format(new Date(candidate.offerJoiningDate), 'dd-MMM-yyyy') : null,

                toEmptyCell(candidate.status),
                toEmptyCell(candidate.remark),
                toEmptyCell(candidate.customRemark),

                ...roundsData,

                toEmptyCell(profileShortlisted),
                null, // Final Scoring
                candidate.profileShared === true ? 'Yes' : null, // Profile Shared
                phase2Shortlisted,
                phase2Selected,
                toEmptyCell(candidate.phase2InterviewerFeedback),
                toEmptyCell(phase2InterviewStatus),
                toEmptyCell(candidate.rejectionReason),
                null // Decision Status
            ];

            const row = sheet.addRow(rowData);

            const totalColsBeforeLast = row2Data.length - 9;
            const profileShortlistedColIndex = totalColsBeforeLast + 1;
            const decisionStatusColIndex = totalColsBeforeLast + 9;

            const colLetter = sheet.getColumn(profileShortlistedColIndex).letter;
            const formulaRow = row.number;
            if (profileShortlisted) {
                row.getCell(decisionStatusColIndex).value = {
                    formula: `IF(${colLetter}${formulaRow}="Yes","Shortlisted",IF(${colLetter}${formulaRow}="No","Rejected",IF(${colLetter}${formulaRow}="Did Not Turn Up","Did Not Turn Up",IF(${colLetter}${formulaRow}="On Hold","On Hold",""))))`,
                    result: profileShortlisted === 'Yes'
                        ? 'Shortlisted'
                        : profileShortlisted === 'No'
                            ? 'Rejected'
                            : profileShortlisted
                };
            } else {
                row.getCell(decisionStatusColIndex).value = null;
            }
        });

        const lastCandidateRow = Math.max(1000, dataToExport.length + 2);
        applyCandidateStatusValidation(3, lastCandidateRow);
        applyRoundColumnValidation(3, lastCandidateRow);
        applyPhase2InterviewStatusValidation(3, lastCandidateRow);
        applyFinalDecisionValidation(3, lastCandidateRow);

        const buffer = await workbook.xlsx.writeBuffer();

        const roleTitle = requisitionData?.roleDetails?.title || positionName || 'Candidates';
        const fileName = `${roleTitle} Candidate List.xlsx`;

        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
        toast.success('Excel exported successfully!', { id: 'export-excel' });
    } catch (error) {
        console.error('Export error:', error);
        toast.error('Failed to export Excel', { id: 'export-excel' });
    }
};
