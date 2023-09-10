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
            this.data.pushFront(value);
            return;
        }
        this.data.pushBack(value);
    }
    popBack() {
        if (this.reversed) {
            return this.data.popFront();
        }
        return this.data.popBack();
    }
    peekBack() {
        if (this.reversed) {
            return this.data.peekFront();
        }
        return this.data.peekBack();
    }
    reverse() {
        this.reversed = !this.reversed;
    }
    appendBack(b : ReversibleDeque<T>) {
        if(this.reversed == b.reversed) {
            this.data.appendBack(b.data);
        }
        else {
            b.data.reverse();
            this.data.appendBack(b.data);
        }
    }

    appendFront(b : ReversibleDeque<T>) {
        if(this.reversed == b.reversed) {
            this.data.appendFront(b.data);
        }
        else {
            b.data.reverse();
            this.data.appendFront(b.data);
        }
    }
    
    toArray() {
        let result = this.data.toArray();
        if(this.reversed) {
            result.reverse();
        }
        return result;
    }
}
