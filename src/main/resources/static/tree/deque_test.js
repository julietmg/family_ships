import * as config from "./config.js";
import * as deque from "./deque.js";
import * as utils from "./utils.js";
if (config.test) {
    console.log("deque_test.ts: Starting [simple]");
    let d = new deque.Deque();
    d.pushLeft(1);
    d.pushLeft(2);
    d.pushLeft(3);
    d.pushLeft(4);
    console.assert(d.peekLeft() == 4);
    console.assert(d.peekRight() == 1);
    d.pushRight(6);
    console.assert(d.popRight() == 6);
    console.assert(d.popLeft() == 4);
    console.assert(d.popRight() == 1);
    console.log("deque_test.ts: Finished [simple]");
}
if (config.test) {
    console.log("deque_test.ts: Starting [merge_back]");
    let a = new deque.Deque();
    a.pushRight(1);
    a.pushRight(2);
    a.pushRight(3);
    a.pushRight(4);
    let b = new deque.Deque();
    b.pushRight(5);
    b.pushRight(6);
    b.pushRight(7);
    b.pushRight(8);
    a.appendRight(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(b);
    // console.log(a.toArray());
    // console.log(b.toArray());
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(a.toArray());
    console.assert(utils.arraysEqual(a.toArray(), [1, 2, 3, 4, 5, 6, 7, 8]));
    console.log("deque_test.ts: Finished [merge_back]");
}
if (config.test) {
    console.log("deque_test.ts: Starting [merge_front]");
    let a = new deque.Deque();
    a.pushRight(1);
    a.pushRight(2);
    a.pushRight(3);
    a.pushRight(4);
    let b = new deque.Deque();
    b.pushRight(5);
    b.pushRight(6);
    b.pushRight(7);
    b.pushRight(8);
    a.appendLeft(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(b);
    // console.log(a.toArray());
    // console.log(b.toArray());
    console.assert(utils.arraysEqual(a.toArray(), [5, 6, 7, 8, 1, 2, 3, 4]));
    console.log("deque_test.ts: Finished [merge_front]");
}
//# sourceMappingURL=deque_test.js.map