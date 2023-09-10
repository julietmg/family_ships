export class Deque {
    constructor(...initialValues) {
        this.front = undefined;
        this.back = undefined;
        initialValues.forEach(initialValue => {
            this.pushBack(initialValue);
        });
    }
    pushFront(value) {
        if (this.front == undefined) {
            this.front = { value };
            this.back = this.front;
        }
        else {
            this.front.prev = { value, next: this.front };
            this.front = this.front.prev;
        }
    }
    peekFront() {
        if (this.front != undefined) {
            return this.front.value;
        }
        return undefined;
    }
    popFront() {
        let value = this.peekFront();
        if (value == undefined || this.front == this.back) {
            this.front = undefined;
            this.back = undefined;
        }
        else {
            this.front = this.front.next;
            this.front.prev = undefined;
        }
        return value;
    }
    pushBack(value) {
        if (this.back == undefined) {
            this.front = { value };
            this.back = this.front;
        }
        else {
            this.back.next = { value, prev: this.back };
            this.back = this.back.next;
        }
    }
    peekBack() {
        if (this.back != undefined) {
            return this.back.value;
        }
        return undefined;
    }
    popBack() {
        let value = this.peekBack();
        if (value == undefined || this.front == this.back) {
            this.front = undefined;
            this.back = undefined;
        }
        else {
            this.back = this.back.prev;
            this.back.next = undefined;
        }
        return value;
    }
    appendBack(b) {
        if (b.front == undefined) {
            return;
        }
        if (this.front == undefined) {
            this.front = b.front;
            this.back = b.back;
        }
        else {
            this.back.next = b.front;
            b.front.prev = this.back;
            this.back = b.back;
        }
        b.back = undefined;
        b.front = undefined;
        return;
    }
    appendFront(b) {
        if (b.back == undefined) {
            return;
        }
        if (this.back == undefined) {
            this.front = b.front;
            this.back = b.back;
        }
        else {
            this.front.prev = b.back;
            b.back.next = this.front;
            this.front = b.front;
        }
        b.back = undefined;
        b.front = undefined;
        return;
    }
    reverse() {
        if (this.front == undefined) {
            return;
        }
        let current = this.front;
        while (current != undefined) {
            const next = current.next;
            current.next = current.prev;
            current.prev = next;
            current = next;
        }
        const back = this.back;
        this.back = this.front;
        this.front = back;
    }
    toArray() {
        if (this.front == undefined) {
            return [];
        }
        let result = [];
        let current = this.front;
        while (current != this.back) {
            result.push(current.value);
            current = current.next;
        }
        result.push(current.value);
        return result;
    }
}
//# sourceMappingURL=deque.js.map