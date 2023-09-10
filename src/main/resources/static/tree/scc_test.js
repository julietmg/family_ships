import * as config from "./config.js";
import * as model from "./model.js";
import * as scc from "./scc.js";
import * as utils from "./utils.js";
if (config.test) {
    console.log("scc_test.ts: Starting");
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
    scc.recalculate();
    let sccs = {};
    for (const personId in model.people) {
        if (sccs[scc.personsSccId[personId]] == undefined) {
            sccs[scc.personsSccId[personId]] = [];
        }
        sccs[scc.personsSccId[personId]].push(+personId);
    }
    // This output might be useful when debugging this test.
    // console.log("sccs:");
    // console.log(sccs);
    // console.log("personsSccId:");
    // console.log(scc.personsSccId);
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[1]], [1, 2, 3]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[2]], [1, 2, 3]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[4]], [4]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[5]], [5, 6, 7, 8, 9]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[6]], [5, 6, 7, 8, 9]));
    console.log("scc_test.ts: Passed");
}
//# sourceMappingURL=scc_test.js.map