import * as config from "./config.js";
import * as reversible_deque from "./reversible_deque.js";
import * as utils from "./utils.js";
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [simple]");
    let d = new reversible_deque.ReversibleDeque();
    d.pushFront(1);
    d.pushFront(2);
    d.pushFront(3);
    d.pushFront(4);
    // This output might be useful when debugging this test.
    // console.log(d);
    // console.log(d.toArray());
    // console.log(d.peekFront());
    // console.log(d.peekBack());
    console.assert(d.peekFront() == 4);
    console.assert(d.peekBack() == 1);
    d.pushBack(6);
    console.assert(d.popBack() == 6);
    console.assert(d.popFront() == 4);
    console.assert(d.popBack() == 1);
    console.log("reversible_deque_test.ts: Finished [simple]");
}
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [merge_back]");
    let a = new reversible_deque.ReversibleDeque();
    a.pushBack(1);
    a.pushBack(2);
    a.pushBack(3);
    a.pushBack(4);
    let b = new reversible_deque.ReversibleDeque();
    b.pushBack(5);
    b.pushBack(6);
    b.pushBack(7);
    b.pushBack(8);
    b.reverse();
    a.appendBack(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(b);
    // console.log(a.toArray());
    // console.log(b.toArray());
    console.assert(utils.arraysEqual(a.toArray(), [5, 6, 7, 8, 4, 3, 2, 1]));
    console.log("reversible_deque_test.ts: Finished [merge_back]");
}
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [merge_front]");
    let a = new reversible_deque.ReversibleDeque();
    a.pushBack(1);
    a.pushBack(2);
    a.pushBack(3);
    a.pushBack(4);
    a.reverse();
    let b = new reversible_deque.ReversibleDeque();
    b.pushBack(5);
    b.pushBack(6);
    b.pushBack(7);
    b.pushBack(8);
    b.reverse();
    a.appendFront(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(b);
    // console.log(a.toArray());
    // console.log(b.toArray());
    console.assert(utils.arraysEqual(a.toArray(), [5, 6, 7, 8, 1, 2, 3, 4]));
    console.log("reversible_deque_test.ts: Finished [merge_front]");
}
//# sourceMappingURL=reversible_deque_test.js.map