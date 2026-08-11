import { PIPELINE_FIXED_STAGES } from '@/features/talent-acquisition/utils/CandidateListConstants';

/**
 * buildDynamicPipeline
 *
 * Given a flat list of candidates or rounds, returns an ordered array of node descriptors
 * representing the recruitment pipeline, interleaving interview rounds after their assignAfterStage anchor.
 */
export const buildDynamicPipeline = (roundsOrCandidates, phase = 1, fixedStages = PIPELINE_FIXED_STAGES) => {
    const fixedSet = new Set(fixedStages);
    const defaultAnchor = phase === 2 ? 'Shortlisted' : 'Interested';
    const roundAnchorMap = new Map();

    for (const item of (roundsOrCandidates || [])) {
        if (item.interviewRounds && Array.isArray(item.interviewRounds)) {
            for (const round of item.interviewRounds) {
                const name = String(round.levelName || 'Round 1').trim() || 'Round 1';
                if (roundAnchorMap.has(name)) continue;
                let anchor = String(round.assignAfterStage || defaultAnchor).trim() || defaultAnchor;
                if (anchor === 'Interview Scheduled' || !fixedSet.has(anchor)) {
                    anchor = defaultAnchor;
                }
                roundAnchorMap.set(name, anchor);
            }
        } else if (item) {
            const name = String(item.levelName || 'Round 1').trim() || 'Round 1';
            if (roundAnchorMap.has(name)) continue;
            let anchor = String(item.assignAfterStage || defaultAnchor).trim() || defaultAnchor;
            if (anchor === 'Interview Scheduled' || !fixedSet.has(anchor)) {
                anchor = defaultAnchor;
            }
            roundAnchorMap.set(name, anchor);
        }
    }

    if (roundAnchorMap.size === 0) {
        return [...fixedStages];
    }

    const insertAfter = new Map();
    for (const stage of fixedStages) {
        insertAfter.set(stage, []);
    }

    const allRoundNames = [...roundAnchorMap.keys()];
    const children = new Map();
    for (const name of allRoundNames) {
        children.set(name, []);
    }
    for (const name of allRoundNames) {
        let parent = roundAnchorMap.get(name);
        if (parent === 'Interview Scheduled') parent = defaultAnchor;
        if (parent && !fixedSet.has(parent) && roundAnchorMap.has(parent)) {
            children.get(parent).push(name);
        }
    }

    const visited = new Set();
    const appendRound = (name, bucket) => {
        if (visited.has(name)) return;
        visited.add(name);
        bucket.push(name);
        for (const child of (children.get(name) || [])) {
            appendRound(child, bucket);
        }
    };

    for (const name of allRoundNames) {
        let anchor = roundAnchorMap.get(name);
        if (anchor === 'Interview Scheduled') anchor = defaultAnchor;
        if (fixedSet.has(anchor)) {
            const effectiveAnchor = anchor || defaultAnchor;
            const bucket = insertAfter.get(effectiveAnchor);
            if (bucket) appendRound(name, bucket);
        }
    }

    for (const name of allRoundNames) {
        if (!visited.has(name)) {
            const fallbackBucket = insertAfter.get('Shortlisted') || insertAfter.get(fixedStages[0]);
            if (fallbackBucket) fallbackBucket.push(name);
        }
    }

    const result = [];
    for (const stage of fixedStages) {
        result.push(stage);
        for (const roundName of (insertAfter.get(stage) || [])) {
            result.push(roundName);
        }
    }
    return result;
};
