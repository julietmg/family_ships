import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const people = await fetch("/model/debug/people").then(data => data.json());
const families = await fetch("/model/debug/families").then(data => data.json());

let familiesDict = {};
for (const family of families) {
    familiesDict[family.id] = family;
}

let peoplesDict = {};
for (const person of people) {
    peoplesDict[person.id] = person;
}

// TODO: Erase debug in the production version
console.log(familiesDict);
console.log(peoplesDict);

// TODO: Sort everything by age.
function parents(personId) {
    let result = [];
    const person = peoplesDict[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
        const family = familiesDict[familyId];
        for (const familyParent of family.parents) {
            const parentId = familyParent.id.parentId;
            result.push(parentId);
        }
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function siblings(personId) {
    let result = [];
    const person = peoplesDict[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
        const family = familiesDict[familyId];
        for (const familyChild of family.children) {
            const siblingId = familyChild.id.childId;
            result.push(siblingId);
        }
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function partners(personId) {
    let result = [];
    const person = peoplesDict[personId];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        const family = familiesDict[familyId];
        for (const familyParent of family.parents) {
            const parentId = familyParent.id.parentId;
            if (parentId != personId) {
                result.push(parentId);
            }
        }
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function children(personId) {
    let result = [];
    const person = peoplesDict[personId];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        const family = familiesDict[familyId];
        for (const familyChild of family.children) {
            const childId = familyChild.id.childId;
            result.push(childId);
        }
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function parentOfFamilies(personId) {
    let result = [];
    const person = peoplesDict[personId];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        result.push(familyId);
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function childOfFamilies(personId) {
    let result = [];
    const person = peoplesDict[personId];
    for (const familyChild of person.childOfFamily) {
        const familyId = familyChild.id.familyId;
        result.push(familyId);
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

let idsOfPeopleToLayout = new Set();
for (const person of people) {
    idsOfPeopleToLayout.add(person.id);
}

// TODO: Test this layout method thoroughly.

// Algorithm lays out people with layers, starting with people with no parents.
let layers = [];
let personsLayer = {};

function findLeftmostPartnerInFamily(partners) {
    let person = partners[0];
    let layer = personsLayer[person];
    while (layer.constraints[person].left != null &&
        partners.includes(layer.constraints[person].left)) {
        person = layer.constraints[person].left;
    }
    return person;
}

function findRightmostPartnerInFamily(partners) {
    let person = partners[0];
    let layer = personsLayer[person];
    while (layer.constraints[person].right != null &&
        partners.includes(layer.constraints[person].right)) {
        person = layer.constraints[person].right;
    }
    return person;
}

// This functions in a union-find manner, compressing the paths as it goes
function findLeftMostPersonFromPerson(person) {
    let layer = personsLayer[person];
    while (layer.constraints[person].left != null) {
        person = layer.constraints[person].leftmost
    }
    layer.constraints[person].leftmost = person
    return person;
}

// Will attempt to add a left constraint between two people in the layout
// Return `false` and doesn't modify anything (except maybe for leftmost) 
// if this constraint cannot be added.
function addLeftConstraint(aId, bId) /* Bool */ {
    // We assume both aId and bId are on the same layer and that the parents have
    // already been laid out on the layers above.
    const layer = personsLayer[aId];

    let aConstraints = layer.constraints[aId];
    let bConstraints = layer.constraints[bId];

    // Check if we don't have any existing constraints on any of the nodes.
    if (aConstraints.left != null || bConstraints.right != null ||
        (findLeftMostPersonFromPerson(aId) == findLeftMostPersonFromPerson(bId))) {
        // TODO: Erase debug in the production version
        console.log(bId + " to the left of " + aId + " is not possible because of their existing constraints");
        return false;
    }

    let aParentIds = parents(aId);
    let bParentIds = parents(bId);

    if (aParentIds.length > 0 && bParentIds.length > 0) {
        // Follow the left ascendant for node a.
        let aLeftParent = findLeftmostPartnerInFamily(aParentIds);
        let aParentLayer = personsLayer[aLeftParent];
        

        // Follow the right ascendant for node b.
        let bRightParent = findRightmostPartnerInFamily(bParentIds);
        let bParentLayer = personsLayer[bRightParent];

        // This considers families with two parents. 
        // As the line for children comes from the relationship between the parents
        // We don't have to ensure constraints are set on the parents.
        if (aParentLayer.constraints[aLeftParent].left == bRightParent) {
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

        if (aParentLayer.constraints[aLeftParent].leftmostChild != null) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because of the " + aId + " left parent " + aLeftParent);
            return false;
        }

        if (bParentLayer.constraints[bRightParent].rightmostChild != null) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because of the " + bId + " right parent " + bRightParent);
            return false;
        }

        let aLeftAscendant = aLeftParent;
        let bRightAscendant = bRightParent;

        let bAscendantLayer = personsLayer[bRightAscendant];
        let aAscendantLayer = personsLayer[aLeftAscendant];

        // Chase a ascendants up the tree until we land on the same layer.
        while (aAscendantLayer.id != bAscendantLayer.id) {
            if (aAscendantLayer.id < bAscendantLayer.id) {
                let aLeftAscendantParents = parents(aLeftAscendant);
                if (aLeftAscendantParents.length == 0) {
                    // TODO: Erase debug in the production version
                    console.log(bId + " to the left of " + aId + " is not possible because of the " + aId + " left ascendant " + aLeftAscendant);
                    return false;
                }
                aLeftAscendant = findLeftmostPartnerInFamily(aLeftAscendantParents);
                aAscendantLayer = personsLayer[aLeftAscendant];
            } else {
                let bRightAscendantParents = parents(bRightAscendant);
                if (bRightAscendantParents.length == 0) {
                    // TODO: Erase debug in the production version
                    console.log(bId + " to the left of " + aId + " is not possible because of the " + bId + " right ascendant " + bRightAscendant);
                    return false;
                }
                bRightAscendant = findRightmostPartnerInFamily(bRightAscendantParents);
                bAscendantLayer = personsLayer[bRightAscendant];
            }
        }

        // Check if we can add a constraint between the ascendants. If yes, then we can add a constraint here as well.
        if (!addLeftConstraint(aLeftAscendant, bRightAscendant)) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because the ascendants " + aLeftAscendant + " and " + bRightAscendant + " can't be joined.");
            return false;
        }
        aParentLayer.constraints[aLeftParent].leftmostChild = aId;
        aParentLayer.constraints[findLeftmostPartnerInFamily(bParentIds)].rightmostChild = bId;
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

while (idsOfPeopleToLayout.size > 0) {
    let considered = new Set();

    // Get people that are not yet laid out, but for whose
    // all parents are laid out.
    for (const id of idsOfPeopleToLayout) {
        let hasNonLaidOutParents = false;
        for (const parentId of parents(id)) {
            if (idsOfPeopleToLayout.has(parentId)) {
                hasNonLaidOutParents = true;
                break;
            }
        }
        if (hasNonLaidOutParents) {
            continue;
        }
        considered.add(id);
    }

    // Check whether their partners are also considered. 
    // Throw them away, if the partner still has parent constraints.
    for (const id of considered) {
        for (const partnerId of partners(id)) {
            if (!considered.has(partnerId)) {
                considered.delete(id);
                break;
            }
        }
    }
    // Same for siblings
    // Check whether their partners are also considered. 
    // Throw them away, if the partner still has parent constraints.
    for (const id of considered) {
        for (const partnerId of partners(id)) {
            if (!considered.has(partnerId)) {
                considered.delete(id);
                break;
            }
        }
    }
    // considered now contains all the people that will appear in this layer.

    // Now attempt to create a layer out of those people, possibly adding constraints to layers above.
    let layer = {}; /* id, constraints, depth */
    layer.id = layers.length;
    layer.constraints = {}; /* integer (personId) */
    for (const id of considered) {
        idsOfPeopleToLayout.delete(id);
        layer.constraints[id] = {}; /* integer (depth) */
        personsLayer[id] = layer;
    }

    let consideredPartnerships = new Set();
    for (const idStr in layer.constraints) {
        let currentId = +idStr;
        for (const partnerId of partners(currentId)) {
            // So that we consider the partnerships only once.
            const partnership = "" + Math.min(currentId, partnerId) + "-" + Math.max(currentId, partnerId);
            if (consideredPartnerships.has(partnership)) {
                continue;
            }
            consideredPartnerships.add(partnership);

            if (addLeftConstraint(currentId, partnerId)) {
                continue;
            }

            if (addLeftConstraint(partnerId, currentId)) {
                continue;
            }

            // TODO: Use layer depth.
        }
    }
    layers.push(layer);
}

// We now assign information to people based on our fancy topological sort.
// TODO: Walk the tree one more time to ensure soft sibling constraints and layout the tree nicely on x/y axes.
// TODO: Make this more stable, avoid iterating through sets too much if they
// decide of order of things.
let topologicalSortId = 0;
for (const layer of layers) {
    for (const personId in layer.constraints) {
        if (peoplesDict[personId].topologicalSortId != null) {
            continue;
        }
        let currentId = findLeftMostPersonFromPerson(personId);

        peoplesDict[currentId].topologicalSortId = topologicalSortId;
        topologicalSortId += 1;

        while (layer.constraints[currentId].right != null) {

            currentId = layer.constraints[currentId].right;
            if (peoplesDict[currentId].topologicalSortId != null) {
                break;
            }
            peoplesDict[currentId].topologicalSortId = topologicalSortId;
            topologicalSortId += 1;
        }
    }
}

console.log(peoplesDict);

// set the dimensions and margins of the diagram
const margin = { top: 20, right: 90, bottom: 30, left: 90 },
    width = 660 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// TODO: Add different spacing.
const distBetweenLayers = height / (layers.length + 1);
for (let y = 0; y < layers.length; y++) {
    const layer = layers[y];
    let row = [];
    for (const personId in layer.constraints) {
        row.push(personId);
    }
    row.sort((a, b) => peoplesDict[a].topologicalSortId - peoplesDict[b].topologicalSortId);

    const distBetweenPeople = width / (row.length + 1);
    for (let x = 0; x < row.length; x++) {
        const personId = row[x];

        let node = {};
        node.x = (x + 1) * distBetweenPeople;
        node.y = (y + 1) * distBetweenLayers;
        node.personId = +personId;
        peoplesDict[personId].node = node;
    }
}

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
for (const personId in peoplesDict) {
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
        const source = peoplesDict[d[0]].node;
        const target = peoplesDict[d[1]].node;
        return "M" + source.x + "," + source.y
            + " " + target.x + "," + target.y;
    });


// TODO: Add different types of nodes (for family and for people) and visualize nice elbows.
let parentship = [];
for (const personId in peoplesDict) {
    const parentIds = parents(personId);
    if (parentIds.length == 0) {
        continue;
    }
    let xAvg = 0;
    let yAvg = 0;
    for (const parentId of parents(personId)) {
        xAvg += peoplesDict[parentId].node.x;
        yAvg += peoplesDict[parentId].node.y;
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
        const source = peoplesDict[d[0]].node;
        const target = d[1];
        return "M" + source.x + "," + source.y
            + " " + target.x + "," + target.y;
    });

let nodes = [];
for (const personId in peoplesDict) {
    nodes.push(personId);
}

// TODO: Add buttons and interactivity.
// adds each node as a group
const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", d => "node")
    .attr("transform", d => {
        return "translate(" + peoplesDict[d].node.x + "," + peoplesDict[d].node.y + ")"
    })
    .on("click", function (event, d) {
        // TODO: Erase debug in the production version
        console.log("Info about person: " + d);
        console.log(peoplesDict[d]);
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
    .text(d => peoplesDict[d].formattedNames + " " + d);