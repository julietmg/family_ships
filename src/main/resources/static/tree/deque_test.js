import * as config from "./config.js";
import * as deque from "./deque.js";
// demo
if (config.test) {
    console.log("deque_test.ts: Starting");
    let d = new deque.Deque();
    d.pushFront(1);
    d.pushFront(2);
    d.pushFront(3);
    d.pushFront(4);
    console.assert(d.peekFront() == 4);
    console.assert(d.peekBack() == 1);
    d.pushBack(6);
    console.assert(d.popBack() == 6);
    console.assert(d.popFront() == 4);
    console.assert(d.popBack() == 1);
    console.log("deque_test.ts: Finished");
}
//# sourceMappingURL=deque_test.js.map