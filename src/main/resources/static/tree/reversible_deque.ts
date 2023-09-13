import * as deque from "./deque.js";

export type Node<T> = deque.Node<T>;

// This is the same as `deque.Deque`, but it allows for O(1) reversal.
// This incurs a big cost on `appendLeft` and `appendRight` which are now O(n).
// Be  way of using pointers returned by `pushLeft` as they have different meaning
// depending on the `reversed` field. Use the provided function instead.
export class ReversibleDeque<T> {
    data: deque.Deque<T>
    reversed: boolean
    constructor(...initialValues: T[]) {
        this.data = new deque.Deque(...initialValues);
        this.reversed = false;
    }
    left(node : Node<T>): Node<T> {
        if(this.reversed) {
            return node.right;
        }
        return node.left;
    }
    right(node: Node<T>): Node<T> {
        if(this.reversed) {
            return node.left;
        }
        return node.right;
    }
    pushLeft(value: T) {
        if (this.reversed) {
            return this.data.pushRight(value);
        }
        return this.data.pushLeft(value);
    }
    popLeft() {
        if (this.reversed) {
            return this.data.popRight();
        }
        return this.data.popLeft();
    }
    peekLeft() {
        if (this.reversed) {
            return this.data.peekRight();
        }
        return this.data.peekLeft();
    }
    pushRight(value: T) {
        if (this.reversed) {
            return this.data.pushLeft(value);
        }
        return this.data.pushRight(value);
    }
    popRight() {
        if (this.reversed) {
            return this.data.popLeft();
        }
        return this.data.popRight();
    }
    peekRight() {
        if (this.reversed) {
            return this.data.peekLeft();
        }
        return this.data.peekRight();
    }
    reverse() {
        this.reversed = !this.reversed;
    }
    appendRight(b : ReversibleDeque<T>) {
        if(this.reversed != b.reversed) {
            b.data.reverse();
        }
        if(this.reversed) {
            this.data.appendLeft(b.data);
        } else {
            this.data.appendRight(b.data);
        }
    }

    appendLeft(b : ReversibleDeque<T>) {
        if(this.reversed != b.reversed) {
            b.data.reverse();
        }
        if(this.reversed) {
            this.data.appendRight(b.data);
        } else {
            this.data.appendLeft(b.data);
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
