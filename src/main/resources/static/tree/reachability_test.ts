import * as config from "./config.js";
import * as model from "./model.js";
import * as scc from "./scc.js";
import * as reachability from "./reachability.js";

import * as utils from "./utils.js";

if(config.test) {
    model.reset();
    
    for(let i = 1; i <= 10; i += 1){
        model.fakeNewPerson("name" + i);
    }

    async function addParentChildEdge(a : model.PersonId, b : model.PersonId) {
        let familyId = model.fakeNewFamily();
        model.fakeAttachParent(familyId, a);
        model.fakeAttachChild(familyId, b);
    }
    
    addParentChildEdge(1,2);
    addParentChildEdge(2,3);
    addParentChildEdge(3,1);

    addParentChildEdge(3,4);

    addParentChildEdge(4,5);
    
    addParentChildEdge(5,6);
    addParentChildEdge(6,7);
    addParentChildEdge(7,8);
    addParentChildEdge(8,9);
    addParentChildEdge(9,6);
    addParentChildEdge(7,9);
    addParentChildEdge(9,5);

    scc.recalculate();

    // This output might be useful when debugging this test.
    // console.log("sccs:");
    // console.log(sccs);
    // console.log("personsSccId:");
    // console.log(scc.personsSccId);
    console.assert(reachability.isAnyReachableFrom([1,2],new Set([9,4])));
    console.assert(!reachability.isAnyReachableFrom([9,4],new Set([1,2])));
    console.assert(reachability.isAnyReachableFrom([9,3],new Set([5, 10])));
    console.assert(!reachability.isAnyReachableFrom([10],new Set([1])));

}