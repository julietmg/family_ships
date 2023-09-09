import * as tools from "./tools.js";
export let families = {};
export let people = {};
export async function reload() {
    const peopleData = await fetch("/model/people").then(data => data.json());
    const familiesData = await fetch("/model/families").then(data => data.json());
    families = {};
    people = {};
    for (const family of familiesData) {
        families[family.id] = family;
    }
    for (const person of peopleData) {
        people[person.id] = person;
    }
    // TODO: Erase debug in the production version
    tools.log("Reloaded model data.");
    tools.log(families);
    tools.log(people);
    recalculateStronglyConnectedComponents();
}
export async function newPerson(spaceSeparatedNames) {
    return await fetch("/model/new_person", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'spaceSeparatedNames': spaceSeparatedNames,
        })
    }).then(data => data.json());
}
export async function deletePerson(personId) {
    return await fetch("/model/delete_person", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'personId': "" + personId,
        })
    }).then(data => data.json());
}
export async function newFamily() {
    return await fetch("/model/new_family", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({})
    }).then(data => data.json());
}
export async function deleteFamily(familyId) {
    return await fetch("/model/delete_family", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + familyId,
        })
    }).then(data => data.json());
}
export async function attachChild(familyId, childId) {
    return await fetch("/model/attach_child", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + familyId,
            'childId': "" + childId,
        })
    }).then(data => data.json());
}
export async function detachChild(familyId, childId) {
    return await fetch("/model/detach_child", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + familyId,
            'childId': "" + childId,
        })
    }).then(data => data.json());
}
export async function attachParent(familyId, parentId) {
    return await fetch("/model/attach_parent", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + familyId,
            'parentId': "" + parentId,
        })
    }).then(data => data.json());
}
export async function detachParent(familyId, parentId) {
    return await fetch("/model/detach_parent", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + familyId,
            'parentId': "" + parentId,
        })
    }).then(data => data.json());
}
export async function setNames(personId, spaceSeparatedNames) {
    return await fetch("/model/set_names", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'personId': "" + personId,
            'spaceSeparatedNames': "" + spaceSeparatedNames,
        })
    }).then(data => data.json());
}
// -------------------------- Utility functions to conveniently access the data prepared in the section above --------------------------
export function familyChildren(familyId) {
    return families[familyId].childrenIds;
}
export function familyParents(familyId) {
    return families[familyId].parentIds;
}
// TODO: Sort everything by age.
export function parents(personId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.childOfFamiliesIds) {
        for (const parentId of familyParents(familyId)) {
            result.push(parentId);
        }
    }
    // TODO: Sort by sex and age.
    result.sort((a, b) => a - b);
    return result;
}
export function siblings(personId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.childOfFamiliesIds) {
        for (const siblingId of familyChildren(familyId)) {
            if (siblingId != personId) {
                result.push(siblingId);
            }
        }
    }
    // TODO: Sort by age.
    result.sort((a, b) => a - b);
    return result;
}
export function partners(personId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.parentOfFamilyIds) {
        for (const parentId of familyParents(familyId)) {
            if (parentId != personId) {
                result.push(parentId);
            }
        }
    }
    // TODO: Sort by sex and age.
    result.sort((a, b) => a - b);
    return result;
}
export function children(personId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.parentOfFamilyIds) {
        for (const childId of familyChildren(familyId)) {
            result.push(childId);
        }
    }
    // TODO: Sort by age.
    result.sort((a, b) => a - b);
    return result;
}
export function parentOfFamilies(personId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.parentOfFamilyIds) {
        result.push(familyId);
    }
    result.sort((a, b) => a - b);
    return result;
}
export function childOfFamilies(personId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.childOfFamiliesIds) {
        result.push(familyId);
    }
    result.sort((a, b) => a - b);
    return result;
}
// Singleton families are the ones this person is the sole
// parent of.
export function parentOfSingleFamilies(personId) {
    let result = [];
    for (const familyId of parentOfFamilies(personId)) {
        let parents = familyParents(familyId);
        if (parents.length == 1 && parents[0] == personId) {
            result.push(familyId);
        }
    }
    result.sort((a, b) => a - b);
    return result;
}
export function isSingleParent(personId) {
    return parentOfSingleFamilies(personId).length > 0;
}
// -------------------------- Reachability in the parent-child graph --------------------------
// TODO: This might be possible to speed up.
// * http://www.vldb.org/pvldb/vol7/p1191-wei.pdf
// * https://stackoverflow.com/questions/3755439/efficient-database-query-for-ancestors-on-an-acyclic-directed-graph
// * https://www.slideshare.net/slidarko/graph-windycitydb2010 (a.k.a. gremlins)
// * https://www3.cs.stonybrook.edu/~bender/pub/JALG05-daglca.pdf - but LCA might be too specific
function reachableRec(startId, endIds, visited) {
    if (visited.has(startId)) {
        return true;
    }
    visited.add(startId);
    for (const childId of children(startId)) {
        if (endIds.has(childId) || reachableRec(childId, endIds, visited)) {
            return true;
        }
    }
    return false;
}
// Calculates whether any of the endIds are reachable from any of the startIds in the parent-child relationship graph.
export function isAnyReachableFrom(startIds, endIds) {
    let visited = new Set();
    for (const personId of startIds) {
        if (reachableRec(personId, endIds, visited)) {
            return true;
        }
    }
    return false;
}
// -------------------------- Calculating strongly connected components of the parent-child graph --------------------------
export let personsScc = {};
function recalculateStronglyConnectedComponents() {
    // Reset the existing personsScc.
    personsScc = {};
    // This uses Tarjan's algorithm
    let sccs = [];
    let personsSccNum = {};
    let personsSccLow = {};
    let sccVisited = new Set();
    let sccProcessed = new Set();
    let sccCounter = 0;
    let sccStack = [];
    function sccRec(personId) {
        personsSccNum[personId] = sccCounter;
        personsSccLow[personId] = sccCounter;
        sccCounter += 1;
        sccVisited.add(personId);
        sccStack.push(personId);
        for (const childId of children(personId)) {
            if (!sccVisited.has(childId)) {
                sccRec(childId);
                personsSccLow[personId] = Math.min(personsSccLow[personId], personsSccLow[childId]);
            }
            else if (!sccProcessed.has(childId)) {
                personsSccLow[personId] = Math.min(personsSccLow[personId], personsSccNum[childId]);
            }
        }
        sccProcessed.add(personId);
        if (personsSccLow[personId] == personsSccNum[personId]) {
            let scc = [];
            let current = sccStack.pop();
            while (current != personId) {
                scc.push(current);
                current = sccStack.pop();
            }
            scc.push(current);
            sccs.push(scc);
        }
    }
    for (const personId in people) {
        if (sccVisited.has(+personId)) {
            continue;
        }
        sccRec(+personId);
    }
    for (let i = 0; i < sccs.length; i += 1) {
        const scc = sccs[i];
        for (const personId of scc) {
            personsScc[personId] = i;
        }
    }
}
// -------------------------- Partner cluster calculation --------------------------
function partnerClusterRec(personId, result) {
    if (result.has(personId)) {
        return;
    }
    result.add(personId);
    for (const partnerId of partners(personId)) {
        partnerClusterRec(partnerId, result);
    }
}
// Gives all the elements that are reachable from personId in the partner graph
export function partnerCluster(personId) {
    let result = new Set();
    partnerClusterRec(personId, result);
    return result;
}
//# sourceMappingURL=model.js.map