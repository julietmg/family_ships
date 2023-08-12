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

function parents(person_id) {
    let result = [];
    const person = peoplesDict[person_id];
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

function siblings(person_id) {
    let result = [];
    const person = peoplesDict[person_id];
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

function partners(person_id) {
    let result = [];
    const person = peoplesDict[person_id];
    for (const familyParent of person.parentOfFamily) {
        const familyId = familyParent.id.familyId;
        const family = familiesDict[familyId];
        for (const familyParent of family.parents) {
            const parentId = familyParent.id.parentId;
            if (parentId != person_id) {
                result.push(parentId);
            }
        }
    }
    result.sort((a, b) => a.id - b.id);
    return result;
}

function children(person_id) {
    let result = [];
    const person = peoplesDict[person_id];
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


// TODO: Erase debug in the production version
console.log("Info about person 1:")
console.log(peoplesDict[1])
console.log("Parents:")
console.log(parents(1))
console.log("Children:")
console.log(children(1))
console.log("Partners:")
console.log(partners(1))
console.log("Siblings:")
console.log(siblings(1))

let idsOfPeopleToLayout = new Set();
for (const person of people) {
    idsOfPeopleToLayout.add(person.id);
}

// TODO: Test this layout method thoroughly.

// Algorithm lays out people with layers, starting with people with no parents.
let layers = [];
let personsLayer = {};

// Will attempt to add a left constraint between two people in the layout
// Return `false` and doesn't modify anything if this constraint cannot be added.
// TODO: Somehow avoid cycles.
function addLeftConstraint(aId, bId) /* Bool */ {
    // We assume both aId and bId are on the same layer and that the parents have
    // already been laid out on the layers above.
    const layer = personsLayer[aId];

    let aConstraints = layer.constraints[aId];
    let bConstraints = layer.constraints[bId];

    // Check if we don't have any existing constraints on any of the nodes.
    if (aConstraints.left != null || bConstraints.right != null && 
        aConstraints.right != bId) {
        return false;
    }

    let aParentIds = parents(aId);
    let bParentIds = parents(bId);

    if (aParentIds.size > 0 && bParentIds.size > 0) {
        // If either node has more than two parents, then its impossible to add this constraint.
        if (aParentIds.size > 2 || bParentIds.size > 2) {
            return false;
        }

        // Follow the left ascendant for node a.
        let aLeftAscendant = aParentIds[0];
        let aAscendantLayer = personsLayer[aLeftAscendant];
        if (aParentIds.size == 2 && aAscendantLayer.constraints[aLeftAscendant].left == aParentIds[1]) {
            aLeftAscendant = aParentIds[1];
        }

        // Follow the right ascendant for node b.
        let bRightAscendant = bParentIds[0];
        let bAscendantLayer = personsLayer[bRightAscendant];
        if (bParentIds.size == 2 && bAscendantLayer.contents[bRightAscendant].right == bParentIds[1]) {
            bRightAscendant = bParentIds[1];
        }

        // If they are on the same layer and are already correctly wired up, finish early.
        if (aAscendantLayer.id == bAscendantLayer.id &&
            aAscendantLayer.constraints[aLeftAscendant].left == bRightAscendant) {
            aConstraints.left = bId;
            bConstraints.right = aId;
            return true;
        }

        // Chase a ascendants up the tree until we land on the same layer.
        while (aAscendantLayer < bAscendantLayer) {
            let aLeftAscendantParents = parents(aLeftAscendant);
            aLeftAscendant = aLeftAscendantParents[0];
            aAscendantLayer = personsLayer[aLeftAscendant];
            if (aLeftAscendantParents.size == 2 && aAscendantLayer[aLeftAscendant].left == aLeftAscendantParents[1]) {
                aLeftAscendant = aLeftAscendantParents[1];
            }

            if (aAscendantLayer.id == bAscendantLayer.id) {
                break;
            }

            if (aAscendantLayer.constraints[aLeftAscendant].left != null) {
                return false;
            }
        }

        // Chase b ascendants up the tree until we land on the same layer.
        while (bAscendantLayer < aAscendantLayer) {
            let bRightAscendantParents = parents(aRightAscendant);
            bRightAscendant = bRightAscendantParents[0];
            bAscendantLayer = personsLayer[bRightAscendant];
            if (bRightAscendantParents.size == 2 && bAscendantLayer[bRightAscendant].right == bRightAscendantParents[1]) {
                bRightAscendant = bRightAscendantParents[1];
            }

            if (aAscendantLayer.id == bAscendantLayer.id) {
                break;
            }

            if (bAscendantLayer.constraints[bRightAscendant].right != null) {
                return false;
            }
        }

        // Check if we can add a constraint between the ascendants. If yes, then we can add a constraint here as well.
        if (addLeftConstraint(aLeftAscendant, bRightAscendant)) {
            aConstraints.left = bId;
            bConstraints.right = aId;
            return true;
        }
    }
    aConstraints.left = bId;
    bConstraints.right = aId;
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

            if(addLeftConstraint(currentId, partnerId)) {
                continue;
            }

            if(addLeftConstraint(partnerId, currentId)) {
                continue;
            }

            // TODO: Use layer depth.
        }
    }
    layers.push(layer);
}

// We now assign information to people based on our fancy topological sort.
// TODO: Walk the tree one more time to ensure soft sibling constraints.
let topologicalSortId = 0;
for(const layer of layers) {
    for(const personId in layer.constraints) {
        if (peoplesDict[personId].topologicalSortId != null) {
            continue;
        }
        peoplesDict[personId].topologicalSortId = topologicalSortId;
        topologicalSortId += 1;
        let currentId = personId;
        while(layer.constraints[currentId].right != null) {
            currentId = layer.constraints[currentId].right;
            peoplesDict[currentId].topologicalSortId = topologicalSortId;
            topologicalSortId += 1;
        }
    }
}

// set the dimensions and margins of the diagram
const margin = { top: 20, right: 90, bottom: 30, left: 90 },
    width = 660 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const distBetweenLayers = height / (layers.length+1);

for(let y = 0; y < layers.length; y++) {
    const layer = layers[y];
    let row = [];
    for(const personId in layer.constraints) {
        row.push(personId);
    }
    row.sort((a, b) => peoplesDict[a].topologicalSortId - peoplesDict[b].topologicalSortId);
    
    const distBetweenPeople = width / (row.length+1);
    for(let x = 0; x < row.length; x++) {
        const personId = row[x];
        
        let node = {};
        node.x = (x+1) * distBetweenPeople;
        node.y = (y+1) * distBetweenLayers;
        node.personId = +personId;
        peoplesDict[personId].node = node;
    }
}


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
for(const personId in peoplesDict) {
    for(const partnerId of partners(personId)) {
        console.log(partnerId);
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

let parentship = [];
for(const personId in peoplesDict) {
    const parentIds = parents(personId);
    if(parentIds.length == 0) {
        continue;
    }
    let xAvg = 0;
    let yAvg = 0;
    for(const parentId of parents(personId)) {
        xAvg += peoplesDict[parentId].node.x;
        yAvg += peoplesDict[parentId].node.y;
    }
    xAvg /= parentIds.length;
    yAvg /= parentIds.length;
    // TODO: Add family id here for easier debugging.
    parentship.push([personId, {x:xAvg, y:yAvg}]);
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
for(const personId in peoplesDict) {
    nodes.push(personId);
}

// TODO: Add buttons and interactivity.
// adds each node as a group
const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", d => "node")
    .attr("transform", d => {
       return  "translate(" + peoplesDict[d].node.x + "," + peoplesDict[d].node.y + ")"
    }
    );

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