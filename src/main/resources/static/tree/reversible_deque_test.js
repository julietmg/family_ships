import * as config from "./config.js";
import * as reversible_deque from "./reversible_deque.js";
import * as utils from "./utils.js";
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [simple]");
    let d = new reversible_deque.ReversibleDeque();
    d.pushLeft(1);
    d.pushLeft(2);
    d.pushLeft(3);
    d.pushLeft(4);
    // This output might be useful when debugging this test.
    // console.log(d);
    // console.log(d.toArray());
    // console.log(d.peekLeft());
    // console.log(d.peekRight());
    console.assert(d.peekLeft() == 4);
    console.assert(d.peekRight() == 1);
    d.pushRight(6);
    console.assert(d.popRight() == 6);
    console.assert(d.popLeft() == 4);
    console.assert(d.popRight() == 1);
    console.log("reversible_deque_test.ts: Finished [simple]");
}
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [merge_back]");
    let a = new reversible_deque.ReversibleDeque();
    a.pushRight(1);
    a.pushRight(2);
    a.pushRight(3);
    a.pushRight(4);
    let b = new reversible_deque.ReversibleDeque();
    b.pushRight(5);
    b.pushRight(6);
    b.pushRight(7);
    b.pushRight(8);
    b.reverse();
    a.appendRight(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(a.toArray());
    console.assert(utils.arraysEqual(a.toArray(), [5, 6, 7, 8, 4, 3, 2, 1]));
    console.log("reversible_deque_test.ts: Finished [merge_back]");
}
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [merge_front]");
    let a = new reversible_deque.ReversibleDeque();
    a.pushRight(1);
    a.pushRight(2);
    a.pushRight(3);
    a.pushRight(4);
    a.reverse();
    let b = new reversible_deque.ReversibleDeque();
    b.pushRight(5);
    b.pushRight(6);
    b.pushRight(7);
    b.pushRight(8);
    b.reverse();
    a.appendLeft(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(a.toArray());
    console.assert(utils.arraysEqual(a.toArray(), [1, 2, 3, 4, 5, 6, 7, 8]));
    console.log("reversible_deque_test.ts: Finished [merge_front]");
}
if (config.test) {
    console.log("reversible_deque_test.ts: Starting [node_location]");
    let a = new reversible_deque.ReversibleDeque();
    a.pushRight(1);
    a.pushRight(2);
    a.pushRight(3);
    a.pushRight(4);
    a.reverse();
    let b = new reversible_deque.ReversibleDeque();
    b.pushRight(5);
    b.pushRight(6);
    let locationB = b.pushRight(7);
    let locationA = b.pushRight(8);
    b.reverse();
    a.appendLeft(b);
    console.assert(utils.arraysEqual(b.toArray(), []));
    a.reverse();
    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(a.toArray());
    // console.log(locationA);
    // console.log(locationB);
    console.assert(a.left(locationA).value == 7);
    console.assert(locationB.value == 7);
    console.log("reversible_deque_test.ts: Finished [node_location]");
}
//# sourceMappingURL=reversible_deque_test.js.map