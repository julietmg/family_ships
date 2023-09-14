export function arraysEqual<T>(a : Array<T>, b : Array<T>) : boolean {
    if (a.length != b.length) {
        return false;
    }
    for(let i = 0; i < a.length; i += 1) {
        if(a[i] != b[i]) {
            return false;
        }
    }
    return true;
}

export function arraysDeepEqual<T>(a : Array<Array<T>>, b : Array<Array<T>>) : boolean {
    if (a.length != b.length) {
        return false;
    }
    for(let i = 0; i < a.length; i += 1) {
        if(!arraysEqual(a[i], b[i])) {
            return false;
        }
    }
    return true;
}