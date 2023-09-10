import * as config from "./config.js";
import * as deque from "./deque.js";

import * as utils from "./utils.js";

if (config.test) {
    console.log("deque_test.ts: Starting [simple]");
    let d : deque.Deque<number> = new deque.Deque();
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
    console.log("deque_test.ts: Finished [simple]");
}

if (config.test) {
    console.log("deque_test.ts: Starting [merge_back]");
    let a : deque.Deque<number> = new deque.Deque();
    a.pushBack(1);
    a.pushBack(2);
    a.pushBack(3);
    a.pushBack(4);

    let b : deque.Deque<number> = new deque.Deque();
    b.pushBack(5);
    b.pushBack(6);
    b.pushBack(7);
    b.pushBack(8);

    a.appendBack(b);

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
    
    console.assert(utils.arraysEqual(a.toArray(), [1,2,3,4,5,6,7,8]));

    console.log("deque_test.ts: Finished [merge_back]");
}

if (config.test) {
    console.log("deque_test.ts: Starting [merge_front]");
    let a : deque.Deque<number> = new deque.Deque();
    a.pushBack(1);
    a.pushBack(2);
    a.pushBack(3);
    a.pushBack(4);

    let b : deque.Deque<number> = new deque.Deque();
    b.pushBack(5);
    b.pushBack(6);
    b.pushBack(7);
    b.pushBack(8);

    a.appendFront(b);

    console.assert(utils.arraysEqual(b.toArray(), []));

    // This output might be useful when debugging this test.
    // console.log(a);
    // console.log(b);
    // console.log(a.toArray());
    // console.log(b.toArray());

    console.assert(utils.arraysEqual(a.toArray(), [5,6,7,8,1,2,3,4]));

    console.log("deque_test.ts: Finished [merge_front]");
}