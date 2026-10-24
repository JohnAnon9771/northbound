// Views call rerender() after changing their own local UI state (filters, open panels…).
let fn = () => {};
export const setRenderer = f => { fn = f; };
export const rerender = () => fn();
