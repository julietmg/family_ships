import * as tools from "./tools.js";
import * as model from "./model.js";
export let personsPosition = {};
export let familyPosition = {};
export function recalculate() {
    // Reset the existing positions before recalculating
    personsPosition = {};
    familyPosition = {};
    // -------------------------- Reachability in the graph --------------------------
    function reachableRec(startId, endIds, visited) {
        if (visited.has(startId)) {
            return true;
        }
        visited.add(startId);
        for (const childId of model.children(startId)) {
            if (endIds.has(childId) || reachableRec(childId, endIds, visited)) {
                return true;
            }
        }
        return false;
    }
    // TODO: This might be possible to speed up.
    // * http://www.vldb.org/pvldb/vol7/p1191-wei.pdf
    // * https://stackoverflow.com/questions/3755439/efficient-database-query-for-ancestors-on-an-acyclic-directed-graph
    // * https://www.slideshare.net/slidarko/graph-windycitydb2010 (a.k.a. gremlins)
    // * https://www3.cs.stonybrook.edu/~bender/pub/JALG05-daglca.pdf - but LCA might be too specific
    // Calculates whether any of the endIds are reachable from any of the startIds in the parent-child relationship graph.
    function isAnyReachableFrom(startIds, endIds) {
        let visited = new Set();
        for (const personId of startIds) {
            if (reachableRec(personId, endIds, visited)) {
                console.log("YES");
                return true;
            }
        }
        console.log("NO");
        return false;
    }
    function partnerClusterRec(personId, result) {
        if (result.has(personId)) {
            return;
        }
        result.add(personId);
        for (const partnerId of model.partners(personId)) {
            partnerClusterRec(partnerId, result);
        }
    }
    function partnerCluster(personId) {
        let result = new Set();
        partnerClusterRec(personId, result);
        return result;
    }
    // -------------------------- Calculating strongly connected components --------------------------
    // This uses Tarjan's algorithm
    let sccs = [];
    let personsSccNum = {};
    let personsSccLow = {};
    let sccVisited = new Set();
    let sccProcessed = new Set();
    let sccCounter = 0;
    let sccStack = [];
    function sccRec(personId) {
        personsSccNum[personId] = sccCounter;
        personsSccLow[personId] = sccCounter;
        sccCounter += 1;
        sccVisited.add(personId);
        sccStack.push(personId);
        console.log("VISIT");
        console.log(personId);
        console.log(personsSccNum[personId] + " " + personsSccLow[personId]);
        console.log(model.children(personId));
        for (const childId of model.children(personId)) {
            if (!sccVisited.has(childId)) {
                sccRec(childId);
                personsSccLow[personId] = Math.min(personsSccLow[personId], personsSccLow[childId]);
            }
            else if (!sccProcessed.has(childId)) {
                personsSccLow[personId] = Math.min(personsSccLow[personId], personsSccNum[childId]);
            }
        }
        sccProcessed.add(personId);
        console.log("PROCESS");
        console.log(personId);
        console.log(personsSccNum[personId] + " " + personsSccLow[personId]);
        if (personsSccLow[personId] == personsSccNum[personId]) {
            let scc = [];
            let current = sccStack.pop();
            while (current != personId) {
                scc.push(current);
                current = sccStack.pop();
            }
            scc.push(current);
            sccs.push(scc);
        }
    }
    for (const personId in model.people) {
        if (sccVisited.has(+personId)) {
            continue;
        }
        sccRec(+personId);
    }
    let personsSccIndex = {};
    for (let i = 0; i < sccs.length; i += 1) {
        const scc = sccs[i];
        for (const personId of scc) {
            personsSccIndex[personId] = i;
        }
    }
    function parentsOfSet(peopleIds) {
        let result = new Set();
        for (const personId of peopleIds) {
            for (const parentId of model.parents(personId)) {
                result.add(parentId);
            }
        }
        return result;
    }
    function parentSccs(sccId) {
        let result = new Set();
        for (const personId of parentsOfSet(sccs[sccId])) {
            result.add(personsSccIndex[personId]);
        }
        return result;
    }
    console.log("Sccs:");
    console.log(sccs);
    // -------------------------- Assigning people to layers --------------------------
    // Algorithm lays out people with layers, starting with people with no parents.
    let peopleWithUnassignedLayer = new Set();
    for (const personId in model.people) {
        peopleWithUnassignedLayer.add(+personId);
    }
    let layers = [];
    let personsLayer = {};
    while (peopleWithUnassignedLayer.size > 0) {
        let considered = new Set();
        // Get people that are not yet laid out, but for whose
        // all parents are laid out.
        for (const personId of peopleWithUnassignedLayer) {
            let hasNonLaidOutParents = false;
            for (const parentId of model.parents(personId)) {
                if (peopleWithUnassignedLayer.has(parentId)
                    && personsSccIndex[parentId] != personsSccIndex[personId]) {
                    hasNonLaidOutParents = true;
                    break;
                }
            }
            // There is a special case of sibling, that don't have any parents.
            // Those should be in the second layer.
            if (hasNonLaidOutParents) {
                continue;
            }
            if (model.childOfFamilies(personId).filter((familyId) => model.familyParents(familyId).length == 0).length > 0
                && layers.length == 0) {
                continue;
            }
            considered.add(personId);
        }
        if (considered.size == 0) {
            tools.log("There is a cycle in the data from the backend!");
            break;
        }
        const previousConsidered = new Set(considered);
        let changed = true;
        while (changed) {
            changed = false;
            let throwOutConsidered = new Set();
            // Check whether their partners are also considered. 
            // Throw them away, if the partner still has parent constraints.
            for (const id of considered) {
                if (throwOutConsidered.has(id)) {
                    continue;
                }
                throwOutConsidered.add(id);
                let personPartners = partnerCluster(id);
                let consideredPartners = [];
                let lowerLayersPartners = new Set();
                for (const partnerId of personPartners) {
                    if (considered.has(partnerId)) {
                        consideredPartners.push(partnerId);
                        throwOutConsidered.add(partnerId);
                    }
                    else {
                        lowerLayersPartners.add(partnerId);
                    }
                }
                console.log("CONSIDERED PARTNERS:");
                console.log(consideredPartners);
                console.log("KICK OUT TARGETS: ");
                console.log(lowerLayersPartners);
                if (lowerLayersPartners.size == 0) {
                    continue;
                }
                if (isAnyReachableFrom(consideredPartners, lowerLayersPartners)) {
                    continue;
                }
                for (const id of consideredPartners) {
                    console.log("KICKING OFF: " + id);
                    changed = considered.delete(id) || changed;
                }
            }
        }
        if (considered.size == 0) {
            tools.log("BUG: There is something weird with partner resolution.");
            considered = previousConsidered;
        }
        // considered now contains all the people that will appear in this layer.
        // Now attempt to create a layer out of those people, possibly adding constraints to layers above.
        let layer = [];
        for (const id of considered) {
            peopleWithUnassignedLayer.delete(id);
            layer.push(id);
            personsLayer[id] = layers.length;
        }
        // TODO: Sort by age.
        layer.sort((a, b) => a - b);
        layers.push(layer);
    }
    // -------------------------- Calculating constraints between people --------------------------
    // The resulting form doubly linked lists, with left and right pointers, indicating the left and right neighbours
    // of each node.
    // `leftmost` ensures there is no cycle.
    // Note, that this is based on pure heuristics and the output of this has no additional invariants.
    // (i.e. whatever the output of this step, the final graph should still look more or less decent)
    let constraints = {};
    let filledConstraints = new Set();
    let familyConstraints = {};
    for (const personId in model.people) {
        constraints[personId] = {};
    }
    for (const familyId in model.families) {
        familyConstraints[familyId] = {};
    }
    // This functions in a union-find manner, compressing the paths as it goes.
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
        // assert(areDirectNeighbours(peopleIds));
        let currentId = peopleIds[0];
        while (constraints[currentId].left != null &&
            peopleIds.includes(constraints[currentId].left)) {
            currentId = constraints[currentId].left;
        }
        return currentId;
    }
    function rightmostOfSet(peopleIds) {
        // assert(areDirectNeighbours(peopleIds));
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
            }
            else {
                return false;
            }
        }
        return true;
    }
    let dependentOnFamilies = {};
    for (const personId in model.people) {
        dependentOnFamilies[personId] = model.childOfFamilies(+personId).filter((familyId) => model.familyParents(familyId).length > 0);
    }
    // Will attempt to add a left constraint between two people in the layout.
    // Return `false` and doesn't modify anything (except maybe for leftmost) 
    // if this constraint cannot be added.
    function addSoftLeftConstraint(aId, bId) {
        // We assume both aId and bId are on the same layer and that the parents have
        // already been laid out on the layers above.
        let aConstraints = constraints[aId];
        let bConstraints = constraints[bId];
        // Check if we don't have any existing constraints on any of the nodes.
        if (aConstraints.left != null || bConstraints.right != null ||
            (leftmostOf(aId) == leftmostOf(bId))) {
            // // TODO: Erase debug in the production version
            tools.log(bId + " to the left of " + aId + " is not possible because of their existing constraints");
            return false;
        }
        aConstraints.left = bId;
        bConstraints.right = aId;
        if (bConstraints.leftmost == null) {
            bConstraints.leftmost = bId;
        }
        aConstraints.leftmost = bConstraints.leftmost;
        let mutualDependentFamilies = dependentOnFamilies[aId].concat(dependentOnFamilies[bId]);
        dependentOnFamilies[aId] = mutualDependentFamilies;
        dependentOnFamilies[bId] = mutualDependentFamilies;
        // // TODO: Erase debug in the production version
        tools.log(bId + " to the left of " + aId + " is added");
        return true;
    }
    // Will attempt to add a left constraint between two people in the layout
    // and then it will follow to the parents ensuring the parents also have
    // the necessary contraints for the people to be drawn without crossing any
    // lines.
    // Return `false` and doesn't modify anything (except maybe for leftmost) 
    // if this constraint cannot be added.
    function addLeftConstraint(aId, bId) {
        // We assume both aId and bId are on the same layer and that the parents have
        // already been laid out on the layers above.
        const layer = personsLayer[aId];
        let aConstraints = constraints[aId];
        let bConstraints = constraints[bId];
        // Check if we don't have any existing constraints on any of the nodes.
        if (aConstraints.left != null || bConstraints.right != null ||
            (leftmostOf(aId) == leftmostOf(bId))) {
            // TODO: Erase debug in the production version
            tools.log(bId + " to the left of " + aId + " is not possible because of their existing constraints");
            return false;
        }
        const aFamilies = dependentOnFamilies[aId];
        const bFamilies = dependentOnFamilies[bId];
        if (aFamilies.length > 0 && bFamilies.length > 0) {
            let aPotentialFamilies = aFamilies.filter((familyId) => areDirectNeighbours(model.familyParents(familyId)) && familyConstraints[familyId].leftmostChild == undefined);
            let bPotentialFamilies = bFamilies.filter((familyId) => areDirectNeighbours(model.familyParents(familyId)) && familyConstraints[familyId].rightmostChild == undefined);
            if (aPotentialFamilies.length == 0 ||
                bPotentialFamilies.length == 0) {
                return false;
            }
            // Arbitrarly pick the first family that we can attach the child as leftmost/rightmost.
            const aFamilyId = aPotentialFamilies[0];
            const bFamilyId = bPotentialFamilies[0];
            let aParentIds = model.familyParents(aFamilyId);
            let bParentIds = model.familyParents(bFamilyId);
            // Follow the left ascendant for node a.
            let aLeftParentId = leftmostOfSet(aParentIds);
            // Follow the right ascendant for node b.
            let bRightParentId = rightmostOfSet(bParentIds);
            // They must be on the same layer
            if (personsLayer[aLeftParentId] != personsLayer[bRightParentId]) {
                // TODO: Erase debug in the production version
                tools.log(bId + " to the left of " + aId + " is not possible because thier parents are in different layers");
                return false;
            }
            // We will need to draw the single parented children somewhere
            if (aParentIds.length > 1 && model.isSingleParent(aLeftParentId)) {
                // TODO: Erase debug in the production version
                tools.log(bId + " to the left of " + aId + " is not possible because " + aLeftParentId + " is a single parent");
                return false;
            }
            // We will need to draw the single parented children somewhere
            if (bParentIds.length > 1 && model.isSingleParent(bRightParentId)) {
                // TODO: Erase debug in the production version
                tools.log(bId + " to the left of " + aId + " is not possible because " + bRightParentId + " is a single parent");
                return false;
            }
            // Check if we can add a constraint between the ascendants. If yes, then we can add a constraint here as well.
            if (!addLeftConstraint(aLeftParentId, bRightParentId)) {
                // TODO: Erase debug in the production version
                tools.log(bId + " to the left of " + aId + " is not possible because the parents " + aLeftParentId + " and " + bRightParentId + " can't be joined.");
                return false;
            }
            familyConstraints[aFamilyId].leftmostChild = aId;
            familyConstraints[bFamilyId].rightmostChild = bId;
            constraints[aId].leftmostChildWithPartner = true;
        }
        return addSoftLeftConstraint(aId, bId);
    }
    for (const layer of layers) {
        // Finding constraints for people within the layer
        for (const id of layer) {
            for (const partnerId of model.partners(id)) {
                if (personsLayer[partnerId] != personsLayer[id]) {
                    continue;
                }
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
    }
    let layout = [];
    for (const _layer of layers) {
        layout.push([]);
    }
    let peopleInLayout = new Set();
    function familiesCompletedBy(personId) {
        tools.log("PERSON " + personId);
        let result = [];
        for (const familyId of model.parentOfFamilies(personId)) {
            const parentIds = model.familyParents(familyId);
            let completing = true;
            for (const parentId of parentIds) {
                tools.log("FAMILY: " + familyId);
                tools.log("PARENT: " + parentId);
                if (!peopleInLayout.has(parentId) && parentId != personId) {
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
            personId = constraints[personId].left;
        }
        return personId;
    }
    function pushPeopleIntoLayoutUntilPersonIsPushed(personId) {
        let pushed = [];
        let current = firstLeftNotInLayout(personId);
        while (current != personId) {
            if (peopleInLayout.has(current)) {
                current = constraints[current].right;
                continue;
            }
            const locator = pushPersonIntoLayout(current);
            pushed.push(locator);
            // INVARIANT: constraints[current].right must be a number, as
            // otherwise we wouldn't find it when using firstLeftNotInLayout.
            current = constraints[current].right;
        }
        const locator = pushPersonIntoLayout(personId);
        pushed.push(locator);
        while (constraints[personId].right != null) {
            personId = constraints[personId].right;
            if (peopleInLayout.has(personId)) {
                continue;
            }
            const locator = pushPersonIntoLayout(personId);
            pushed.push(locator);
        }
        return pushed;
    }
    function pushFamilyChildrenIntoLayout(familyId) {
        let pushed = [];
        let children = model.familyChildren(familyId);
        children.sort((a, b) => {
            if (a == familyConstraints[familyId].leftmostChild || b == familyConstraints[familyId].rightmostChild) {
                return -1;
            }
            if (a == familyConstraints[familyId].rightmostChild || b == familyConstraints[familyId].leftmostChild) {
                return 1;
            }
            return a - b;
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
        let familiesClassification = { 1: [], 2: [], ">2": [] };
        for (const familyId of familiesCompletedByCurrent) {
            let parentCount = model.familyParents(familyId).length;
            if (parentCount <= 2) {
                familiesClassification[parentCount].push(familyId);
            }
            else {
                familiesClassification[">2"].push(familyId);
            }
        }
        // TODO: Reserve depths per person and find first depth that is not reserved.
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
            singleParentFamilyNodes.push({ kind: "family", id: familyId, depth: 1, members: pushed });
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
        tools.log("Person " + personId);
        tools.log(familiesClassification);
        if (familiesClassification[2].length == 1 &&
            (previousPersonIdOrNull != null &&
                model.familyParents(familiesClassification[2][0]).includes(previousPersonIdOrNull))) {
            const partnerFamilyId = familiesClassification[2][0];
            let pushed = pushFamilyChildrenIntoLayout(partnerFamilyId);
            let partnerFamilyNode = { kind: "family", id: partnerFamilyId, depth: 0, members: pushed };
            if (previous.kind == "person" &&
                constraints[personId].leftmostChildWithPartner != undefined) {
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
            else if (previous.kind == "person") {
                layout[personsLayer[personId]].pop();
                const leftPartner = { kind: "person", id: previous.id, singleParentFamilies: previous.singleParentFamilies };
                const rightPartner = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes };
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
                const right = previous.right;
                right.kind = "person";
                right.multiParentFamilyNodes = previous.rightFamilyNodes;
                right.leftPartner = { personId: left.id, familyId: previous.family.id };
                const family = previous.family;
                // TODO: Consider placing partners close by as well  here.
                let personSingleNode = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, multiParentFamilyNodes: multiParentFamilyNodes, leftPartner: { personId: right.id, familyId: partnerFamilyId } };
                layout[personsLayer[personId]].push({ kind: "left-partner", person: left, family: family });
                layout[personsLayer[personId]].push({ kind: "left-partner", person: right, family: partnerFamilyNode });
                layout[personsLayer[personId]].push(personSingleNode);
            }
            else {
                partnerFamilyNode.depth = depth;
                multiParentFamilyNodes.push(partnerFamilyNode);
                let personSingleNode = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, multiParentFamilyNodes: multiParentFamilyNodes };
                layout[personsLayer[personId]].push(personSingleNode);
            }
        }
        else {
            for (const familyId of familiesClassification[2]) {
                let pushed = pushFamilyChildrenIntoLayout(familyId);
                let distantPartnerFamilyNode = { kind: "family", id: familyId, depth: depth, members: pushed };
                multiParentFamilyNodes.push(distantPartnerFamilyNode);
            }
            let personSingleNode = { kind: "person", id: personId, singleParentFamilies: singleParentFamilyNodes, multiParentFamilyNodes: multiParentFamilyNodes };
            layout[personsLayer[personId]].push(personSingleNode);
        }
        // We purposefuly return a locator, instead of the node itself. That's because nodes might change (e.g. due to partner merging), while positions always
        // indicate a node containing the specific person.
        return { layer: personsLayer[personId], position: layout[personsLayer[personId]].length - 1 };
    }
    // We first push the families that have no parents.
    for (const familyId in model.families) {
        if (model.familyParents(+familyId).length == 0) {
            let pushed = pushFamilyChildrenIntoLayout(+familyId);
            layout[0].push({ kind: "family", id: +familyId, depth: 0, members: pushed });
        }
    }
    tools.log("CONSTRIANSTS: ");
    tools.log(constraints);
    for (let layer of layers) {
        for (let personId of layer) {
            if (peopleInLayout.has(personId)) {
                continue;
            }
            pushPeopleIntoLayoutUntilPersonIsPushed(personId);
            // TODO: Pushsmarter
            for (const partnerId of model.partners(personId)) {
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
    // TODO: Get rid of debug log lines for production version.
    tools.log("Final layout:");
    tools.log(layout);
    // -------------------------- Placing people in correct places on the plane using the layer information and some heuristics --------------------------
    let layerBox = [];
    for (const _layer of layout) {
        layerBox.push(0);
    }
    const spaceBetweenLayers = 160.0;
    const spaceBetweenPeople = 300.0;
    const depthModifier = 50.0;
    function isEmptyFamily(familyNode) {
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
    function calculatePosition(node, boxStart, layer) {
        if (node.kind == "person") {
            tools.log("Calculating position for " + node.kind + " " + node.id + " " + boxStart + " on layer " + layer);
            if (personsPosition[node.id] != null) {
                tools.log("Cached");
                return boxStart;
            }
            let boxEnd = boxStart;
            let first = true;
            if (node.multiParentFamilyNodes != null) {
                for (const multiParentFamilyNode of node.multiParentFamilyNodes) {
                    if (first) {
                        first = false;
                    }
                    else {
                        boxEnd += spaceBetweenPeople;
                    }
                    boxEnd = calculatePosition(multiParentFamilyNode, boxEnd, layer);
                }
            }
            const actualBoxStart = boxEnd;
            for (const singleParentFamilyNode of node.singleParentFamilies) {
                if (first) {
                    first = false;
                }
                else {
                    boxEnd += spaceBetweenPeople;
                }
                boxEnd = calculatePosition(singleParentFamilyNode, boxEnd, layer);
            }
            personsPosition[node.id] = { x: (actualBoxStart + boxEnd) / 2, y: layer * spaceBetweenLayers };
            for (const singleParentFamilyNode of node.singleParentFamilies) {
                familyPosition[singleParentFamilyNode.id].x = personsPosition[node.id].x;
            }
            if (node.leftPartner != undefined) {
                const leftPartnerPosition = personsPosition[node.leftPartner.personId];
                familyPosition[node.leftPartner.familyId].x = (leftPartnerPosition.x + personsPosition[node.id].x) / 2;
            }
            tools.log("Done with " + node.kind + " " + node.id + " " + boxEnd);
            return boxEnd;
        }
        else if (node.kind == "left-partner") {
            tools.log("Calculating position for " + node.kind + " " + node.person.id + " " + boxStart + " on layer " + layer);
            let boxEnd = calculatePosition(node.person, boxStart, layer);
            if (!areEmptyFamilyNodes(node.person.singleParentFamilies) ||
                isEmptyFamily(node.family) ||
                node.family.members.length == 1) {
                boxEnd = boxEnd + spaceBetweenPeople;
            }
            boxEnd = calculatePosition(node.family, boxEnd, layer);
            tools.log("Done with " + node.kind + " " + node.person.id + " " + boxEnd);
            return boxEnd;
        }
        else if (node.kind == "partners") {
            tools.log("Calculating position for " + node.kind + " " + node.left.id + "," + node.right.id + " " + boxStart + " on layer " + layer);
            if (personsPosition[node.left.id] != null &&
                personsPosition[node.right.id] != null) {
                tools.log("Cached");
                return boxStart;
            }
            if (personsPosition[node.left.id] != null) {
                tools.log("Cached partially.");
                return calculatePosition(node.right, boxStart, layer);
            }
            if (personsPosition[node.right.id] != null) {
                tools.log("Cached partially.");
                return calculatePosition(node.left, boxStart, layer);
            }
            let boxEnd = boxStart;
            let first = true;
            for (const multiParentFamilyNode of node.leftFamilyNodes) {
                if (first) {
                    first = false;
                }
                else {
                    boxEnd += spaceBetweenPeople;
                }
                boxEnd = calculatePosition(multiParentFamilyNode, boxEnd, layer);
            }
            for (const multiParentFamilyNode of node.rightFamilyNodes) {
                if (first) {
                    first = false;
                }
                else {
                    boxEnd += spaceBetweenPeople;
                }
                boxEnd = calculatePosition(multiParentFamilyNode, boxEnd, layer);
            }
            const actualBoxStart = boxEnd;
            boxEnd = calculatePosition(node.left, boxEnd, layer);
            boxEnd = calculatePosition(node.family, boxEnd, layer);
            boxEnd = Math.max(boxEnd, boxStart + spaceBetweenPeople);
            boxEnd = calculatePosition(node.right, boxEnd, layer);
            personsPosition[node.left.id] = { x: (actualBoxStart + boxEnd) / 2 - spaceBetweenPeople / 2, y: layer * spaceBetweenLayers };
            personsPosition[node.right.id] = { x: (actualBoxStart + boxEnd) / 2 + spaceBetweenPeople / 2, y: layer * spaceBetweenLayers };
            familyPosition[node.family.id] = { x: (actualBoxStart + boxEnd) / 2, y: layer * spaceBetweenLayers };
            tools.log("Done with " + node.kind + " " + node.left.id + "," + node.right.id + " " + boxEnd);
            return boxEnd;
        }
        else if (node.kind == "family") {
            tools.log("Calculating position for " + node.kind + " " + node.id + " " + boxStart + " on layer " + layer + " depth " + node.depth);
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
                if (first) {
                    first = false;
                }
                else {
                    boxEnd += spaceBetweenPeople;
                }
                const memberNode = layout[member.layer][member.position];
                boxEnd = calculatePosition(memberNode, boxEnd, member.layer);
                tools.log("Setting layerBox " + member.layer + " " + boxEnd);
                layerBox[member.layer] = Math.max(layerBox[member.layer], boxEnd);
            }
            familyPosition[node.id] = { x: (boxStart + boxEnd) / 2, y: layer * spaceBetweenLayers + node.depth * depthModifier };
            tools.log("Done with " + node.kind + " " + node.id + " " + boxEnd + " y pos of family is " + familyPosition[node.id].y);
            return boxEnd;
        }
    }
    let biggestBoxEnd = 0;
    for (let i = 0; i < layout.length; i += 1) {
        const layoutLayer = layout[i];
        let boxEnd = layerBox[i];
        if (boxEnd > 0) {
            boxEnd = boxEnd + spaceBetweenPeople;
        }
        tools.log("Layer " + i + " boxEnd: " + boxEnd);
        for (const node of layoutLayer) {
            let newBoxEnd = calculatePosition(node, boxEnd, i);
            boxEnd = newBoxEnd + spaceBetweenPeople;
        }
        biggestBoxEnd = Math.max(boxEnd, biggestBoxEnd);
    }
    tools.log("Persons positions:");
    tools.log(personsPosition);
    tools.log("Families positions:");
    tools.log(familyPosition);
}
//# sourceMappingURL=layout.js.map