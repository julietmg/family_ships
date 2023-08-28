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

for(const familyId in families) {
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
    while(constraints[currentId].left != null && 
        peopleIds.includes(constraints[currentId].left)) {
        currentId = constraints[currentId].left;
    }
    return currentId;
}

function rightmostOfSet(peopleIds) {
    let currentId = peopleIds[0];
    while(constraints[currentId].right != null && 
        peopleIds.includes(constraints[currentId].right)) {
        currentId = constraints[currentId].right;
    }
    return currentId;
}

function areDirectNeighbours(peopleIds) {
    if(peopleIds.length <= 1) {
        return true;
    }
    let currentId = leftmostOfSet(peopleIds);
    let visited = 1;
    while(visited < peopleIds.length) {
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

    if (aFamilies.length == 1 && aFamilies.length == 1) {
        const aFamilyId = aFamilies[0];
        const bFamilyId = bFamilies[0];

        let aParentIds = familyParents(aFamilyId);
        let bParentIds = familyParents(bFamilyId);

        if(aParentIds.length <= 0 || bParentIds.length <= 0) {
            return addSoftLeftConstraint(aId, bId);
        }

        if(!areDirectNeighbours(aParentIds)) {
            return false;
        }

        if(!areDirectNeighbours(bParentIds)) {
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

let newLayers = [];
for(const layer of layers) {
    newLayers.push([]);
}

let peopleInNewLayers = new Set();

function familiesCompletedBy(personId) {
    let result = [];
    for (const familyId of parentOfFamilies(personId)) {
        const parents = familyParents(familyId);
        let completing = true;
        for(const parent of parents) {
            if(!peopleInNewLayers.has(parent) && parent != personId) {
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

function firstLeftNotInNewLayers(personId) {
    while (constraints[personId].left != null && !peopleInNewLayers.has(constraints[personId].left)) {
        personId = constraints[personId].left
    }
    return personId;
}

function pushPeopleUntilPersonIsPushed(personId) {
    let current = firstLeftNotInNewLayers(personId);
    while (current != personId) {
        if (peopleInNewLayers.has(current)) {
            continue;
        }
        pushPersonIntoNewLayers(current);
        current = constraints[current].right;
    }
    pushPersonIntoNewLayers(personId);
}

function pushPersonIntoNewLayers(personId) {
    peopleInNewLayers.add(personId);
    newLayers[personsLayer[personId]].push(personId);
    let familiesCompletedByCurrent = familiesCompletedBy(personId);
    familiesCompletedByCurrent.sort((a,b)=>familyParents(b).length - familyParents(a).length);
    for(const familyId of familiesCompletedByCurrent) {
        let children = familyChildren(familyId);
        children.sort((a,b)=> {
            if (a == familyConstraints[familyId].leftmostChild || b == familyConstraints[familyId].rightmostChild) {
                return -1;
            }
            if (a == familyConstraints[familyId].rightmostChild || b == familyConstraints[familyId].leftmostChild) {
                return 1;
            }
        });
        for (const child of children) {
            if (peopleInNewLayers.has(child)) {
                continue;
            }
            pushPeopleUntilPersonIsPushed(child);
        }
    }
}

for(let layer of layers) {
    for(const id of layer) {
        if(peopleInNewLayers.has(id)) {
            continue;
        }
        pushPeopleUntilPersonIsPushed(id);
    }
}

layers = newLayers;

// TODO: Get rid of debug log lines for production version.
console.log("Final layers:");
console.log(layers);

// -------------------------- Placing people in correct places on the plane using the layer information and some heuristics --------------------------

let personsPosition = {};
let familyPosition = {};

let maxX = 0;
let y = 0;
for(const layer of layers) {
    let x = 0;
    for(const personId of layer) {
        personsPosition[personId] = {x:x, y:y};
        x += 100.0;
        maxX = Math.max(x,maxX);
    }
    y += 80.0;
}

// set the dimensions and margins of the diagram
const margin = { top: 50, right: 90, bottom: 30, left: 130 },
    width = maxX + margin.left + margin.right,
    height = y + margin.top + margin.bottom;

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



let partnerships = [];
for (const personId in people) {
    for (const partnerId of partners(personId)) {
        // To prevent from drawing twice.
        if (personId < partnerId) {
            partnerships.push([personId, partnerId]);
        }
    }
}

// adds the links between the nodes
const partner = g.selectAll(".partner")
    .data(partnerships)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", d => "blue")
    .attr("d", d => {
        const source = personsPosition[d[0]];
        const target = personsPosition[d[1]];
        return "M" + source.x + "," + source.y
            + " " + target.x + "," + target.y;
    });


// TODO: Add different types of nodes (for family and for people) and visualize nice elbows.
let parentship = [];
for (const personId in people) {
    const parentIds = parents(personId);
    if (parentIds.length == 0) {
        continue;
    }
    let xAvg = 0;
    let yAvg = 0;
    for (const parentId of parents(personId)) {
        xAvg += personsPosition[parentId].x;
        yAvg += personsPosition[parentId].y;
    }
    xAvg /= parentIds.length;
    yAvg /= parentIds.length;
    // TODO: Add family id here for easier debugging.
    parentship.push([personId, { x: xAvg, y: yAvg }]);
}

// adds the links between the nodes
const parent = g.selectAll(".parent")
    .data(parentship)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", d => "grey")
    .attr("d", d => {
        const source = personsPosition[d[0]];
        const target = d[1];
        return "M" + source.x + "," + source.y
            + " " + target.x + "," + target.y;
    });

let nodes = [];
for (const personId in people) {
    nodes.push(personId);
}

// TODO: Erase debug lines.
console.log(personsPosition)

// TODO: Add buttons and interactivity.
// adds each node as a group
const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", d => "node")
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

// adds the circle to the node
node.append("circle")
    .attr("r", d => 15)
    .style("stroke", d => "black")
    .style("fill", d => "grey");

// adds the text to the node
node.append("text")
    .attr("dy", ".35em")
    .attr("x", d => (15 + 5) * -1)
    .attr("y", d => -(15 + 5))
    .style("text-anchor", d => "end")
    .text(d => people[d].formattedNames + " " + d);