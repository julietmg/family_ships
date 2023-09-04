// We have a switch hidden on the main webpage that switches on the "debug" mode.
export function debug() : boolean {
    return (document.getElementById("debug-switch") as HTMLInputElement).checked;
}

export function log(args : any) {
    if(debug()) {
        console.log(args);
    }
}