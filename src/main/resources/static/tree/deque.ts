type Node<T> = {
    value : T
    prev?: Node<T>
    next? : Node<T>
}

export class Deque<T> {
    front : Node<T>
    back : Node<T>
    constructor(...initialValues: T[]) {
        this.front = undefined;
        this.back = undefined;
        initialValues.forEach(initialValue => {
            this.pushBack(initialValue);
        });
    }
    pushFront(value: T) {
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
    pushBack(value: T) {
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
    toArray() {
        if(this.front == undefined) {
            return [];
        }
        let result : Array<T> = [];
        let current = this.front;
        while(current != this.back) {
            result.push(current.value);
            current = current.next;
        }
        result.push(current.value);
        return result;
    }
}
