import * as config from "./config.js";
import * as model from "./model.js";
import * as layout from "./layout.js";
import * as scc from "./scc.js";
import * as utils from "./utils.js";
if (config.test) {
    console.log("layout_test.ts: Starting [sccs]");
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
    layout.recalculateLayerAssignment();
    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);
    console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 3, 6, 7, 8, 9, 10]));
    console.log("layout_test.ts: Finished [sccs]");
}
if (config.test) {
    console.log("layout_test.ts: Starting [nuclear]");
    model.reset();
    for (let i = 1; i <= 14; i += 1) {
        model.fakeNewPerson("name" + i);
    }
    // Parents: 1 2
    // Children: 3 4
    model.fakeNewFamily();
    model.fakeAttachParent(1, 1);
    model.fakeAttachParent(1, 2);
    model.fakeAttachChild(1, 3);
    model.fakeAttachChild(1, 4);
    // Parents: 5 6
    // Children 7
    model.fakeNewFamily();
    model.fakeAttachParent(2, 5);
    model.fakeAttachParent(2, 6);
    model.fakeAttachChild(2, 7);
    // Parents: 3 7
    // Children: 8
    model.fakeNewFamily();
    model.fakeAttachParent(3, 3);
    model.fakeAttachParent(3, 7);
    model.fakeAttachChild(3, 8);
    // Parents: 7 11
    // Children 12
    model.fakeNewFamily();
    model.fakeAttachParent(4, 7);
    model.fakeAttachParent(4, 11);
    model.fakeAttachChild(4, 12);
    // Parents: 8 12
    // Children 13
    model.fakeNewFamily();
    model.fakeAttachParent(5, 8);
    model.fakeAttachParent(5, 12);
    model.fakeAttachChild(5, 13);
    // Parents: 10
    // Children 14
    model.fakeNewFamily();
    model.fakeAttachParent(6, 10);
    model.fakeAttachChild(6, 14);
    // Parents: 13 14
    model.fakeNewFamily();
    model.fakeAttachParent(7, 13);
    model.fakeAttachParent(7, 14);
    layout.recalculateLayerAssignment();
    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);
    // let sccs : Record<scc.SccId,Array<model.PersonId>> = {};
    // for(const personId in model.people) {
    //     if(sccs[scc.personsSccId[personId]] == undefined) {
    //         sccs[scc.personsSccId[personId]] = [];
    //     }
    //     sccs[scc.personsSccId[personId]].push(+personId);    
    // }
    // console.log("sccs:");
    // console.log(sccs);
    console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 5, 6, 9, 10]));
    console.assert(utils.arraysEqual(layout.layers[1], [3, 4, 7, 11]));
    console.assert(utils.arraysEqual(layout.layers[2], [8, 12]));
    console.assert(utils.arraysEqual(layout.layers[3], [13, 14]));
    console.log("layout_test.ts: Finished [nuclear]");
}
if (config.test) {
    console.log("layout_test.ts: Starting [nuclear constraints]");
    model.reset();
    for (let i = 1; i <= 14; i += 1) {
        model.fakeNewPerson("name" + i);
    }
    // Parents: 1 2
    // Children: 3 4
    model.fakeNewFamily();
    model.fakeAttachParent(1, 1);
    model.fakeAttachParent(1, 2);
    model.fakeAttachChild(1, 3);
    model.fakeAttachChild(1, 4);
    // Parents: 5 6
    // Children 7
    model.fakeNewFamily();
    model.fakeAttachParent(2, 5);
    model.fakeAttachParent(2, 6);
    model.fakeAttachChild(2, 7);
    // Parents: 3 7
    // Children: 8
    model.fakeNewFamily();
    model.fakeAttachParent(3, 3);
    model.fakeAttachParent(3, 7);
    model.fakeAttachChild(3, 8);
    // Parents: 7 11
    // Children 12
    model.fakeNewFamily();
    model.fakeAttachParent(4, 7);
    model.fakeAttachParent(4, 11);
    model.fakeAttachChild(4, 12);
    // Parents: 8 12
    // Children 13
    model.fakeNewFamily();
    model.fakeAttachParent(5, 8);
    model.fakeAttachParent(5, 12);
    model.fakeAttachChild(5, 13);
    // Parents: 10
    // Children 14
    model.fakeNewFamily();
    model.fakeAttachParent(6, 10);
    model.fakeAttachChild(6, 14);
    // Parents: 13 14
    model.fakeNewFamily();
    model.fakeAttachParent(7, 13);
    model.fakeAttachParent(7, 14);
    layout.recalculateLayerAssignment();
    layout.recalculateConstraints();
    layout.recalculate();
    // This output might be useful when debugging this test.
    console.log("layers:");
    console.log(layout.layers);
    let sccs = {};
    for (const personId in model.people) {
        if (sccs[scc.personsSccId[personId]] == undefined) {
            sccs[scc.personsSccId[personId]] = [];
        }
        sccs[scc.personsSccId[personId]].push(+personId);
    }
    console.log("sccs:");
    console.log(sccs);
    console.log("constraints:");
    console.log(utils.deepArrayToString(layout.layerConstraintsToArray(0)));
    console.log(utils.deepArrayToString(layout.layerConstraintsToArray(1)));
    console.log(utils.deepArrayToString(layout.layerConstraintsToArray(2)));
    console.log(utils.deepArrayToString(layout.layerConstraintsToArray(3)));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(0), [[[1, 2], [5, 6]], [[9]], [[10]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(1), [[[3], [7, 11]], [[4]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(2), [[[8], [12]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(3), [[[13]], [[14]]]));
    console.log("layout_test.ts: Finished [nuclear constraints]");
}
//# sourceMappingURL=layout_test.js.map