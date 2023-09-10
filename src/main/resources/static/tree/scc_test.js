import * as config from "./config.js";
import * as model from "./model.js";
import * as scc from "./scc.js";
if (config.test) {
    model.reset();
    for (let i = 1; i <= 10; i += 1) {
        await model.newPerson("name" + i);
    }
    async function addParentChildEdge(a, b) {
        let familyId = await model.newFamily();
        await model.attachParent(familyId, a);
        await model.attachChild(familyId, b);
    }
    // First strongly connected component, consisting of one person
    await addParentChildEdge(0, 1);
    // Second strongly connected component, consisting of three people
    await addParentChildEdge(1, 2);
    await addParentChildEdge(2, 3);
    await addParentChildEdge(3, 1);
    // Third strongly connected component, consisting of one people
    await addParentChildEdge(3, 4);
    // Third strongly connected component, consisting of one people
    await addParentChildEdge(4, 5);
    // Fourht strongly connected component, consisting of all the other poeple
    await addParentChildEdge(5, 6);
    await addParentChildEdge(6, 7);
    await addParentChildEdge(7, 8);
    await addParentChildEdge(8, 9);
    await addParentChildEdge(9, 6);
    await addParentChildEdge(7, 9);
    await addParentChildEdge(9, 5);
    model.reload();
    let sccs = {};
    for (const personId in model.people) {
        if (sccs[scc.personsSccId[personId]] == undefined) {
            sccs[scc.personsSccId[personId]] = [];
        }
        sccs[scc.personsSccId[personId]].push(+personId);
    }
    function arraysEqual(a, b) {
        if (a.length != b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i += 1) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }
    // This output might be useful when debugging this test.
    // console.log("sccs:");
    // console.log(sccs);
    // console.log("personsSccId:");
    // console.log(scc.personsSccId);
    console.assert(arraysEqual(sccs[scc.personsSccId[0]], [0]));
    console.assert(arraysEqual(sccs[scc.personsSccId[1]], [1, 2, 3]));
    console.assert(arraysEqual(sccs[scc.personsSccId[2]], [1, 2, 3]));
    console.assert(arraysEqual(sccs[scc.personsSccId[4]], [4]));
    console.assert(arraysEqual(sccs[scc.personsSccId[5]], [5]));
    console.assert(arraysEqual(sccs[scc.personsSccId[6]], [6, 7, 8, 9]));
}
//# sourceMappingURL=scc_test.js.map