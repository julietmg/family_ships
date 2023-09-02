import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// -------------------------- Fetching the data and packing into nice structures --------------------------
const peopleData = await fetch("/model/debug/people").then(data => data.json());
const familiesData = await fetch("/model/debug/families").then(data => data.json());

let families = {};
for (const family of familiesData) {
    families[family.id] = family;
}

let people = {};
for (const person of peopleData) {
    people[person.id] = person;
}

// TODO: Erase debug in the production version
console.log(families);
console.log(people);

// -------------------------- Utility functions to access the data prepared in the section above --------------------------
function familyChildren(familyId) {
    return families[familyId].children.map((x) => x.id.childId);
}

function familyParents(familyId) {
    return families[familyId].parents.map((x) => x.id.parentId);
}

// TODO: Sort everything by age.
function parents(personId) {
    let result = [];
    const person = people[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
        for (const parentId of familyParents(familyId)) {
            result.push(parentId);
        }
    }
    // TODO: Sort by sex and age.
    result.sort((a, b) => a.id - b.id);
    return result;
}

function siblings(personId) {
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
    result.sort((a, b) => a.id - b.id);
    return result;
}

function partners(personId) {
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
    result.sort((a, b) => a.id - b.id);
    return result;
}

function children(personId) {
    let result = [];
    const person = people[personId];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        for (const childId of familyChildren(familyId)) {
            result.push(childId);
        }
    }
    // TODO: Sort by age.
    result.sort((a, b) => a.id - b.id);
    return result;
}

function parentOfFamilies(personId) {
    let result = [];
    const person = people[personId];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        result.push(familyId);
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function childOfFamilies(personId) {
    let result = [];
    const person = people[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
        result.push(familyId);
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

// --------------------------  Utility functions that are handy when creating constraints --------------------------

// Singleton families are the ones this person is the sole
// parent of.
function parentOfSingleFamilies(personId) {
    let result = [];
    for (const familyId of parentOfFamilies(personId)) {
        let parents = familyParents(familyId);
        if (parents.length == 1 && parents[0] == personId) {
            result.push(familyId);
        }
    }
    return result;
}

function isSingleParent(personId) {
    return parentOfSingleFamilies(personId).length > 0;
}

// -------------------------- Laying out people with topological sort and estabilishing constraints --------------------------

// Algorithm lays out people with layers, starting with people with no parents.
let peopleWithUnassignedLayer = new Set();
for (const personId in people) {
    peopleWithUnassignedLayer.add(+personId);
}

let layers = [];
let personsLayer = {};
let constraints = {};
let filledConstraints = new Set();
let familyConstraints = {};

for (const personId in people) {
    constraints[personId] = {};
}

for (const familyId in families) {
    familyConstraints[familyId] = {};
}

// This functions in a union-find manner, compressing the paths as it goes.
// TODO: Make this true. So emberassing.
function leftmostOf(personId) {
    if (constraints[personId].leftmost == null ||
        constraints[personId].leftmost == personId) {
        return personId;
    }
    const result = leftmostOf(constraints[personId].leftmost);
    constraints[personId].leftmost = result;
    return result;
}

function leftmostOfSet(peopleIds) {
    let currentId = peopleIds[0];
    while (constraints[currentId].left != null &&
        peopleIds.includes(constraints[currentId].left)) {
        currentId = constraints[currentId].left;
    }
    return currentId;
}

function rightmostOfSet(peopleIds) {
    let currentId = peopleIds[0];
    while (constraints[currentId].right != null &&
        peopleIds.includes(constraints[currentId].right)) {
        currentId = constraints[currentId].right;
    }
    return currentId;
}

function areDirectNeighbours(peopleIds) {
    if (peopleIds.length <= 1) {
        return true;
    }
    let currentId = leftmostOfSet(peopleIds);
    let visited = 1;
    while (visited < peopleIds.length) {
        if (constraints[currentId].right != null &&
            peopleIds.includes(constraints[currentId].right)) {
            visited += 1;
            currentId = constraints[currentId].right;
        } else {
            return false;
        }
    }
    return true;
}

// Will attempt to add a left constraint between two people in the layout.
// Return `false` and doesn't modify anything (except maybe for leftmost) 
// if this constraint cannot be added.
function addSoftLeftConstraint(aId, bId) /* Bool */ {
    // We assume both aId and bId are on the same layer and that the parents have
    // already been laid out on the layers above.
    let aConstraints = constraints[aId];
    let bConstraints = constraints[bId];

    // Check if we don't have any existing constraints on any of the nodes.
    if (aConstraints.left != null || bConstraints.right != null ||
        (leftmostOf(aId) == leftmostOf(bId))) {
        // TODO: Erase debug in the production version
        console.log(bId + " to the left of " + aId + " is not possible because of their existing constraints");
        return false;
    }

    aConstraints.left = bId;
    bConstraints.right = aId;

    if (bConstraints.leftmost == null) {
        bConstraints.leftmost = bId;
    }
    aConstraints.leftmost = bConstraints.leftmost;

    // TODO: Erase debug in the production version
    console.log(bId + " to the left of " + aId + " is added");
    return true;
}

// Will attempt to add a left constraint between two people in the layout
// and then it will follow to the parents ensuring the parents also have
// the necessary contraints for the people to be drawn without crossing any
// lines.
// Return `false` and doesn't modify anything (except maybe for leftmost) 
// if this constraint cannot be added.
function addLeftConstraint(aId, bId) /* Bool */ {
    // We assume both aId and bId are on the same layer and that the parents have
    // already been laid out on the layers above.
    const layer = personsLayer[aId];

    let aConstraints = constraints[aId];
    let bConstraints = constraints[bId];

    // Check if we don't have any existing constraints on any of the nodes.
    if (aConstraints.left != null || bConstraints.right != null ||
        (leftmostOf(aId) == leftmostOf(bId))) {
        // TODO: Erase debug in the production version
        console.log(bId + " to the left of " + aId + " is not possible because of their existing constraints");
        return false;
    }

    const aFamilies = childOfFamilies(aId);
    const bFamilies = childOfFamilies(bId);

    if (aFamilies.length == 1 && bFamilies.length == 1) {
        const aFamilyId = aFamilies[0];
        const bFamilyId = bFamilies[0];

        let aParentIds = familyParents(aFamilyId);
        let bParentIds = familyParents(bFamilyId);

        if (aParentIds.length <= 0 || bParentIds.length <= 0) {
            return addSoftLeftConstraint(aId, bId);
        }

        if (!areDirectNeighbours(aParentIds)) {
            return false;
        }

        if (!areDirectNeighbours(bParentIds)) {
            return false;
        }

        // Follow the left ascendant for node a.
        let aLeftParentId = leftmostOfSet(aParentIds);

        // Follow the right ascendant for node b.
        let bRightParentId = rightmostOfSet(bParentIds);

        // They must be on the same layer
        if (personsLayer[aLeftParentId] != personsLayer[bRightParentId]) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because thier parents are in different layers");
            return false;
        }

        // We will need to draw the single parented children somewhere
        if (aParentIds.length > 1 && isSingleParent(aLeftParentId)) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because " + aLeftParentId + " is a single parent");
            return false;
        }

        // We will need to draw the single parented children somewhere
        if (bParentIds.length > 1 && isSingleParent(bRightParentId)) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because " + bRightParentId + " is a single parent");
            return false;
        }

        if (familyConstraints[aFamilyId].leftmostChild != null) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because of the " + aId + " left parent " + aLeftParentId);
            return false;
        }

        if (familyConstraints[bFamilyId].rightmostChild != null) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because of the " + bId + " right parent " + bRightParentId);
            return false;
        }

        // Check if we can add a constraint between the ascendants. If yes, then we can add a constraint here as well.
        if (!addLeftConstraint(aLeftParentId, bRightParentId)) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because the parents " + aLeftParentId + " and " + bRightParentId + " can't be joined.");
            return false;
        }
        familyConstraints[aFamilyId].leftmostChild = aId;
        familyConstraints[bFamilyId].rightmostChild = bId;
        constraints[aId].leftmostChildWithPartner = true;
    }

    return addSoftLeftConstraint(aId, bId);
}

while (peopleWithUnassignedLayer.size > 0) {
    let considered = new Set();

    // Get people that are not yet laid out, but for whose
    // all parents are laid out.
    for (const id of peopleWithUnassignedLayer) {
        let hasNonLaidOutParents = false;
        for (const parentId of parents(id)) {
            if (peopleWithUnassignedLayer.has(parentId)) {
                hasNonLaidOutParents = true;
                break;
            }
        }
        if (hasNonLaidOutParents) {
            continue;
        }
        considered.add(id);
    }

    if (considered.size == 0) {
        console.log("There is a cycle in the data from the backend!")
        break;
    }

    // Check whether their partners are also considered. 
    // Throw them away, if the partner still has parent constraints.
    for (const id of considered) {
        for (const partnerId of partners(id)) {
            if (peopleWithUnassignedLayer.has(partnerId) && !considered.has(partnerId)) {
                considered.delete(id);
                break;
            }
        }
    }

    // Same for siblings
    // TODO: Unless the siblings parent is weird. Avoid cycles.
    for (const id of considered) {
        for (const siblingId of siblings(id)) {
            if (peopleWithUnassignedLayer.has(siblingId) && !considered.has(siblingId)) {
                considered.delete(id);
                break;
            }
        }
    }

    // considered now contains all the people that will appear in this layer.

    // Now attempt to create a layer out of those people, possibly adding constraints to layers above.
    let layer = [];
    for (const id of considered) {
        peopleWithUnassignedLayer.delete(id);
        layer.push(id);
        personsLayer[id] = layers.length;
    }

    for (const id of layer) {
        for (const partnerId of partners(id)) {
            // So that we consider the constraints only once.
            const constraint = "" + Math.min(id, partnerId) + "-" + Math.max(id, partnerId);
            if (filledConstraints.has(constraint)) {
                continue;
            }

            if (addLeftConstraint(id, partnerId)) {
                filledConstraints.add(constraint);
                continue;
            }

            if (addLeftConstraint(partnerId, id)) {
                filledConstraints.add(constraint);
                continue;
            }
        }
    }
    layers.push(layer);
}

console.log("Initial layers:");
console.log(layers);
console.log("People constraints:");
console.log(constraints);
console.log("Family constraints:");
console.log(familyConstraints);

// -------------------------- Sorting people in each layer according to the collected constraints --------------------------

let layout = [];
for (const layer of layers) {
    layout.push([]);
    /*
    The elements of each layout can have one of three kinds:
    1. family (representing a family node)
    2. person (representing a single person node, along with the families they are completing)
    3. partners (representing a family of two people (each is a partner), along with their families)
    4. partner (representing a person who is part of a partnership)
    5. left-partner (representing a left person, of a broken down partnership)
    */
}

let peopleInLayout = new Set();

function familiesCompletedBy(personId) {
    let result = [];
    for (const familyId of parentOfFamilies(personId)) {
        const parents = familyParents(familyId);
        let completing = true;
        for (const parent of parents) {
            if (!peopleInLayout.has(parent) && parent != personId) {
                completing = false;
                break;
            }
        }
        if (!completing) {
            continue;
        }
        result.push(familyId);
    }
    return result;
}

function firstLeftNotInLayout(personId) {
    while (constraints[personId].left != null && !peopleInLayout.has(constraints[personId].left)) {
        personId = constraints[personId].left
    }
    return personId;
}

function pushPeopleIntoLayoutUntilPersonIsPushed(personId) {
    let pushed = [];
    let current = firstLeftNotInLayout(personId);
    while (current != personId) {
        if (peopleInLayout.has(current)) {
            continue;
        }
        const locator = pushPersonIntoLayout(current);
        pushed.push(locator);
        current = constraints[current].right;
    }
    const locator = pushPersonIntoLayout(personId);
    pushed.push(locator);
    return pushed;
}

function pushFamilyChildrenIntoLayout(familyId) {
    let pushed = [];
    let children = familyChildren(familyId);
    children.sort((a, b) => {
        if (a == familyConstraints[familyId].leftmostChild || b == familyConstraints[familyId].rightmostChild) {
            return -1;
        }
        if (a == familyConstraints[familyId].rightmostChild || b == familyConstraints[familyId].leftmostChild) {
            return 1;
        }
    });
    for (const child of children) {
        if (peopleInLayout.has(child)) {
            continue;
        }

        let pushedWithChild = pushPeopleIntoLayoutUntilPersonIsPushed(child);
        for (const personId of pushedWithChild) {
            pushed.push(personId);
        }
    }
    return pushed;
}

function pushPersonIntoLayout(personId) {
    peopleInLayout.add(personId);
    let familiesCompletedByCurrent = familiesCompletedBy(personId);

    // We use different heuristics depending on what we've done previously and what
    // is the family structure of families, whose last parent is just being laid out
    const previous = layout[personsLayer[personId]].slice(-1)[0];

    let familiesClassification = { 0: [], 1: [], 2: [], ">2": [] };
    for (const familyId of familiesCompletedByCurrent) {
        let parentCount = familyParents(familyId).length;
        if (parentCount <= 2) {
            familiesClassification[parentCount].push(familyId);
        } else {
            familiesClassification[">2"].push(familyId);
        }
    }

    let depth = 1;
    let multiParentFamilyNodes = [];
    for (const familyId of familiesClassification[">2"]) {
        let pushed = pushFamilyChildrenIntoLayout(familyId);
        multiParentFamilyNodes.push({ kind: "family", id: familyId, depth: depth, members: pushed });
        depth += 1;
    }

    let singleParentFamilyNodes = [];
    for (const familyId of familiesClassification[1]) {
        let pushed = pushFamilyChildrenIntoLayout(familyId);
        singleParentFamilyNodes.push({ kind: "family", id: familyId, depth: depth, members: pushed });
    }

    let previousPersonIdOrNull = null;
    if (previous != undefined) {
        if (previous.kind == "person") {
            previousPersonIdOrNull = previous.id;
        }
        else if (previous.kind == "partners") {
            previousPersonIdOrNull = previous.right.id;
        }
    }

    if (familiesClassification[2].length == 1 &&
        familyParents(familiesClassification[2][0]).includes(previousPersonIdOrNull)) {
        const partnerFamilyId = familiesClassification[2][0];
        let pushed = pushFamilyChildrenIntoLayout(partnerFamilyId);
        let partnerFamilyNode = { kind: "family", id: partnerFamilyId, depth: 0, members: pushed };

        if (previous.kind == "person" && 
            (constraints[personId].leftmostChildWithPartner == undefined ||
            constraints[personId].leftmostChildWithPartner == true)
        ) {
            // TODO: The last thing. Treat cross family partners differently.
            // So that we can avoid the spacing between them and we can render them better.
            layout[personsLayer[personId]].pop();
            if (previous.multiParentFamilyNodes != undefined) {
                previous.multiParentFamilyNodes = previous.multiParentFamilyNodes.concat(multiParentFamilyNodes);
            }
            else {
                previous.multiParentFamilyNodes = multiParentFamilyNodes;
            }
            layout[personsLayer[personId]].push({ kind: "left-partner", person: previous, family: partnerFamilyNode });
            layout[personsLayer[personId]].push({ kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, leftPartner: { personId: previous.id, familyId: partnerFamilyId } });
        }
        else if (previous.kind == "person" &&
            constraints[personId].leftmostChildWithPartner != true &&
            constraints[personId].left == previousPersonIdOrNull) {
            layout[personsLayer[personId]].pop();
            const leftPartner = { kind: "person", id: previous.id, singleParentFamilies: previous.singleParentFamilies };
            const rightPartner = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes }
            layout[personsLayer[personId]].push({
                kind: "partners", family: partnerFamilyNode, left: leftPartner,
                right: rightPartner, leftFamilyNodes: previous.multiParentFamilyNodes, rightFamilyNodes: multiParentFamilyNodes
            });
        }
        else if (previous.kind == "partners") {
            layout[personsLayer[personId]].pop();
            const left = previous.left;
            left.multiParentFamilyNodes = previous.leftFamilyNodes;
            left.kind = "person";
            const right = previous.right
            right.kind = "person";
            right.multiParentFamilyNodes = previous.rightFamilyNodes;
            right.leftPartner = { personId: left.id, familyId: previous.family.id };
            const family = previous.family;
            let personSingleNode = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, multiParentFamilyNodes: multiParentFamilyNodes, leftPartner: { personId: right.id, familyId: partnerFamilyId } };
            layout[personsLayer[personId]].push({ kind: "left-partner", person: left, family: family });
            layout[personsLayer[personId]].push({ kind: "left-partner", person: right, family: partnerFamilyNode });
            layout[personsLayer[personId]].push(personSingleNode);
        } else {
            partnerFamilyNode.depth = depth;
            multiParentFamilyNodes.push(partnerFamilyNode);
            let personSingleNode = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, multiParentFamilyNodes: multiParentFamilyNodes };
            layout[personsLayer[personId]].push(personSingleNode);
        }
    } else {
        if (familiesClassification[2].length > 0) {
            let pushed = pushFamilyChildrenIntoLayout(familiesClassification[2][0]);
            let distantPartnerFamilyNode = { kind: "family", id: familiesClassification[2][0], depth: depth, members: pushed };
            multiParentFamilyNodes.push(distantPartnerFamilyNode);
        }
        let personSingleNode = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, multiParentFamilyNodes: multiParentFamilyNodes };
        layout[personsLayer[personId]].push(personSingleNode);
    }
    // We purposefuly return a locator, instead of the node itself. That's because nodes might change (e.g. due to partner merging), while positions always
    // indicate a node containing the specific person.
    return { layer: personsLayer[personId], position: layout[personsLayer[personId]].length - 1 };
}

for (let layer of layers) {
    for (let personId of layer) {
        if (peopleInLayout.has(personId)) {
            continue;
        }
        pushPeopleIntoLayoutUntilPersonIsPushed(personId);
        while (constraints[personId].right != null) {
            personId = constraints[personId].right;
            pushPeopleIntoLayoutUntilPersonIsPushed(personId);
        }
        for (const partnerId of partners(personId)) {
            if (personsLayer[partnerId] != personsLayer[personId]) {
                continue;
            }
            if (peopleInLayout.has(partnerId)) {
                continue;
            }
            pushPeopleIntoLayoutUntilPersonIsPushed(partnerId);
        }
    }
}

console.log(peopleInLayout);

// TODO: Get rid of debug log lines for production version.
console.log("Final layout:");
console.log(layout);

// -------------------------- Placing people in correct places on the plane using the layer information and some heuristics --------------------------

let personsPosition = {};
let familyPosition = {};

const spaceBetweenLayers = 70.0;
const spaceBetweenPeople = 100.0;

function isEmptyFamily(familyNode) {
    // assert(familyNode.kind == "family")
    return familyNode.members.length == 0;
}

function areEmptyFamilyNodes(familyNodes) {
    for (const familyNode of familyNodes) {
        if (!isEmptyFamily(familyNode)) {
            return false;
        }
    }
    return true;
}

// TODO: We need to work on the back fill!
function calculatePosition(node, boxStart, layer) {
    if (node.kind == "person") {
        console.log("Calculating position for " + node.kind + " " + node.id + " " + boxStart + " on layer " + layer);
        if (personsPosition[node.id] != null) {
            console.log("Cached");
            return boxStart;
        }

        let boxEnd = boxStart;
        let first = true;
        if (node.multiParentFamilyNodes != null) {
            for (const multiParentFamilyNodes of node.multiParentFamilyNodes) {
                if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
                boxEnd = Math.max(boxEnd, calculatePosition(multiParentFamilyNodes, boxEnd, layer));
            }
        }
        const actualBoxStart = boxEnd;
        for (const singleParentFamilyNode of node.singleParentFamilies) {
            if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
            boxEnd = Math.max(boxEnd, calculatePosition(singleParentFamilyNode, boxEnd, layer));
        }
        personsPosition[node.id] = { x: (actualBoxStart + boxEnd) / 2, y: layer * spaceBetweenLayers };
        for (const singleParentFamilyNode of node.singleParentFamilies) {
            familyPosition[singleParentFamilyNode.id] = personsPosition[node.id];
        }
        if (node.leftPartner != undefined) {
            const leftPartnerPosition = personsPosition[node.leftPartner.personId];
            familyPosition[node.leftPartner.familyId].x = (leftPartnerPosition.x + personsPosition[node.id].x) / 2;
        }
        console.log("Done with " + node.kind + " " + node.id + " " + boxEnd);
        return boxEnd;
    } else if (node.kind == "left-partner") {
        console.log("Calculating position for " + node.kind + " " + node.person.id + " " + boxStart + " on layer " + layer);
        let boxEnd = calculatePosition(node.person, boxStart, layer);
        // TODO: HERE HERE HERE
        if (!areEmptyFamilyNodes(node.person.singleParentFamilies)) {
            boxEnd = boxEnd + spaceBetweenPeople;
        }
        // TODO: Figure out where to mount the family node.
        boxEnd = calculatePosition(node.family, boxEnd, layer);
        console.log("Done with " + node.kind + " " + node.person.id + " " + boxEnd);
        return boxEnd;
    } else if (node.kind == "partners") {
        console.log("Calculating position for " + node.kind + " " + node.left.id + "," + node.right.id + " " + boxStart + " on layer " + layer);
        if (personsPosition[node.left.id] != null &&
            personsPosition[node.right.id] != null) {
            console.log("Cached");
            return boxStart;
        }
        if (personsPosition[node.left.id] != null) {
            console.log("Cached partially.");
            return calculatePosition(node.right, boxStart, layer);
        }
        if (personsPosition[node.right.id] != null) {
            console.log("Cached partially.");
            return calculatePosition(node.left, boxStart, layer);
        }
        let boxEnd = boxStart;
        let first = true;
        for (const multiParentFamilyNode of node.leftFamilyNodes) {
            if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
            boxEnd = Math.max(boxEnd, calculatePosition(multiParentFamilyNode, boxEnd, layer));
        }
        for (const multiParentFamilyNode of node.rightFamilyNodes) {
            if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
            boxEnd = Math.max(boxEnd, calculatePosition(multiParentFamilyNode, boxEnd, layer));
        }
        const actualBoxStart = boxEnd;
        boxEnd = calculatePosition(node.left, boxEnd, layer);
        boxEnd = calculatePosition(node.family, boxEnd, layer);
        boxEnd = Math.max(boxEnd, boxStart + spaceBetweenPeople);
        boxEnd = calculatePosition(node.right, boxEnd, layer);
        personsPosition[node.left.id] = { x: (actualBoxStart + boxEnd) / 2 - spaceBetweenPeople / 2, y: layer * spaceBetweenLayers };
        personsPosition[node.right.id] = { x: (actualBoxStart + boxEnd) / 2 + spaceBetweenPeople / 2, y: layer * spaceBetweenLayers };
        familyPosition[node.family.id] = { x: (actualBoxStart + boxEnd) / 2, y: layer * spaceBetweenLayers };
        console.log("Done with " + node.kind + " " + node.left.id + "," + node.right.id + " " + boxEnd);

        return boxEnd;
    } else if (node.kind == "family") {
        console.log("Calculating position for " + node.kind + " " + node.id + " " + boxStart + " on layer " + layer);

        if (familyPosition[node.id] != null) {
            return boxStart;
        }
        let boxEnd = boxStart;
        let first = true;
        let handledMember = new Set();
        for (const member of node.members) {
            let memberIdentfierStr = member.layer + " " + member.position;
            if (handledMember.has(memberIdentfierStr)) {
                continue;
            }
            handledMember.add(memberIdentfierStr);
            if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
            const memberNode = layout[member.layer][member.position];
            boxEnd = calculatePosition(memberNode, boxEnd, layer + 1);
        }
        familyPosition[node.id] = { x: (boxStart + boxEnd) / 2, y: layer * spaceBetweenLayers + node.depth * 30 };
        console.log("Done with " + node.kind + " " + node.id + " " + boxEnd);
        return boxEnd;
    }
}

let biggestBoxEnd = 0;

for (let i = 0; i < layout.length; i += 1) {
    const layoutLayer = layout[i];
    let boxEnd = 0;
    let first = true;
    for (const node of layoutLayer) {
        if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
        boxEnd = calculatePosition(node, boxEnd, i);
    }
    biggestBoxEnd = Math.max(boxEnd, biggestBoxEnd);
}

console.log(personsPosition);

// set the dimensions and margins of the diagram
const margin = { top: 50, right: 90, bottom: 30, left: 130 },
    width = biggestBoxEnd + margin.left + margin.right,
    height = layout.length * spaceBetweenLayers + margin.top + margin.bottom;

// TODO: Get rid of output for production
console.log(layers);

// TODO: Infinite scrollable space.
// TODO: Elbows and symbols.
// TODO: Better visualization with buttons and everything.
// TODO: Nice way of handling people that are offline/logged out for some reason.

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom),
    g = svg.append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");



let parentLinks = [];
for (const personId in people) {
    for (const familyId of parentOfFamilies(personId)) {
        parentLinks.push([personId, familyId]);
    }
}

// adds the links between the nodes
const partner = g.selectAll(".partner")
    .data(parentLinks)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", d => "blue")
    .attr("d", d => {
        const source = personsPosition[d[0]];
        const target = familyPosition[d[1]];
        return "M" + source.x + "," + source.y 
            + " " + "L" + (source.x) + "," + (target.y) 
            + " " + "M" + (source.x) + "," + (target.y) 
            + " " + "L" + target.x + "," + target.y;
    });


// TODO: Add different types of nodes (for family and for people) and visualize nice elbows.
let childrenLinks = [];
for (const personId in people) {
    for (const familyId of childOfFamilies(personId)) {
        childrenLinks.push([personId, familyId]);
    }
}

// adds the links between the nodes
const parent = g.selectAll(".parent")
    .data(childrenLinks)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", d => "grey")
    .attr("d", d => {
        const source = personsPosition[d[0]];
        const target = familyPosition[d[1]];
        const midHeight = (source.y + target.y) / 2;
        return "M" + source.x + "," + source.y 
            + " " + "L" + (source.x) + "," + (midHeight) 
            + " " + "M" + (source.x) + "," + (midHeight) 
            + " " + "L" + (target.x) + "," + (midHeight) 
            + " " + "M" + (target.x) + "," + (midHeight) 
            + " " + "L" + target.x + "," + target.y;
    });

let familyNodes = [];
for (const familyId in families) {
    familyNodes.push(familyId);
    if (familyPosition[familyId] == undefined) {
        familyPosition[familyId] = { x: 10, y: 10 };
    }
}

// TODO: Erase debug lines.
console.log(familyPosition);
console.log(familyNodes);

// TODO: Add buttons and interactivity.
// adds each node as a group
const family = g.selectAll(".family")
    .data(familyNodes)
    .enter().append("g")
    .attr("class", d => "family")
    .attr("transform", d => {
        console.log(d);
        console.log(familyPosition[d]);
        return "translate(" + parseInt(familyPosition[d].x) + "," + parseInt(familyPosition[d].y) + ")"
    })
    .on("click", function (event, d) {
        // TODO: Erase debug in the production version
        console.log("Info about family: " + d);
        console.log(families[d]);
        console.log("Parents:");
        console.log(familyParents(d));
        console.log("Children:");
        console.log(familyChildren(d));
        console.log("Positions:");
        console.log(familyPosition[d]);
        console.log("Constraints:");
        console.log(familyConstraints[d]);
    })
    ;

// adds the circle to the family
family.append("circle")
    .attr("r", d => 5)
    .style("stroke", d => "red")
    .style("fill", d => "red");


let personNodes = [];
for (const personId in people) {
    personNodes.push(personId);
}

// TODO: Erase debug lines.
console.log(personsPosition)

// TODO: Add buttons and interactivity.
// adds each node as a group
const person = g.selectAll(".person")
    .data(personNodes)
    .enter().append("g")
    .attr("class", d => "person")
    .attr("transform", d => {
        return "translate(" + parseInt(personsPosition[d].x) + "," + parseInt(personsPosition[d].y) + ")"
    })
    .on("click", function (event, d) {
        // TODO: Erase debug in the production version
        console.log("Info about person: " + d);
        console.log(people[d]);
        console.log("Parents:");
        console.log(parents(d));
        console.log("Children:");
        console.log(children(d));
        console.log("Partners:");
        console.log(partners(d));
        console.log("Siblings:");
        console.log(siblings(d));
        console.log("Parent of families:");
        console.log(parentOfFamilies(d));
        console.log("Child of families:");
        console.log(childOfFamilies(d));
        console.log("Positions:");
        console.log(personsPosition[d]);
        console.log("Constraints:");
        console.log(constraints[d]);
        console.log("Layer:");
        console.log(personsLayer[d]);
    })
    ;

// adds the circle to the person
person.append("circle")
    .attr("r", d => 15)
    .style("stroke", d => "black")
    .style("fill", d => "grey");

// adds the text to the person
person.append("text")
    .attr("dy", ".35em")
    .attr("x", d => (15 + 5) * -1)
    .attr("y", d => -(15 + 5))
    .style("text-anchor", d => "end")
    .text(d => people[d].formattedNames + " " + d);