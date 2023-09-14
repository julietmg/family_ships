export type Node<T> = {
    value : T
    left?: Node<T>
    right? : Node<T>
}

// This `Deque` is special, as it exposes the fact that it's implemented as
// a doubly linked list and returns the information about the nodes when 
// pushing.
// This means you need to be very careful when popping things.
export class Deque<T> {
    front : Node<T>
    back : Node<T>
    constructor(...initialValues: T[]) {
        this.front = undefined;
        this.back = undefined;
        initialValues.forEach(initialValue => {
            this.pushRight(initialValue);
        });
    }
    left(node : Node<T>): Node<T> {
        return node.left;
    }
    right(node: Node<T>): Node<T> {
        return node.right;
    }
    pushLeft(value: T) {
        if (this.front == undefined) { 
            this.front = { value };
            this.back = this.front;
        }
        else {
            this.front.left = { value, right: this.front };
            this.front = this.front.left;
        }
        return this.front;
    }
    peekLeft() {
        if (this.front != undefined) {
            return this.front.value;
        }
        return undefined;
    }
    popLeft() {
        let value = this.peekLeft();
        if (value == undefined || this.front == this.back) {
            this.front = undefined;
            this.back = undefined;
        }
        else {
            this.front = this.front.right;
            this.front.left = undefined;
        }
        return value;
    }
    pushRight(value: T) {
        if (this.back == undefined) { 
            this.front = { value };
            this.back = this.front;
        }
        else {
            this.back.right = { value, left: this.back };
            this.back = this.back.right;
        }
        return this.back;
    }
    peekRight() {
        if (this.back != undefined) {
            return this.back.value;
        }
        return undefined;
    }
    popRight() {
        let value = this.peekRight();
        if (value == undefined || this.front == this.back) {
            this.front = undefined;
            this.back = undefined;
        }
        else {
            this.back = this.back.left;
            this.back.right = undefined;
        }
        return value;
    }
    appendRight(b : Deque<T>) {
        if(b.front == undefined) {
            return;
        }
        if (this.front == undefined) {
            this.front = b.front;
            this.back = b.back;
        }
        else {
            this.back.right = b.front;
            b.front.left = this.back;

            this.back = b.back;
        }
        b.back = undefined;
        b.front = undefined;
        return;
    }
    appendLeft(b : Deque<T>) {
        if(b.back == undefined) {
            return;
        }
        if (this.back == undefined) {
            this.front = b.front;
            this.back = b.back;
        }
        else {
            this.front.left = b.back;
            b.back.right = this.front;
            
            this.front = b.front;
        }
        b.back = undefined;
        b.front = undefined;
        return;
    }
    reverse() {
        if(this.front == undefined) {
            return;
        }
        let current = this.front;
        while(current != undefined) {
            const right : Node<T> = current.right;
            current.right = current.left;
            current.left = right;
            current = right;
        }
        
        const back : Node<T> = this.back;
        this.back = this.front;
        this.front = back;
    }
    toArray() {
        if(this.front == undefined) {
            return [];
        }
        let result : Array<T> = [];
        let current = this.front;
        while(current != this.back) {
            result.push(current.value);
            current = current.right;
        }
        result.push(current.value);
        return result;
    }
}
