import * as config from "./config.js";

// -------------------------- Fetching the data and packing into nice structures --------------------------

export type PersonId = number
export type FamilyId = number

export interface Person {
    id: PersonId
    childOfFamiliesIds: Array<FamilyId>
    parentOfFamilyIds: Array<FamilyId>
    names: Array<string>
}

export interface Family {
    id: FamilyId
    childrenIds: Array<PersonId>
    parentIds: Array<PersonId>
}

export let families: Record<FamilyId, Family> = {};
export let people: Record<PersonId, Person> = {};

export function reset() {
    families = {};
    people = {};
}

// TODO: It would be nice if the server would be able to stream updates, so that people can
// work on the same tree and see their changes.
export async function reload() {
    if (!config.test) {
        reset();
        let peopleData: Iterable<Person> = await fetch("/model/people").then(data => data.json());
        let familiesData: Iterable<Family> = await fetch("/model/families").then(data => data.json());
        for (const family of familiesData) {
            families[family.id] = family;
        }
        for (const person of peopleData) {
            people[person.id] = person;
        }
    }

    if(config.debug) {
        console.log("reload was called");
        console.log("Reloaded families:");
        console.log(families);
        console.log("Reloaded people:");
        console.log(people);
    }
}

// Note that this must be followed by a call to `reload()` in production and call to `recalculate()` in test mode.
export async function newPerson(spaceSeparatedNames: string): Promise<PersonId> {
    if (config.test) {
        const maxPersonId = Object.keys(people).map((a) => +a).reduce((a, b) => Math.max(a, b),0);
        const newPersonId = maxPersonId + 1;
        people[newPersonId] = {
            id: newPersonId, names: spaceSeparatedNames.split(' '),
            childOfFamiliesIds: [], parentOfFamilyIds: []
        };
        return newPersonId;
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

export async function deletePerson(personId: PersonId): Promise<boolean> {
    if (config.test) {
        if(people[personId] == undefined) {
            return false;
        }
        delete people[personId];
        return true;
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

export async function newFamily(): Promise<FamilyId> {
    if (config.test) {
        const maxFamilyId = Object.keys(families).map((a) => +a).reduce((a, b) => Math.max(a, b), 0);
        const newFamilyId = maxFamilyId + 1;
        families[newFamilyId] = {
            id: newFamilyId, childrenIds: [], parentIds: []
        };
        return newFamilyId;
    }
    return await fetch("/model/new_family", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({})
    }).then(data => data.json());
}

export async function deleteFamily(familyId: FamilyId): Promise<boolean> {
    if (config.test) {
        if(families[familyId] == undefined) {
            return false;
        }
        delete families[familyId];
        return true;
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

export async function attachChild(familyId: FamilyId, childId: PersonId): Promise<boolean> {
    if (config.test) {
        if(families[familyId] == undefined || people[childId] == undefined) {
            return false;
        }
        families[familyId].childrenIds.push(childId);
        people[childId].childOfFamiliesIds.push(familyId);
        return true;
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

export async function detachChild(familyId: FamilyId, childId: PersonId): Promise<boolean> {
    if (config.test) {
        if(families[familyId] == undefined || people[childId] == undefined) {
            return false;
        }
        families[familyId].childrenIds = families[familyId].childrenIds.filter((id) => id != childId);
        people[childId].childOfFamiliesIds = people[familyId].childOfFamiliesIds.filter((id) => id != familyId);
        return true;
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

export async function attachParent(familyId: FamilyId, parentId: PersonId): Promise<boolean> {
    if (config.test) {
        if(families[familyId] == undefined || people[parentId] == undefined) {
            return false;
        }
        families[familyId].parentIds.push(parentId);
        people[parentId].parentOfFamilyIds.push(familyId);
        return true;
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

export async function detachParent(familyId: FamilyId, parentId: PersonId): Promise<boolean> {
    if (config.test) {
        if(families[familyId] == undefined || people[parentId] == undefined) {
            return false;
        }
        families[familyId].childrenIds = families[familyId].parentIds.filter((id) => id != parentId);
        people[parentId].childOfFamiliesIds = people[familyId].parentOfFamilyIds.filter((id) => id != familyId);
        return true;
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

export async function setNames(personId: PersonId, spaceSeparatedNames: string): Promise<boolean> {
    if(config.test) {
        if(people[personId] == undefined) {
            return false;
        }
        people[personId].names = spaceSeparatedNames.split(' ');
        return true;
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
export function familyChildren(familyId: FamilyId): Array<PersonId> {
    return families[familyId].childrenIds;
}

export function familyParents(familyId: FamilyId): Array<PersonId> {
    return families[familyId].parentIds;
}

// TODO: Sort everything by age.
export function parents(personId: PersonId): Array<PersonId> {
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

export function siblings(personId: PersonId): Array<PersonId> {
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

export function partners(personId: PersonId): Array<PersonId> {
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

export function children(personId: PersonId): Array<PersonId> {
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

export function parentOfFamilies(personId: PersonId) {
    let result = [];
    const person = people[personId];
    for (const familyId of person.parentOfFamilyIds) {
        result.push(familyId);
    }
    result.sort((a, b) => a - b);
    return result;
}

export function childOfFamilies(personId: PersonId) {
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
export function parentOfSingleFamilies(personId: PersonId) {
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

export function isSingleParent(personId: PersonId) {
    return parentOfSingleFamilies(personId).length > 0;
}

function partnerClusterRec(personId: number, result: Set<number>) {
    if (result.has(personId)) {
        return;
    }
    result.add(personId);
    for (const partnerId of partners(personId)) {
        partnerClusterRec(partnerId, result);
    }
}

// Gives all the elements that are reachable from personId in the partner graph
export function partnerCluster(personId: number): Set<number> {
    let result: Set<number> = new Set();
    partnerClusterRec(personId, result);
    return result;
}