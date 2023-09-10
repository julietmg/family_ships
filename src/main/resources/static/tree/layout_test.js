import * as config from "./config.js";
import * as model from "./model.js";
import * as layout from "./layout.js";
import * as utils from "./utils.js";
if (config.test) {
    console.log("layout_test.ts: Starting");
    model.reset();
    for (let i = 1; i <= 10; i += 1) {
        model.fakeNewPerson("name" + i);
    }
    async function addParentChildEdge(a, b) {
        let familyId = model.fakeNewFamily();
        model.fakeAttachParent(familyId, a);
        model.fakeAttachChild(familyId, b);
    }
    addParentChildEdge(1, 2);
    addParentChildEdge(2, 3);
    addParentChildEdge(3, 1);
    addParentChildEdge(3, 4);
    addParentChildEdge(4, 5);
    addParentChildEdge(5, 6);
    addParentChildEdge(6, 7);
    addParentChildEdge(7, 8);
    addParentChildEdge(8, 9);
    addParentChildEdge(9, 6);
    addParentChildEdge(7, 9);
    addParentChildEdge(9, 5);
    layout.recalculate();
    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);
    console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 3, 6, 7, 8, 9, 10]));
    console.log("layout_test.ts: Passed");
}
//# sourceMappingURL=layout_test.js.map