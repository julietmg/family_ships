// We have a switch hidden on the main webpage that switches on the "debug" mode.
export function debug() {
    return false;
}
export function log(args) {
    if (debug()) {
        console.log(args);
    }
}
//# sourceMappingURL=tools.js.map