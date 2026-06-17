export function getQuadrant(urgency, importance) {
    if (urgency === 'high' && importance === 'high')
        return 'q1';
    if (urgency !== 'high' && importance === 'high')
        return 'q2';
    if (urgency === 'high' && importance !== 'high')
        return 'q3';
    return 'q4';
}
export function getEffectiveQuadrant(task) {
    const u = task.effectiveUrgency || task.urgency;
    return getQuadrant(u, task.importance);
}
export const QUADRANT_CONFIG = {
    q1: { label: '马上做', color: '#f85149' },
    q2: { label: '计划做', color: '#d29922' },
    q3: { label: '委派', color: '#58a6ff' },
    q4: { label: '暂缓', color: '#484f58' },
};
