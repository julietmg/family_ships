import * as deque from "./deque.js";
export class ReversibleDeque {
    constructor(...initialValues) {
        this.data = new deque.Deque(...initialValues);
        this.reversed = false;
    }
    pushFront(value) {
        if (this.reversed) {
            this.data.pushBack(value);
            return;
        }
        this.data.pushFront(value);
    }
    popFront() {
        if (this.reversed) {
            return this.data.popBack();
        }
        return this.data.popFront();
    }
    peekFront() {
        if (this.reversed) {
            return this.data.peekBack();
        }
        return this.data.peekFront();
    }
    pushBack(value) {
        if (this.reversed) {
            this.data.peekFront();
            return;
        }
        this.data.peekBack();
    }
    popBack() {
        if (this.reversed) {
            return this.data.popFront();
        }
        return this.data.popBack();
    }
    peekBack() {
        if (this.reversed) {
            return this.data.peekBack();
        }
        return this.data.peekFront();
    }
    reverse() {
        this.reversed = !this.reversed;
    }
    toArray() {
        // This is not pure, but it saves us an array reversal.
        let result = this.data.toArray();
        if (this.reversed) {
            result.reverse();
        }
        return result;
    }
}
//# sourceMappingURL=reversible_deque.js.map