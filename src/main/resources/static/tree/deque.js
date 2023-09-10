export class Deque {
    constructor(...initialValues) {
        this.data = {}; // Or Array, but that really does not add anything useful
        this.front = 0;
        this.back = 1;
        this.size = 0;
        initialValues.forEach(initialValue => {
            this.pushBack(initialValue);
        });
    }
    pushFront(value) {
        if (this.size >= Number.MAX_SAFE_INTEGER)
            throw "Deque capacity overflow";
        this.size++;
        this.front = (this.front + 1) % Number.MAX_SAFE_INTEGER;
        this.data[this.front] = value;
    }
    popFront() {
        if (!this.size)
            return;
        let value = this.peekFront();
        this.size--;
        delete this.data[this.front];
        this.front = (this.front || Number.MAX_SAFE_INTEGER) - 1;
        return value;
    }
    peekFront() {
        if (this.size)
            return this.data[this.front];
    }
    pushBack(value) {
        if (this.size >= Number.MAX_SAFE_INTEGER)
            throw "Deque capacity overflow";
        this.size++;
        this.back = (this.back || Number.MAX_SAFE_INTEGER) - 1;
        this.data[this.back] = value;
    }
    popBack() {
        if (!this.size)
            return;
        let value = this.peekBack();
        this.size--;
        delete this.data[this.back];
        this.back = (this.back + 1) % Number.MAX_SAFE_INTEGER;
        return value;
    }
    peekBack() {
        if (this.size)
            return this.data[this.back];
    }
    toArray() {
        let result = [];
        for (let i = this.front; i < this.back; i += 1) {
            result.push(this.data[i]);
        }
        return result;
    }
}
//# sourceMappingURL=deque.js.map