import * as config from "./config.js";
export let families = {};
export let people = {};
export function reset() {
    families = {};
    people = {};
}
// TODO: It would be nice if the server would be able to stream updates, so that people can
// work on the same tree and see their changes.
export async function reload() {
    if (!config.test) {
        reset();
        let peopleData = await fetch("/model/people").then(data => data.json());
        let familiesData = await fetch("/model/families").then(data => data.json());
        for (const family of familiesData) {
            families[family.id] = family;
        }
        for (const person of peopleData) {
            people[person.id] = person;
        }
    }
    // if(config.debug) {
    console.log("Reloaded families:");
    console.log(families);
    console.log("Reloaded people:");
    console.log(people);
    // }
}
// Note that this must be followed by a call to `reload()` in production and call to `recalculate()` in test mode.
export async function newPerson(spaceSeparatedNames) {
    if (config.debug) {
        console.log("newPerson " + spaceSeparatedNames);
    }
    if (config.test) {
        return fakeNewPerson(spaceSeparatedNames);
    }
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
    if (config.debug) {
        console.log("deletePerson " + personId);
    }
    if (config.test) {
        return fakeDeletePerson(personId);
    }
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
    if (config.debug) {
        console.log("newFamily");
    }
    if (config.test) {
        return fakeNewFamily();
    }
    return await fetch("/model/new_family", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({})
    }).then(data => data.json());
}
export async function deleteFamily(familyId) {
    if (config.debug) {
        console.log("deleteFamily " + familyId);
    }
    if (config.test) {
        fakeDeleteFamily(familyId);
    }
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
    if (config.debug) {
        console.log("attachChild " + familyId + " " + childId);
    }
    if (config.test) {
        return fakeAttachChild(familyId, childId);
    }
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
    if (config.debug) {
        console.log("detachChild " + familyId + " " + childId);
    }
    if (config.test) {
        return fakeDetachChild(familyId, childId);
    }
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
    if (config.debug) {
        console.log("attachParent " + familyId + " " + parentId);
    }
    if (config.test) {
        return fakeAttachParent(familyId, parentId);
    }
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
    if (config.debug) {
        console.log("detachParent " + familyId + " " + parentId);
    }
    if (config.test) {
        return fakeDetachParent(familyId, parentId);
    }
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
    if (config.debug) {
        console.log("setNames " + personId + " " + spaceSeparatedNames);
    }
    if (config.test) {
        return fakeSetNames(personId, spaceSeparatedNames);
    }
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
// -------------------------- Faking the interactions with the backend for the purpose of tests --------------------------
export function fakeNewPerson(spaceSeparatedNames) {
    const maxPersonId = Object.keys(people).map((a) => +a).reduce((a, b) => Math.max(a, b), 0);
    const newPersonId = maxPersonId + 1;
    people[newPersonId] = {
        id: newPersonId, names: spaceSeparatedNames.split(' '),
        childOfFamiliesIds: [], parentOfFamilyIds: []
    };
    return newPersonId;
}
export function fakeDeletePerson(personId) {
    if (people[personId] == undefined) {
        return false;
    }
    for (const familyId of childOfFamilies(personId)) {
        fakeDetachChild(familyId, personId);
    }
    for (const familyId of parentOfFamilies(personId)) {
        fakeDetachParent(familyId, personId);
    }
    delete people[personId];
    return true;
}
export function fakeNewFamily() {
    const maxFamilyId = Object.keys(families).map((a) => +a).reduce((a, b) => Math.max(a, b), 0);
    const newFamilyId = maxFamilyId + 1;
    families[newFamilyId] = {
        id: newFamilyId, childrenIds: [], parentIds: []
    };
    return newFamilyId;
}
export function fakeDeleteFamily(familyId) {
    if (families[familyId] == undefined) {
        return false;
    }
    for (const parentId of familyParents(familyId)) {
        fakeDetachParent(familyId, parentId);
    }
    for (const childId of familyChildren(familyId)) {
        fakeDetachChild(familyId, childId);
    }
    delete families[familyId];
    return true;
}
export function fakeAttachChild(familyId, childId) {
    if (families[familyId] == undefined || people[childId] == undefined) {
        return false;
    }
    families[familyId].childrenIds.push(childId);
    people[childId].childOfFamiliesIds.push(familyId);
    return true;
}
export function fakeDetachChild(familyId, childId) {
    if (families[familyId] == undefined || people[childId] == undefined) {
        return false;
    }
    families[familyId].childrenIds = families[familyId].childrenIds.filter((id) => id != childId);
    people[childId].childOfFamiliesIds = people[childId].childOfFamiliesIds.filter((id) => id != familyId);
    return true;
}
export function fakeAttachParent(familyId, parentId) {
    if (families[familyId] == undefined || people[parentId] == undefined) {
        return false;
    }
    families[familyId].parentIds.push(parentId);
    people[parentId].parentOfFamilyIds.push(familyId);
    return true;
}
export function fakeDetachParent(familyId, parentId) {
    if (families[familyId] == undefined || people[parentId] == undefined) {
        return false;
    }
    families[familyId].parentIds = families[familyId].parentIds.filter((id) => id != parentId);
    people[parentId].parentOfFamilyIds = people[parentId].parentOfFamilyIds.filter((id) => id != familyId);
    return true;
}
export function fakeSetNames(personId, spaceSeparatedNames) {
    if (people[personId] == undefined) {
        return false;
    }
    people[personId].names = spaceSeparatedNames.split(' ');
    return true;
}
//# sourceMappingURL=model.js.map