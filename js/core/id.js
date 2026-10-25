// Short unique ids for logs, cards and reviews.
export function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
