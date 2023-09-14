import * as model from "./model.js";
import * as reachability from "./reachability.js";
import * as scc from "./scc.js";
import { Deque } from "./deque.js";
export let personsPosition = {};
export let familyPosition = {};
// -------------------------- Assigning people to layers --------------------------
// Exported just for testing purposes
export let layers = [];
export let personsLayer = {};
// Exported just for testing purposes
export function recalculateLayerAssignment() {
    // Make sure all the necessary components are recalculated.
    scc.recalculate();
    // Algorithm lays out people with layers, starting with people with no parents.
    let peopleWithUnassignedLayer = new Set();
    for (const personId in model.people) {
        peopleWithUnassignedLayer.add(+personId);
    }
    layers = [];
    personsLayer = {};
    while (peopleWithUnassignedLayer.size > 0) {
        let considered = new Set();
        // Get people that are not yet laid out, but for whose
        // all parents are laid out.
        // If the parent is in the same strongly connected component, then
        // this doesn't disqualify a person from being considered. 
        // This is to avoid cycles in the parent-child graph ruining our layout algorithm.
        for (const personId of peopleWithUnassignedLayer) {
            let hasNonLaidOutParents = false;
            for (const parentId of model.parents(personId)) {
                if (peopleWithUnassignedLayer.has(parentId) &&
                    scc.personsSccId[parentId] != scc.personsSccId[personId]) {
                    hasNonLaidOutParents = true;
                    break;
                }
            }
            if (hasNonLaidOutParents) {
                continue;
            }
            // This is a special case, where we have families, that have no parents assigned. 
            // Children of those families should not appear in the first layer.
            if (model.childOfFamilies(personId).filter((familyId) => model.familyParents(familyId).length == 0).length > 0
                && layers.length == 0) {
                continue;
            }
            considered.add(personId);
        }
        if (considered.size == 0) {
            console.log("BUG: We couldn't neatly assing people to layers. Some people might be missing from the graph.");
            break;
        }
        const leftiousConsidered = new Set(considered);
        // We will now iterate throwing out people that have partners outside of the considered set.
        // This might require more than one iteration, so we repeat that process until there are no
        // more changes.
        // Basically a fixed point calculation.
        let changed = true;
        while (changed) {
            changed = false;
            // This ensures we are considering throwing out people only once in this pass.
            // That's because we process partners of a person together with the person being analysed.
            // Or to put into into other words, we process one whole `partnerCluster` at a time.
            let throwOutConsidered = new Set();
            // Make sure the partners of all people in the considered set are also considered.
            // If that's not the case, then delay adding them to a layer until all partners are added.
            for (const id of considered) {
                if (throwOutConsidered.has(id)) {
                    continue;
                }
                throwOutConsidered.add(id);
                let personPartners = model.partnerCluster(id);
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
                // We don't have to postpone adding the people to the layer
                // if they don't have any partners in the lower layers.
                if (lowerLayersPartners.size == 0) {
                    continue;
                }
                // TODO: There are better structure to answer reachability queries faster.
                // We have to avoid postponing adding people indefinitely, so we
                // explictly check for cycles.
                if (reachability.isAnyReachableFrom(consideredPartners, lowerLayersPartners)) {
                    continue;
                }
                for (const id of consideredPartners) {
                    changed = considered.delete(id) || changed;
                }
            }
        }
        // If we fail, we want to fail semi-gently, so we just go back to the assignment from 
        // before the process of throwing out people.
        if (considered.size == 0) {
            console.log("BUG: There is something weird with partner resolution.");
            considered = leftiousConsidered;
        }
        // considered now contains all the people that will appear in this layer.
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
}
export let personsBlock = {};
export let personsNode = {};
export function getBlockId(personId) {
    let block = personsBlock[personId];
    if (block.kind == "root") {
        return personId;
    }
    // Compress paths as we go.
    let result = getBlockId(block.with);
    block.with = result;
    return result;
}
export function getBlock(personId) {
    return personsBlock[getBlockId(personId)].block;
}
function mergeBlocks(firstPersonId, secondPersonId) {
    let firstBlockId = getBlockId(firstPersonId);
    let secondBlockId = getBlockId(secondPersonId);
    personsBlock[firstBlockId]
        .block.appendRight(personsBlock[secondBlockId].block);
    personsBlock[secondBlockId] = { kind: "merged", with: firstBlockId };
}
export let personsSlice = {};
export function sliceToArray(personId) {
    let result = [];
    const slice = getSlice(personId);
    let current = personsNode[slice.left];
    while (current != personsNode[slice.right].right) {
        result.push(current.value);
        current = current.right;
    }
    return result;
}
export function blockToSlicedArray(personId) {
    let result = [];
    let last = sliceToArray(personId);
    result.push(last);
    while (last.slice(-1)[0] != getBlock(personId).peekRight()) {
        last = sliceToArray(getBlock(personId).right(personsNode[last.slice(-1)[0]]).value);
        result.push(last);
    }
    return result;
}
export function getSliceId(personId) {
    let block = personsSlice[personId];
    if (block.kind == "root") {
        return personId;
    }
    // Compress paths as we go.
    let result = getSliceId(block.with);
    block.with = result;
    return result;
}
export function getSlice(personId) {
    return personsSlice[getSliceId(personId)].slice;
}
function mergeSlices(firstPersonId, secondPersonId) {
    let firstSliceId = getSliceId(firstPersonId);
    let secondSliceId = getSliceId(secondPersonId);
    personsSlice[firstSliceId].slice.right =
        (personsSlice[secondSliceId].slice.right);
    personsSlice[secondSliceId] = { kind: "merged", with: firstSliceId };
}
// Note that this is not necessarily defined for all families.
// Just for those for which the parents are in one slice.
export let familySlice = {};
export let personsConstraints = {};
export let familyAssignedChildren = {};
// This recursively reverses all the blocks this block depends on.
// TODO: Fix this! This should also reverse the child dependencies.
// export function reverseBlock(personId: model.PersonId) {
//     getBlock(personId).reverse();
//     let constraints = personsConstraints[personId];
//     if (constraints.parents != undefined) {
//         let family = familyConstraints[constraints.parents];
//         let tmpChild = family.leftChild;
//         family.leftChild = family.rightChild;
//         family.rightChild = tmpChild;
//         let parentsSlice = familyConstraints[constraints.parents];
//         // TODO: Different 
//         if (parentsSlice.parentsSlice != null) {
//             let tmpParent = parentsSlice.parentsSlice.left;
//             parentsSlice.parentsSlice.left = parentsSlice.parentsSlice.right;
//             parentsSlice.parentsSlice.right = tmpParent;
//             reverseBlock(parentsSlice.parentsSlice.left);
//         }
//     }
// }
export function recalculateConstraints() {
    familySlice = {};
    personsConstraints = {};
    familyAssignedChildren = {};
    personsBlock = {};
    personsNode = {};
    for (const personId in model.people) {
        let peopleInBlock = new Deque();
        let node = peopleInBlock.pushLeft(+personId);
        personsBlock[+personId] = { kind: "root", block: peopleInBlock };
        personsSlice[+personId] = { kind: "root", slice: { left: +personId, right: +personId } };
        personsNode[+personId] = node;
        personsConstraints[+personId] = {
            beginsFamilySlices: [],
            endsFamilySlices: []
        };
    }
    function areNeighbours(peopleIds) {
        let encounters = 0;
        let currentId = peopleIds.values().next().value;
        let personNode = personsNode[currentId];
        encounters += 1;
        let currentNode = personNode;
        // We don't care whether this is reversed or not in this case.
        while (currentNode.right != undefined && peopleIds.has(currentNode.right.value)) {
            currentNode = currentNode.right;
            encounters += 1;
        }
        currentNode = personNode;
        while (currentNode.left != undefined && peopleIds.has(currentNode.left.value)) {
            currentNode = currentNode.left;
            encounters += 1;
        }
        return encounters == peopleIds.size;
    }
    function calculateSliceAmongstNeighbouringSet(peopleIds) {
        let anyPerson = peopleIds.values().next().value;
        let currentNode = personsNode[anyPerson];
        let block = getBlock(anyPerson);
        // See if the parents have something to the right of them.
        while (block.right(currentNode) != undefined && peopleIds.has(block.right(currentNode).value)) {
            currentNode = block.right(currentNode);
        }
        let right = currentNode;
        // See if the parents have something to the left of them.
        currentNode = personsNode[anyPerson];
        while (block.left(currentNode) != undefined && peopleIds.has(block.left(currentNode).value)) {
            currentNode = block.left(currentNode);
        }
        let left = currentNode;
        return { left: left.value, right: right.value };
    }
    function findFamilySlice(familyId) {
        const parentIds = new Set(model.familyParents(familyId));
        if (areNeighbours(parentIds)) {
            return calculateSliceAmongstNeighbouringSet(parentIds);
        }
        return undefined;
    }
    // This attempts to find a set of parents that this child can be added as a dependency too.
    // It uses a set of heuristics.
    // This assumes, the layers above (parents of the person) already were attempted to be partner constrained.
    function findBestFamilyForPerson(personId) {
        let personsFamilies = model.childOfFamilies(personId).filter((familyId) => {
            const parentIds = model.familyParents(familyId);
            if (parentIds.length == 0) {
                return false;
            }
            let slice = familySlice[familyId];
            if (slice == undefined) {
                return true;
            }
            const familyLayer = personsLayer[slice.left];
            return familyLayer < personsLayer[personId];
        });
        if (personsFamilies.length == 0) {
            return undefined;
        }
        personsFamilies.sort((a, b) => {
            // We want to start by looking at two parent families
            if (model.families[a].parentIds.length == 2) {
                return -1;
            }
            if (model.families[b].parentIds.length == 2) {
                return 1;
            }
            return model.families[a].parentIds.length - model.families[b].parentIds.length;
        });
        // We first look for families, whose parents are neighbours and there are at least two parents.
        let neighbouringFamilies = personsFamilies.filter((familyId) => {
            return familySlice[familyId] != undefined;
        });
        if (neighbouringFamilies.length > 0) {
            return neighbouringFamilies.values().next().value;
        }
        return personsFamilies.values().next().value;
    }
    // Will attempt to add a constraint between two people, so that they are kept together in a layout.
    // Return `false` and doesn't modify anything if this constraint cannot be added.
    function attemptConstraint(firstPersonId, secondPersonId, onlyBlock) {
        if (firstPersonId == secondPersonId) {
            return true;
        }
        console.log("Attempting: " + firstPersonId + " " + secondPersonId);
        // We don't constrain partners across layers
        if (personsLayer[firstPersonId] != personsLayer[secondPersonId]) {
            console.log("layer bad");
            return false;
        }
        let firstBlock = getBlock(firstPersonId);
        let secondBlock = getBlock(secondPersonId);
        // We need to add the constraint. If it's already there, we fail.
        // This is to make sure that when children ask parents to be merged.
        // The merge actually happens. This way we know we have only one child
        // that is the candidate to be the person living on that edge.
        if (getBlockId(firstPersonId) == getBlockId(secondPersonId)) {
            console.log("same block, but not correct");
            return false;
        }
        if (firstBlock.peekRight() != firstPersonId) {
            console.log("first not edge " + firstBlock.toArray());
            return false;
        }
        if (secondBlock.peekLeft() != secondPersonId) {
            console.log("snd not edge");
            return false;
        }
        let firstConstraints = personsConstraints[firstPersonId];
        let secondConstraints = personsConstraints[secondPersonId];
        if (firstConstraints.assignedFamily != undefined && secondConstraints.assignedFamily != undefined) {
            let firstFamilySlice = familySlice[firstConstraints.assignedFamily];
            let secondFamilySlice = familySlice[secondConstraints.assignedFamily];
            if (firstFamilySlice == undefined) {
                console.log("left no parents slice");
                return false;
            }
            if (secondFamilySlice == undefined) {
                console.log("right no parents slice");
                return false;
            }
            // TODO: Verify there is no smaller slice with children.
            console.log(firstPersonId);
            console.log(firstFamilySlice);
            console.log(secondPersonId);
            console.log(secondFamilySlice);
            if (!attemptConstraint(firstFamilySlice.right, secondFamilySlice.left, "only-block")) {
                console.log("parents sad");
                return false;
            }
            // We need to mangle the begins and ends to ensure the slices are correctly ordered.
            personsConstraints[firstFamilySlice.right].endsFamilySlices =
                personsConstraints[firstFamilySlice.right].endsFamilySlices.
                    filter((a) => a != firstConstraints.assignedFamily)
                    .concat([firstConstraints.assignedFamily]);
            personsConstraints[secondFamilySlice.left].beginsFamilySlices =
                [secondConstraints.assignedFamily]
                    .concat(personsConstraints[secondFamilySlice.left].beginsFamilySlices
                    .filter((a) => a != secondConstraints.assignedFamily));
            mergeBlocks(firstPersonId, secondPersonId);
            // We cannot merge slices in this case.
            return true;
        }
        mergeBlocks(firstPersonId, secondPersonId);
        if (onlyBlock == undefined) {
            mergeSlices(firstPersonId, secondPersonId);
        }
        return true;
    }
    for (const layer of layers) {
        for (const personId of layer) {
            for (const familyId of model.childOfFamilies(personId)) {
                if (familySlice[familyId] != undefined) {
                    continue;
                }
                familySlice[familyId] = findFamilySlice(familyId);
                familyAssignedChildren[familyId] = [];
                let slice = familySlice[familyId];
                if (slice != null) {
                    personsConstraints[slice.left].beginsFamilySlices.push(familyId);
                    personsConstraints[slice.right].endsFamilySlices.push(familyId);
                }
            }
        }
        for (const personId of layer) {
            let bestFamilyForPerson = findBestFamilyForPerson(personId);
            if (bestFamilyForPerson != undefined) {
                personsConstraints[personId].assignedFamily = bestFamilyForPerson;
                familyAssignedChildren[bestFamilyForPerson].push(personId);
            }
        }
        for (const personId of layer) {
            for (const partnerId of model.partners(personId)) {
                // Try adding each partnership only once
                if (partnerId < personId) {
                    continue;
                }
                if (attemptConstraint(personId, partnerId)) {
                    continue;
                }
                if (attemptConstraint(partnerId, personId)) {
                    continue;
                }
                // TODO: Attempt block reversal
                // reverseBlock(personId);
                // if (attemptConstraint(personId, partnerId)) {
                //     continue;
                // }
                // if (attemptConstraint(partnerId, personId)) {
                //     continue;
                // }
                // reverseBlock(personId);
            }
            for (const familyId of model.parentOfFamilies(personId)) {
                if (model.familyChildren(familyId).length != 0) {
                    continue;
                }
                familySlice[familyId] = findFamilySlice(familyId);
                familyAssignedChildren[familyId] = [];
                let slice = familySlice[familyId];
                if (slice != null) {
                    personsConstraints[slice.left].beginsFamilySlices.push(familyId);
                    personsConstraints[slice.right].endsFamilySlices.push(familyId);
                }
            }
        }
    }
    let printed = new Set();
    for (const layer of layers) {
        for (const personId of layer) {
            const root = getBlockId(personId);
            if (printed.has(root)) {
                continue;
            }
            printed.add(root);
        }
    }
}
export function recalculate() {
    // // Reset the existing positions before recalculating
    personsPosition = {};
    familyPosition = {};
    recalculateLayerAssignment();
    recalculateConstraints();
    let layout = [];
    for (const _ in layers) {
        layout.push([]);
    }
    function lastPersonInLayout(layer) {
        if (layout[layer].length == 0) {
            return null;
        }
        function extractLastPersonFromLayoutNode(layoutNode) {
            if (lastLayoutNode.kind == "people") {
                return lastLayoutNode.partners.slice(-1)[0];
            }
            else {
                return null;
            }
        }
        const lastLayoutNode = layout[layer].slice(-1)[0];
        return extractLastPersonFromLayoutNode(lastLayoutNode);
    }
    let personsLayoutPosition = {};
    let familyLayoutPosition = {};
    function pushFamilyMembersIntoLayout(familyId) {
        let pushed = new Set();
        for (const childId of familyAssignedChildren[familyId]) {
            pushBlockIntoLayout(childId);
            pushed.add(personsLayoutPosition[childId]);
        }
        return pushed;
    }
    function pushPartnerSliceIntoLayout(begin, end) {
        let currentNode = personsNode[begin];
        let endNode = personsNode[end];
        let block = getBlock(begin);
        let finishedUnhookedFamilies = new Set();
        let partners = [];
        let singleParentFamilies = [];
        let partnerFamilies = [];
        let multiParentFamilies = {};
        let partnersSet = new Set();
        let familiesSet = new Set();
        // TODO: Track max depth per layer and increment the floating nodes from there.
        let depth = 2;
        let openMultiParentFamiliesDepths = {};
        while (currentNode != block.right(endNode)) {
            let currentId = currentNode.value;
            let constraints = personsConstraints[currentId];
            let singleParentFamiliesOfCurrent = [];
            let partnerFamiliesEndedByCurrent = [];
            let multiParentFamiliesEndedByCurrent = [];
            for (const familyId of constraints.beginsFamilySlices) {
                if (model.familyParents(familyId).length > 2) {
                    openMultiParentFamiliesDepths[familyId] = depth;
                    depth += 1;
                }
            }
            for (const familyId of constraints.endsFamilySlices) {
                let familyNode = { familyId: familyId, members: pushFamilyMembersIntoLayout(familyId) };
                if (model.familyParents(familyId).length == 1) {
                    singleParentFamiliesOfCurrent.push(familyNode);
                }
                else if (model.familyParents(familyId).length == 2) {
                    partnerFamiliesEndedByCurrent.push(familyNode);
                }
                else {
                    multiParentFamiliesEndedByCurrent.push({ family: familyNode, depth: depth });
                    delete openMultiParentFamiliesDepths[familyId];
                    depth -= 1;
                }
                familiesSet.add(familyId);
            }
            multiParentFamilies[currentId] = multiParentFamiliesEndedByCurrent;
            partnerFamilies[currentId] = partnerFamiliesEndedByCurrent;
            singleParentFamilies[currentId] = singleParentFamiliesOfCurrent;
            partners.push(currentNode.value);
            partnersSet.add(currentNode.value);
            for (const familyId of model.parentOfFamilies(currentNode.value)) {
                if (familyLayoutPosition[familyId] != undefined || familiesSet.has(familyId)) {
                    continue;
                }
                let completed = true;
                for (const parentId of model.familyParents(familyId)) {
                    if (personsLayoutPosition[parentId] == null && !partnersSet.has(parentId)) {
                        completed = false;
                        break;
                    }
                }
                if (!completed) {
                    continue;
                }
                finishedUnhookedFamilies.add(familyId);
            }
            currentNode = block.right(currentNode);
        }
        let lastPerson = lastPersonInLayout(personsLayer[begin]);
        for (const familyId of finishedUnhookedFamilies) {
            const nodeLayoutPosition = { layer: personsLayer[begin], position: layout[personsLayer[begin]].length };
            const parents = model.familyParents(familyId);
            let floatingFamilyNode = { kind: "family", family: { familyId: familyId, members: pushFamilyMembersIntoLayout(familyId) } };
            if (parents.length == 2 && parents.includes(lastPerson) && parents.includes(begin)) {
                floatingFamilyNode.depth = 0;
            }
            const floatingFamilyLayoutPosition = { layer: personsLayer[begin], position: layout[personsLayer[begin]].length };
            familyLayoutPosition[familyId] = floatingFamilyLayoutPosition;
            layout[personsLayer[begin]].push(floatingFamilyNode);
        }
        const resultNode = {
            kind: "people",
            partners: partners,
            singleParentFamilies: singleParentFamilies,
            partnerFamilies: partnerFamilies,
            multiParentFamilies: multiParentFamilies
        };
        const nodeLayoutPosition = { layer: personsLayer[begin], position: layout[personsLayer[begin]].length };
        for (const personId of partnersSet) {
            personsLayoutPosition[personId] = nodeLayoutPosition;
        }
        for (const familyId of familiesSet) {
            familyLayoutPosition[familyId] = nodeLayoutPosition;
        }
        layout[personsLayer[begin]].push(resultNode);
    }
    function pushSliceIntoLayout(begin, end) {
        let openFamilies = new Set();
        let currentNode = personsNode[begin];
        let endNode = personsNode[end];
        let block = getBlock(begin);
        let lastPartnerSliceStart = currentNode;
        while (currentNode != block.right(endNode)) {
            let currentId = currentNode.value;
            let constraints = personsConstraints[currentId];
            for (const familyId of constraints.beginsFamilySlices) {
                openFamilies.add(familyId);
            }
            for (const familyId of constraints.endsFamilySlices) {
                openFamilies.delete(familyId);
            }
            if (openFamilies.size == 0) {
                pushPartnerSliceIntoLayout(lastPartnerSliceStart.value, currentNode.value);
                lastPartnerSliceStart = block.right(currentNode);
            }
            currentNode = block.right(currentNode);
        }
    }
    function pushBlockIntoLayout(representativePersonId) {
        if (personsLayoutPosition[representativePersonId] != undefined) {
            return;
        }
        let block = getBlock(representativePersonId);
        pushSliceIntoLayout(block.peekLeft(), block.peekRight());
    }
    for (const layer of layers) {
        for (const personId of layer) {
            if (personsLayoutPosition[+personId] != undefined) {
                continue;
            }
            pushBlockIntoLayout(personId);
        }
    }
    // TODO: Get rid of debug log lines for production version.
    console.log("Final layout:");
    console.log(layout);
    // -------------------------- Placing people in correct places on the plane using the layer information and some heuristics --------------------------
    let layerBox = [];
    for (const _ of layout) {
        layerBox.push(0);
    }
    const spaceBetweenLayers = 200.0;
    const spaceBetweenPeople = 300.0;
    const depthFamilyBase = 60.0;
    const depthModifier = 20.0;
    const overlayOffset = 10.0;
    function calculatePositionForPerson(personId, boxStart) {
        console.log("calculatePositionForPerson " + personId + " " + boxStart);
        boxStart = Math.max(boxStart, layerBox[personsLayer[personId]]);
        personsPosition[personId] = { x: boxStart, y: spaceBetweenLayers * personsLayer[personId] };
        layerBox[personsLayer[personId]] = boxStart + spaceBetweenPeople;
        return boxStart + spaceBetweenPeople;
    }
    function calculatePositionForFamily(family, boxStart) {
        console.log("calculatePositionForFamily " + family.familyId + " " + boxStart);
        let boxEnd = boxStart;
        for (const node of family.members) {
            boxEnd = calculateLayoutNode(node, boxEnd);
        }
        return boxEnd;
    }
    // TODO: Fix calculation
    function calculatePosition(node, boxStart) {
        if (node.kind == "people") {
            let layer = personsLayer[node.partners[0]];
            let boxEnd = boxStart;
            for (const personId of node.partners) {
                for (const family of node.singleParentFamilies[personId]) {
                    let familyBoxStart = boxEnd;
                    boxEnd = calculatePositionForFamily(family, boxEnd);
                    let familyBoxEnd = boxEnd;
                    familyPosition[family.familyId] = {
                        x: (familyBoxStart + familyBoxEnd) / 2,
                        y: layer * spaceBetweenLayers
                    };
                }
                for (const familyWithDepth of node.multiParentFamilies[personId]) {
                    let familyBoxStart = boxEnd;
                    boxEnd = calculatePositionForFamily(familyWithDepth.family, boxEnd);
                    let familyBoxEnd = boxEnd;
                    let familyDepth = 0;
                    if (familyWithDepth.depth != undefined &&
                        familyWithDepth.depth > 0) {
                        familyDepth = depthFamilyBase + familyWithDepth.depth * depthModifier;
                    }
                    familyPosition[familyWithDepth.family.familyId] = {
                        x: (familyBoxStart + familyBoxEnd) / 2,
                        y: layer * spaceBetweenLayers + familyDepth
                    };
                }
                for (const family of node.partnerFamilies[personId]) {
                    boxEnd = calculatePositionForFamily(family, boxEnd);
                    // Family positions for partner families will be calculated after the parents are laid out
                }
            }
            let partnersBoxStart = (boxEnd + boxStart) / 2 - spaceBetweenPeople * node.partners.length / 2;
            partnersBoxStart = Math.max(partnersBoxStart, boxStart);
            let partnersBoxEnd = partnersBoxStart;
            console.log("PARTNERS BOX START: " + partnersBoxStart);
            for (const personId of node.partners) {
                partnersBoxEnd = calculatePositionForPerson(personId, partnersBoxEnd);
            }
            for (let i = 1; i < node.partners.length; i += 1) {
                let left = node.partners[i - 1];
                let right = node.partners[i];
                let position = {
                    x: (personsPosition[left].x + personsPosition[right].x) / 2, y: layer * spaceBetweenLayers
                };
                let offset = 0;
                for (const family of node.partnerFamilies[right]) {
                    familyPosition[family.familyId] = { x: position.x + offset, y: position.y + offset };
                    offset += overlayOffset;
                }
            }
            layerBox[layer] = Math.max(partnersBoxEnd, boxEnd);
            return layerBox[layer];
        }
        else if (node.kind == "family") {
            let layer = familyLayoutPosition[node.family.familyId].layer;
            let boxEnd = boxStart;
            boxEnd = calculatePositionForFamily(node.family, boxEnd);
            boxEnd = Math.max(boxStart + spaceBetweenPeople, boxEnd);
            let familyDepth = 0;
            if (node.depth != undefined &&
                node.depth > 0) {
                familyDepth = depthFamilyBase + node.depth * depthModifier;
            }
            familyPosition[node.family.familyId] = {
                x: (boxStart + boxEnd) / 2,
                y: layer * spaceBetweenLayers + familyDepth
            };
            layerBox[layer] = boxEnd;
            return layerBox[layer];
        }
    }
    function positionString(position) {
        return position.layer + " " + position.position;
    }
    let calculatedLayoutNodes = new Set();
    function calculateLayoutNode(position, boxStart) {
        console.log("Calculating for " + position.layer + " " + position.position + " " + boxStart);
        calculatedLayoutNodes.add(positionString(position));
        return calculatePosition(layout[position.layer][position.position], boxStart);
    }
    for (let i = 0; i < layout.length; i += 1) {
        const layoutLayer = layout[i];
        for (let j = 0; j < layoutLayer.length; j += 1) {
            let boxEnd = layerBox[i];
            let position = { layer: i, position: j };
            if (calculatedLayoutNodes.has(positionString(position))) {
                continue;
            }
            calculateLayoutNode(position, boxEnd);
        }
    }
    // TODO: This shouldn't be necessary.
    // let tmpX = 20;
    // for (const personId in model.people) {
    //     if (personsPosition[+personId] == undefined) {
    //         personsPosition[+personId] = { x: tmpX, y: 50 };
    //         tmpX += 30;
    //     }
    // }
    // for (const familyId in model.families) {
    //     if (familyPosition[+familyId] == undefined) {
    //         familyPosition[+familyId] = { x: tmpX, y: 50 };
    //         tmpX += 30;
    //     }
    // }
    console.log("Persons positions:");
    console.log(personsPosition);
    console.log("Families positions:");
    console.log(familyPosition);
}
//# sourceMappingURL=layout.js.map