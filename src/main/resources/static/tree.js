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

function familyChildren(familyId) {
    return familiesDict[familyId].children.map((x) => x.id.childId);
}

function familyParents(familyId) {
    return familiesDict[familyId].parents.map((x) => x.id.parentId);
}

// TODO: Sort everything by age.
function parents(personId) {
    let result = [];
    const person = peoplesDict[personId];
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
    const person = peoplesDict[personId];
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
    const person = peoplesDict[personId];
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
    const person = peoplesDict[personId];
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
    const layer = personsLayer[person];
    while (layer.constraints[person].left != null) {
        person = layer.constraints[person].leftmost
    }
    layer.constraints[person].leftmost = person
    return person;
}

// Will attempt to add a left constraint between two people in the layout.
// Return `false` and doesn't modify anything (except maybe for leftmost) 
// if this constraint cannot be added.
function addSoftLeftConstraint(aId, bId) /* Bool */ {
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

    let aConstraints = layer.constraints[aId];
    let bConstraints = layer.constraints[bId];

    // Check if we don't have any existing constraints on any of the nodes.
    if (aConstraints.left != null || bConstraints.right != null ||
        (findLeftMostPersonFromPerson(aId) == findLeftMostPersonFromPerson(bId))) {
        // TODO: Erase debug in the production version
        console.log(bId + " to the left of " + aId + " is not possible because of their existing constraints");
        return false;
    }

    // TODO: This assumes too much about the parents.
    // We must take the parents of the family aId and bId are in.
    // If there are multiple then fail. (this doesn't happen)
    // TODO: Another problem is when we would want to be a rightmost child
    // but there is already a singleton family rightmost child.
    // or thre is a singleton family in general.

    let aParentIds = parents(aId);
    let bParentIds = parents(bId);

    if (aParentIds.length > 0 && bParentIds.length > 0) {
        // Follow the left ascendant for node a.
        let aLeftParent = findLeftmostPartnerInFamily(aParentIds);
        let aParentLayer = personsLayer[aLeftParent];

        // Follow the right ascendant for node b.
        let bRightParent = findRightmostPartnerInFamily(bParentIds);
        let bLeftParent = findLeftmostPartnerInFamily(bParentIds);
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
            // TODO: There can be cases where ascendant layers can't be matched.
            // In this case, fail.
        }

        // TODO: If ascendant are on different layers, do something different.
        // i.e. Hook right and left to the void.

        // Check if we can add a constraint between the ascendants. If yes, then we can add a constraint here as well.
        if (!addLeftConstraint(aLeftAscendant, bRightAscendant)) {
            // TODO: Erase debug in the production version
            console.log(bId + " to the left of " + aId + " is not possible because the ascendants " + aLeftAscendant + " and " + bRightAscendant + " can't be joined.");
            return false;
        }
        aParentLayer.constraints[aLeftParent].leftmostChild = aId;
        aParentLayer.constraints[bLeftParent].rightmostChild = bId;
    }

    return addSoftLeftConstraint(aId, bId);
}

// TODO: Make this algorithm stable.

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

    if (considered.size == 0) {
        // TODO: Fail gently if considered is empty. That means there is a cycle and a big bug
        // in the backend.
        console.log("There is a cycle in the data from the backend!")
        break;
    }

    // Check whether their partners are also considered. 
    // Throw them away, if the partner still has parent constraints.
    for (const id of considered) {
        for (const partnerId of partners(id)) {
            if (idsOfPeopleToLayout.has(partnerId) && !considered.has(partnerId)) {
                considered.delete(id);
                break;
            }
        }
    }

    // Same for siblings
    for (const id of considered) {
        for (const siblingId of siblings(id)) {
            if (idsOfPeopleToLayout.has(siblingId) && !considered.has(siblingId)) {
                considered.delete(id);
                break;
            }
        }
    }
    // considered now contains all the people that will appear in this layer.

    // Now attempt to create a layer out of those people, possibly adding constraints to layers above.
    let layer = {}; /* id, constraints */
    layer.id = layers.length;
    layer.constraints = {}; /* integer (personId) */
    for (const id of considered) {
        idsOfPeopleToLayout.delete(id);
        layer.constraints[id] = {}; /* leftmostChild, rightmostChild, left, right, leftmost */
        personsLayer[id] = layer;
    }

    let filledConstraints = new Set();
    for (const idStr in layer.constraints) {
        let currentId = +idStr;

        for (const partnerId of partners(currentId)) {
            // So that we consider the constraints only once.
            const constraint = "" + Math.min(currentId, partnerId) + "-" + Math.max(currentId, partnerId);
            if (filledConstraints.has(constraint)) {
                continue;
            }

            if (addLeftConstraint(currentId, partnerId)) {
                filledConstraints.add(constraint);
                continue;
            }

            if (addLeftConstraint(partnerId, currentId)) {
                filledConstraints.add(constraint);
                continue;
            }
        }

        for (const siblingId of siblings(currentId)) {
            const constraint = "" + Math.min(currentId, siblingId) + "-" + Math.max(currentId, siblingId);
            if (filledConstraints.has(constraint)) {
                continue;
            }

            if (addSoftLeftConstraint(currentId, siblingId)) {    
                filledConstraints.add(constraint);
                continue;
            }

            if (addSoftLeftConstraint(siblingId, currentId)) {    
                filledConstraints.add(constraint);
                continue;
            }
        }
    }
    layers.push(layer);
}

// Singleton families are the ones this person is the sole
// parent of.
function findSingletonFamilies(personId) {
    let result = [];
    for (const familyId of parentOfFamilies(personId)) {
        let parents = familyParents(familyId);
        if (parents.length == 1 && parents[0] == personId) {
            result.push(familyId);
        }
    }
    return result;
}

let spaceBetweenPartners = 80.0;
let spaceBetweenLayers = 50.0;
let spaceBetweenClusters = 80.0;

// For each person and for each family we want the exact x and y
// coordinates on where to place them.
// Note that, at this phase, those are not normalized yet and might
// be just a path of relative offsets.
let peoplePlanePosition = {};
let familyPlanePosition = {};

// This functions in a union-find manner, compressing the paths as it goes
function findLeftMostPersonFromPersonThatHasNoPosition(person) {
    console.log(person);
    const layer = personsLayer[person];
    while (layer.constraints[person].left != null && peoplePlanePosition[person] == null) {
        person = layer.constraints[person].left
    }
    return person;
}

function calculatePositions(firstPersonId, lastPersonIdOrNull, x, y) {
    const layer = personsLayer[firstPersonId];
    const singletonFamilyBoxEnd = calculateSingletonFamiliesPositions(firstPersonId, x, y);

    const personPartners = partners(firstPersonId);
    const personOnTheRight = layer.constraints[firstPersonId].right;

    // TODO: 
    // 1. Para rodzicow + singletony.
    // 2. Lancuch rodzicow + singletony + byc moze rodziny w lancuchu.
    // 3. Nastepny nie jest rodzicem.
    if (personOnTheRight != null && personPartners.includes(personOnTheRight)) {
        let twoPartnerFamily = null;
        for (const familyId of parentOfFamilies(firstPersonId)) {
            const parents = familyParents(familyId);
            if (parents.length != 2) {
                continue;
            }
            if (parents.includes(personOnTheRight)) {
                twoPartnerFamily = familyId;
                break;
            }
        }
        let twoPartnerFamilyBoxStart = null;
        let twoPartnerFamilyBoxEnd = null;
        if (twoPartnerFamily != null) {
            const children = familyChildren(twoPartnerFamily);
            if (children.length != 0) {
                let startingChild = layer.constraints[firstPersonId].leftmostChild;
                if (startingChild == null) {
                    startingChild = children[0];
                }
                if (singletonFamilyBoxEnd == null) {
                    twoPartnerFamilyBoxStart = x;
                } else {
                    twoPartnerFamilyBoxStart = singletonFamilyBoxEnd + spaceBetweenClusters;
                }

                console.log("Now children: " + startingChild + " " + twoPartnerFamilyBoxStart);

                // TODO: LEFTMOST TO THE LEFT
                // TODO: RIGHTMOST TO THE RIGHT
                let singleChildOffset = 0;
                // if (children.length == 1) {
                //     singleChildOffset = spaceBetweenPartners / 2;
                // }

                twoPartnerFamilyBoxEnd = calculatePositions(
                    findLeftMostPersonFromPersonThatHasNoPosition(startingChild), 
                    layer.constraints[firstPersonId].rightmostChild, 
                    twoPartnerFamilyBoxStart + singleChildOffset, y + spaceBetweenLayers);
            }
        }

        let partnerSingletonFamilyBoxStart = null;
        if (twoPartnerFamilyBoxEnd == null) {
            if (singletonFamilyBoxEnd == null) {
                partnerSingletonFamilyBoxStart = x + spaceBetweenPartners;
            }
            else {
                partnerSingletonFamilyBoxStart = singletonFamilyBoxEnd + spaceBetweenClusters;
            }
        } 
        else {
            partnerSingletonFamilyBoxStart = twoPartnerFamilyBoxEnd + spaceBetweenClusters;
        }

        const partnerSingletonFamilyBoxEnd = calculateSingletonFamiliesPositions(personOnTheRight, partnerSingletonFamilyBoxStart, y);
        
        let currentBoxEnd = null;
        if (partnerSingletonFamilyBoxEnd != null) {
            currentBoxEnd = partnerSingletonFamilyBoxEnd;
        } else if (twoPartnerFamilyBoxEnd != null) {
            currentBoxEnd = twoPartnerFamilyBoxEnd;
        } else if (singletonFamilyBoxEnd != null) {
            currentBoxEnd = singletonFamilyBoxEnd;
        }
        let firstPersonX = (x + currentBoxEnd) / 2 - (spaceBetweenPartners / 2);
        if (firstPersonX < 0) {
            firstPersonX = 0;
        }
        let partnerX = firstPersonX + spaceBetweenPartners;
        currentBoxEnd = Math.max(currentBoxEnd, partnerX);

        peoplePlanePosition[firstPersonId] = { x: firstPersonX, y: y };
        peoplePlanePosition[personOnTheRight] = { x: partnerX, y: y };

        if (twoPartnerFamily != null) {
            familyPlanePosition[twoPartnerFamily] = { x: firstPersonX + spaceBetweenPartners / 2, y: y };
        }

        let personOnTheRightOfThePersonOnTheRight = layer.constraints[personOnTheRight].right;
        if (personOnTheRightOfThePersonOnTheRight == null || firstPersonId == lastPersonIdOrNull) {
            return currentBoxEnd;
        }
        return calculatePositions(personOnTheRightOfThePersonOnTheRight, lastPersonIdOrNull, currentBoxEnd + spaceBetweenClusters, y);
    } else {
        let currentBoxEnd = null;
        if (singletonFamilyBoxEnd != null) {
            peoplePlanePosition[firstPersonId] = { x: (x + singletonFamilyBoxEnd) / 2, y: y };
            currentBoxEnd = singletonFamilyBoxEnd;
        } else {
            peoplePlanePosition[firstPersonId] = { x: x, y: y };
            currentBoxEnd = x;
        }

        if (personOnTheRight == null || firstPersonId == lastPersonIdOrNull) {
            return currentBoxEnd;
        }
        return calculatePositions(personOnTheRight, lastPersonIdOrNull, currentBoxEnd + spaceBetweenClusters, y);
    }
}

function calculateSingletonFamiliesPositions(personId, x, y) {
    const singletonFamilyIds = findSingletonFamilies(personId);
    if (singletonFamilyIds.length == 0) {
        return null;
    }
    let boxEnd = null;
    for (const familyId of singletonFamilyIds) {
        familyPlanePosition[familyId] = [x, y];
        const children = familyChildren(familyId);
        if (children.length == 0) {
            continue;
        }
        let startingChild = personsLayer[personId].constraints[personId].leftmostChild;
        if (startingChild == null) {
            startingChild = children[0];
        }
        // TODO: Cleanup messy code.
        if (boxEnd == null) {
            boxEnd = x;
        }
        if(singletonFamilyIds[0] != familyId) {
            boxEnd += spaceBetweenClusters;
        }
        boxEnd = calculatePositions(findLeftMostPersonFromPersonThatHasNoPosition(startingChild), personsLayer[personId].constraints[personId].rightmostChild, boxEnd, y + spaceBetweenLayers);
    }
    return boxEnd;
}

let currentYPosition = 0;
let maxBoxEnd = 0;
// TODO: Track max box X per layer to ensure no collisions for free flowing people.
for (const layer of layers) {
    // TODO: Maybe store all the families for which we need to find the
    // places in this pass.
    // TODO: DO FAMILIES, TO MAKE SURE WE DRAW THEM ALL!
    // TODO: Also track maximum X per layer to avoid collisions.
    // TODO: Make depth of families with post rendered things.
    // TODO: Have some kind of preference for the people with families.
    // TODO: STore current depth of family connections and layout post family connections according to it.
    // TODO: Some family points, need additional depth for the children elbow.

    let currentXPosition = 0;
    for (const personId in layer.constraints) {
        if (peoplePlanePosition[personId] != null) {
            continue;
        }
        let currentId = findLeftMostPersonFromPersonThatHasNoPosition(personId);
        let currentBoxEnd = calculatePositions(currentId, null, currentXPosition, currentYPosition);
        currentXPosition = currentBoxEnd + spaceBetweenClusters;
        maxBoxEnd = Math.max(currentBoxEnd, maxBoxEnd);
    }

    let emptyFamilies = new Set();
    for (const personId in layer.constraints) {
        
    }

    currentYPosition += spaceBetweenLayers;
}

// set the dimensions and margins of the diagram
const margin = { top: 50, right: 90, bottom: 30, left: 130 },
    width = maxBoxEnd + margin.left + margin.right,
    height = 500 - margin.top - margin.bottom;

// TODO: Add different spacing and laying out algorithm.
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

// TODO: For each family, we now need to figure out how to space them.
// i.e. where is the family point.
// For 1 partners it's in the partner.
// For 2 partners it's between the partners, if they are next to each other.
// For more partners there is an elbow below.

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
        const source = peoplePlanePosition[d[0]];
        const target = peoplePlanePosition[d[1]];
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
        xAvg += peoplePlanePosition[parentId].x;
        yAvg += peoplePlanePosition[parentId].y;
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
        const source = peoplePlanePosition[d[0]];
        const target = d[1];
        return "M" + source.x + "," + source.y
            + " " + target.x + "," + target.y;
    });

let nodes = [];
for (const personId in peoplesDict) {
    nodes.push(personId);
}

console.log(peoplePlanePosition)

// TODO: Add buttons and interactivity.
// adds each node as a group
const node = g.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", d => "node")
    .attr("transform", d => {
        return "translate(" + parseInt(peoplePlanePosition[d].x) + "," + parseInt(peoplePlanePosition[d].y) + ")"
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
        console.log("Coordinates:");
        console.log(peoplePlanePosition[d]);
        console.log("Constraints:");
        console.log(personsLayer[d].constraints[d]);
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