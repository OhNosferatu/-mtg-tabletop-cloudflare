// H234's timing changes live in the existing gesture source modules. Re-export
// H233's proven single-pass response pipeline so large HTML responses are not
// decoded and rebuilt a second time at the Worker boundary.
export {default} from './worker-h233.js';
