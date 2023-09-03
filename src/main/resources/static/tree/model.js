// -------------------------- Fetching the data and packing into nice structures --------------------------
export let families = {};
export let people = {};
export async function reload() {
    const peopleData = await fetch("/model/debug/people").then(data => data.json());
    const familiesData = await fetch("/model/debug/families").then(data => data.json());
    families = {};
    people = {};
    for (const family of familiesData) {
        families[family.id] = family;
    }
    for (const person of peopleData) {
        people[person.id] = person;
    }
    // TODO: Erase debug in the production version
    console.log("Reloaded model data.");
    console.log(families);
    console.log(people);
}
// -------------------------- Utility functions to access the data prepared in the section above --------------------------
export function familyChildren(familyId) {
    return families[familyId].children.map((x) => x.id.childId);
}
export function familyParents(familyId) {
    return families[familyId].parents.map((x) => x.id.parentId);
}
// TODO: Sort everything by age.
export function parents(personId) {
    let result = [];
    const person = people[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
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
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
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
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
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
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
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
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        result.push(familyId);
    }
    result.sort((a, b) => a - b);
    return result;
}
export function childOfFamilies(personId) {
    let result = [];
    const person = people[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
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