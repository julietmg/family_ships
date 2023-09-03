
// -------------------------- Fetching the data and packing into nice structures --------------------------

// TODO: Rework all this interfaces.
interface Person {
    id: number
    childOfFamily: Array<{
        id: {
            familyId: number
            childId: number
        }
    }>
    parentOfFamily: Array<{
        id: {
            familyId: number
            parentId: number
        }
    }>
    formattedNames: string
}

interface Family {
    id: number
    children: Array<{
        id: {
            familyId: number
            childId: number
        }
    }>
    parents: Array<{
        id: {
            familyId: number
            parentId: number
        }
    }>
}

export let families: Record<number, Family> = {};
export let people: Record<number, Person> = {};

export async function reload() {
    const peopleData: Iterable<Person> = await fetch("/model/debug/people").then(data => data.json());
    const familiesData: Iterable<Family> = await fetch("/model/debug/families").then(data => data.json());
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
export function familyChildren(familyId: number) {
    return families[familyId].children.map((x) => x.id.childId);
}

export function familyParents(familyId: number) {
    return families[familyId].parents.map((x) => x.id.parentId);
}

// TODO: Sort everything by age.
export function parents(personId: number) {
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

export function siblings(personId: number) {
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

export function partners(personId: number) {
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

export function children(personId: number) {
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

export function parentOfFamilies(personId: number) {
    let result = [];
    const person = people[personId];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        result.push(familyId);
    }
    result.sort((a, b) => a - b);
    return result;
}

export function childOfFamilies(personId: number) {
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
export function parentOfSingleFamilies(personId: number) {
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

export function isSingleParent(personId: number) {
    return parentOfSingleFamilies(personId).length > 0;
}