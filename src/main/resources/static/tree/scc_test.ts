import * as config from "./config.js";
import * as model from "./model.js";
import * as scc from "./scc.js";

import * as utils from "./utils.js";

if(config.test) {
    model.reset();
    
    for(let i = 1; i <= 10; i += 1){
        await model.newPerson("name" + i);
    }

    async function addParentChildEdge(a : model.PersonId, b : model.PersonId) {
        let familyId = await model.newFamily();
        await model.attachParent(familyId, a);
        await model.attachChild(familyId, b);
    }
    
    await addParentChildEdge(1,2);
    await addParentChildEdge(2,3);
    await addParentChildEdge(3,1);

    await addParentChildEdge(3,4);

    await addParentChildEdge(4,5);
    
    await addParentChildEdge(5,6);
    await addParentChildEdge(6,7);
    await addParentChildEdge(7,8);
    await addParentChildEdge(8,9);
    await addParentChildEdge(9,6);
    await addParentChildEdge(7,9);
    await addParentChildEdge(9,5);

    model.reload();
    scc.recalculate();

    let sccs : Record<scc.SccId,Array<model.PersonId>> = {};
    for(const personId in model.people) {
        if(sccs[scc.personsSccId[personId]] == undefined) {
            sccs[scc.personsSccId[personId]] = [];
        }
        sccs[scc.personsSccId[personId]].push(+personId);    
    }

    // This output might be useful when debugging this test.
    // console.log("sccs:");
    // console.log(sccs);
    // console.log("personsSccId:");
    // console.log(scc.personsSccId);
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[1]], [1,2,3]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[2]], [1,2,3]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[4]], [4]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[5]], [5,6,7,8,9]));
    console.assert(utils.arraysEqual(sccs[scc.personsSccId[6]], [5,6,7,8,9]));
}