import * as deque from "./deque.js";

export class ReversibleDeque<T> {
    data: deque.Deque<T>
    reversed: boolean
    constructor(...initialValues: T[]) {
        this.data = new deque.Deque(...initialValues);
        this.reversed = false;
    }
    pushFront(value: T) {
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
    pushBack(value: T) {
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
        if (this.reversed) {
            let result: Array<T> = [];
            for (let i = this.data.back - 1; i >= this.data.front; i -= 1) {
                result.push(this.data.data[i]);
            }
            return result;
        }

        let result: Array<T> = [];
        for (let i = this.data.front; i < this.data.back; i += 1) {
            result.push(this.data.data[i]);
        }
        return result;
    }
}