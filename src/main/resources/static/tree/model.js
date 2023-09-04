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
    return await fetch("/model/detach_parent", {
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
// -------------------------- Utility functions to access the data prepared in the section above --------------------------
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
// --------------------------  Utility functions that are handy when creating constraints --------------------------
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
//# sourceMappingURL=model.js.map