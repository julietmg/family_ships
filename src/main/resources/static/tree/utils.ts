export function arraysEqual<T>(a: Array<T>, b: Array<T>): boolean {
    if (a.length != b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] != b[i]) {
            return false;
        }
    }
    return true;
}

export function arraysDeepEqual<T>(a: T | Array<T>, b: T | Array<T>): boolean {
    if (Array.isArray(a) != Array.isArray(b)) {
        return false;
    }
    if (!Array.isArray(a) || !Array.isArray(b)) {
        return a == b;
    }
    if (a.length != b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i += 1) {
        if (!arraysDeepEqual(a[i], b[i])) {
            return false;
        }
    }
    return true;
}

export function deepArrayToString<T>(a: T | Array<T>): string {
    if (!Array.isArray(a)) {
        return "" + a;
    }
    let result = "[";
    let first = true;
    for (const element of a) {
        if (first) { first = false; } else { result += ","; }
        result += deepArrayToString(element);
    }
    result += "]";
    return result;
}