import * as config from "./config.js";

import * as model from "./model.js";
import * as reachability from "./reachability.js";
import * as scc from "./scc.js";
import * as utils from "./utils.js";
import { Deque, Node } from "./deque.js";
import { tree } from "d3";

type Position = {
    x: number
    y: number
}

export let personsPosition: Record<model.PersonId, Position> = {};
export let familyPosition: Record<model.FamilyId, Position> = {};
export let familyChildrenLinkOffset: Record<model.FamilyId, number> = {};

export function recalculate() {
    // Recalculation of positions operates in 4 phases, each encapsulated in a funtion.
    // The functions communicate with global variables.
    recalculateLayerAssignment();
    recalculateConstraints();
    recalculateLayout();
    recalculatePositions();
}

// -------------------------- Assigning people to layers --------------------------

export let layers: Array<Array<model.PersonId>> = [];
export let personsLayer: Record<model.PersonId, number> = {};

// TODO: Consider assiging the layer more dynamically, with a union find approach.

// Exported just for testing purposes
export function recalculateLayerAssignment() {
    // Make sure all the necessary components are recalculated.
    scc.recalculate();

    // Algorithm lays out people with layers, starting with people with no parents.
    let peopleWithUnassignedLayer: Set<model.PersonId> = new Set();
    for (const personId in model.people) {
        peopleWithUnassignedLayer.add(+personId);
    }

    layers = [];
    personsLayer = {};

    while (peopleWithUnassignedLayer.size > 0) {
        let considered: Set<model.PersonId> = new Set();

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
            console.log("BUG: We couldn't neatly assing people to layers. Some people might be missing from the graph.")
            break;
        }

        const previousConsidered = new Set(considered);

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
                let lowerLayersPartners: Set<number> = new Set();

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
                    // TODO: Consider attempting to synchronise the whole trees.
                    changed = considered.delete(id) || changed;
                }
            }
        }

        // If we fail, we want to fail semi-gently, so we just go back to the assignment from 
        // before the process of throwing out people.
        if (considered.size == 0) {
            console.log("BUG: There is something weird with partner resolution.")
            considered = previousConsidered;
        }

        // considered now contains all the people that will appear in this layer.
        let layer: Array<model.PersonId> = [];
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


// -------------------------- Calculating new constraints between people and grouping the layers with them --------------------------

export type Block = Deque<model.PersonId>;
export let personsBlock: Record<model.PersonId,
    { kind: "root", block: Block } |
    { kind: "merged", with: model.PersonId }> = {};
export let personsNode: Record<model.PersonId, Node<model.PersonId>> = {};

export function getBlockId(blockRepresentantId: model.PersonId): model.PersonId {
    let block = personsBlock[blockRepresentantId];
    if (block.kind == "root") {
        return blockRepresentantId;
    }
    // Compress paths as we go.
    let result = getBlockId(block.with);
    block.with = result;
    return result;
}

export function getBlock(blockRepresentantId: model.PersonId): Block {
    return (personsBlock[getBlockId(blockRepresentantId)] as { kind: "root", block: Block }).block;
}

function mergeBlocks(firstBlockRepresentantId: model.PersonId, secondBlockRepresentantId: model.PersonId) {
    let firstBlockId = getBlockId(firstBlockRepresentantId);
    let secondBlockId = getBlockId(secondBlockRepresentantId);
    (personsBlock[firstBlockId] as { kind: "root", block: Block })
        .block.appendRight((personsBlock[secondBlockId] as { kind: "root", block: Block }).block);
    personsBlock[secondBlockId] = { kind: "merged", with: firstBlockId };
}

export type Slice = {
    left: model.PersonId, right: model.PersonId
}
export let personsSlice: Record<model.PersonId,
    { kind: "root", slice: Slice } |
    { kind: "merged", with: model.PersonId }> = {};

export function getSliceId(sliceRepresentantId: model.PersonId): model.PersonId {
    let block = personsSlice[sliceRepresentantId];
    if (block.kind == "root") {
        return sliceRepresentantId;
    }
    // Compress paths as we go.
    let result = getSliceId(block.with);
    block.with = result;
    return result;
}

export function getSlice(sliceRepresentantId: model.PersonId): Slice {
    return (personsSlice[getSliceId(sliceRepresentantId)] as { kind: "root", slice: Slice }).slice;
}

function mergeSlices(firstSliceRepresenantId: model.PersonId, secondSliceRepresentantId: model.PersonId) {
    let firstSliceId = getSliceId(firstSliceRepresenantId);
    let secondSliceId = getSliceId(secondSliceRepresentantId);
    (personsSlice[firstSliceId] as { kind: "root", slice: Slice }).slice.right =
        ((personsSlice[secondSliceId] as { kind: "root", slice: Slice }).slice.right);
    personsSlice[secondSliceId] = { kind: "merged", with: firstSliceId };
}


export function sliceToArray(sliceRepresentantId: model.PersonId): Array<model.PersonId> {
    let result: Array<model.PersonId> = [];
    const slice = getSlice(sliceRepresentantId);
    let current = personsNode[slice.left];
    while (current != personsNode[slice.right].right) {
        result.push(current.value);
        current = current.right;
    }
    return result;
}

export function slicesInBlock(blockRepresentantId: model.PersonId): Array<model.PersonId> {
    let result = [];
    const block = getBlock(blockRepresentantId);
    let last = block.peekLeft();
    result.push(last);
    last = getSlice(last).right;
    while (last != block.peekRight()) {
        last = block.right(personsNode[last]).value;
        last = getSlice(last).right;
        result.push(last);
    }
    return result;
}

export function layerConstraintsToArray(layerIndex: model.PersonId): Array<Array<Array<model.PersonId>>> {
    function blockToSlicedArray(blockRepresentantId: model.PersonId): Array<Array<model.PersonId>> {
        let result = [];
        for (const sliceRepresentantId of slicesInBlock(blockRepresentantId)) {
            result.push(sliceToArray(sliceRepresentantId));
        }
        return result;
    }

    let result = [];
    let blocksAdded: Set<model.PersonId> = new Set();
    const layer = layers[layerIndex];
    for (const personId of layer) {
        let blockId = getBlockId(personId);
        if (blocksAdded.has(blockId)) {
            continue;
        }
        result.push(blockToSlicedArray(blockId));
        blocksAdded.add(blockId);
    }
    return result;
}

export type PersonsConstraints = {
    // This is null if the person does not belong tos any family.
    assignedFamily?: model.FamilyId
    beginsFamilySlices: Array<model.FamilyId>
    endsFamilySlices: Array<model.FamilyId>
    lockedChild: boolean
}

export let personsConstraints: Record<model.PersonId, PersonsConstraints> = {};
export let familyAssignedChildren: Record<model.FamilyId, Array<model.PersonId>> = {};

export function recalculateConstraints() {
    // Note that this is not necessarily defined for all families.
    // Just for those for which the parents are in one slice.
    let familySlice: Record<model.FamilyId, Slice> = {};
    familySlice = {};
    personsConstraints = {};
    familyAssignedChildren = {};
    personsBlock = {};
    personsNode = {};

    for (const personId in model.people) {
        let peopleInBlock: Deque<model.PersonId> = new Deque();
        let node = peopleInBlock.pushLeft(+personId);
        personsBlock[+personId] = { kind: "root", block: peopleInBlock };
        personsSlice[+personId] = { kind: "root", slice: { left: +personId, right: +personId } };
        personsNode[+personId] = node;
        personsConstraints[+personId] = {
            beginsFamilySlices: [],
            endsFamilySlices: [],
            lockedChild: false
        };
    }

    for (const familyId in model.families) {
        familyAssignedChildren[+familyId] = [];
    }

    function reverseBlock(blockRepresentantId: model.PersonId) {
        function collectThingsToReverse(startBlockId: model.PersonId, blocks: Set<model.PersonId>, families: Set<model.FamilyId>) {
            if (blocks.has(startBlockId)) {
                return;
            }
            blocks.add(startBlockId);
            for (const sliceId of slicesInBlock(startBlockId)) {
                const peopleInSlice = sliceToArray(sliceId);
                for (const personId of peopleInSlice) {
                    const familyId = personsConstraints[personId].assignedFamily;
                    if (familyId == undefined) {
                        continue;
                    }
                    const slice = familySlice[familyId];
                    if (slice == undefined) {
                        continue;
                    }
                    families.add(familyId);
                    collectThingsToReverse(getBlockId(slice.left), blocks, families);
                }
                for (const personId of peopleInSlice) {
                    for (const familyId of personsConstraints[personId].beginsFamilySlices) {
                        for (const personId of familyAssignedChildren[familyId]) {
                            collectThingsToReverse(getBlockId(personId), blocks, families);
                        }
                    }
                    for (const familyId of personsConstraints[personId].endsFamilySlices) {
                        for (const personId of familyAssignedChildren[familyId]) {
                            collectThingsToReverse(getBlockId(personId), blocks, families);
                        }
                    }
                }
            }
        }
        let dependentBlocks: Set<model.PersonId> = new Set();
        let dependentFamilies: Set<model.FamilyId> = new Set();
        collectThingsToReverse(getBlockId(blockRepresentantId), dependentBlocks, dependentFamilies);
        for (let blockId of dependentBlocks) {
            for (const sliceId of slicesInBlock(blockId)) {
                for (const personId of sliceToArray(sliceId)) {
                    let tmp = personsConstraints[personId].beginsFamilySlices;
                    personsConstraints[personId].beginsFamilySlices = personsConstraints[personId].endsFamilySlices;
                    personsConstraints[personId].endsFamilySlices = tmp;
                }
                let slice = getSlice(sliceId);
                const tmp = slice.left;
                slice.left = slice.right;
                slice.right = tmp;
            }
            getBlock(blockId).reverse();
        }
        for (let familyId of dependentFamilies) {
            const tmp = familySlice[familyId].left;
            familySlice[familyId].left = familySlice[familyId].right;
            familySlice[familyId].right = tmp;
            familyAssignedChildren[familyId].reverse();
        }
    }



    function areNeighbours(peopleIds: Set<model.PersonId>): boolean {
        // Check if they are in the same slice?
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

    function areInTheSameSlice(peopleIds: Set<model.PersonId>): boolean {
        if (peopleIds.size == 0) {
            return true;
        }
        const sliceId = getSliceId(peopleIds.values().next().value);
        for (const personId of peopleIds) {
            if (getSliceId(personId) != sliceId) {
                return false;
            }
        }
        return true;
    }

    function calculateSliceAmongstNeighbouringSet(peopleIds: Set<model.PersonId>): Slice {
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

    function findFamilySlice(familyId: model.FamilyId): Slice {
        const parentIds = new Set(model.familyParents(familyId));
        if (areNeighbours(parentIds)) {
            return calculateSliceAmongstNeighbouringSet(parentIds);
        }
        return undefined;
    }

    // This attempts to find a set of parents that this child can be added as a dependency too.
    // It uses a set of heuristics.
    // This assumes, the layers above (parents of the person) already were attempted to be partner constrained.
    function findBestFamilyForPerson(personId: model.PersonId): model.FamilyId | undefined {
        let personsFamilies = model.childOfFamilies(personId).filter((familyId) => {
            const parentIds = model.familyParents(familyId);
            if (parentIds.length == 0) {
                return true;
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
            // We want to start by looking at two parent families and ignore no parent families if possible
            if (model.families[a].parentIds.length == 2 || model.families[b].parentIds.length == 0) {
                return -1;
            }
            if (model.families[b].parentIds.length == 2 || model.families[a].parentIds.length == 0) {
                return 1;
            }
            return model.families[a].parentIds.length - model.families[b].parentIds.length;
        });

        // We first look for families, whose parents are neighbours and there are at least two parents.
        let neighbouringFamilies = personsFamilies.filter((familyId) => {
            return familySlice[familyId] != undefined;
        }
        );
        if (neighbouringFamilies.length > 0) {
            return neighbouringFamilies.values().next().value;
        }
        return personsFamilies.values().next().value;
    }

    // Will attempt to add a constraint between two people, so that they are kept together in a layout.
    // Return `false` and doesn't modify anything if this constraint cannot be added.
    function attemptConstraint(firstPersonId: model.PersonId, secondPersonId: model.PersonId, onlyBlock?: "only-block"): boolean {
        if (firstPersonId == secondPersonId) {
            return true;
        }
        if (config.debug) { console.log("Attempting to constrain [" + firstPersonId + "," + secondPersonId + "]"); }
        // We don't constrain partners across layers
        if (personsLayer[firstPersonId] != personsLayer[secondPersonId]) {
            if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: different layer"); }
            return false;
        }

        let firstBlock = getBlock(firstPersonId);
        let secondBlock = getBlock(secondPersonId);

        // We need to add the constraint. If it's already there, we fail.
        // This is to make sure that when children ask parents to be merged.
        // The merge actually happens. This way we know we have only one child
        // that is the candidate to be the person living on that edge.
        if (getBlockId(firstPersonId) == getBlockId(secondPersonId)) {
            if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: already in the same block"); }
            return false;
        }

        if (firstBlock.peekRight() != firstPersonId) {
            if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: " + firstPersonId + " is not at the right edge of the block"); }
            return false;
        }

        if (secondBlock.peekLeft() != secondPersonId) {
            if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: " + secondPersonId + " is not at the left edge of the block"); }
            return false;
        }

        let firstConstraints = personsConstraints[firstPersonId];
        let secondConstraints = personsConstraints[secondPersonId];

        if (firstConstraints.assignedFamily != undefined && secondConstraints.assignedFamily != undefined) {
            let firstFamilySlice = familySlice[firstConstraints.assignedFamily];
            let secondFamilySlice = familySlice[secondConstraints.assignedFamily];

            if (firstFamilySlice == undefined) {
                if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: family " + firstConstraints.assignedFamily + " has no parents slice."); }
                return false;
            }

            if (secondFamilySlice == undefined) {
                if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: family " + firstConstraints.assignedFamily + " has no parents slice."); }
                return false;
            }

            for (const familyId of personsConstraints[firstFamilySlice.right].endsFamilySlices) {
                if (familyAssignedChildren[familyId].length < familyAssignedChildren[firstConstraints.assignedFamily].length) {
                    if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: link would collide with other for the person on the left."); }
                    return false;
                }
            }

            for (const familyId of personsConstraints[secondFamilySlice.left].beginsFamilySlices) {
                if (familyAssignedChildren[familyId].length < familyAssignedChildren[secondConstraints.assignedFamily].length) {
                    if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: link would collide with other for the person on the right."); }
                    return false;
                }
            }

            if (firstConstraints.lockedChild && familyAssignedChildren[firstConstraints.assignedFamily].slice(-1)[0] != firstPersonId) {
                if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: " + firstPersonId + " is already locked in place and can't be moved to the end of its family."); }
                return false;
            }

            if (secondConstraints.lockedChild && familyAssignedChildren[secondConstraints.assignedFamily][0] != secondPersonId) {
                if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: " + secondPersonId + " is already locked in place and can't be moved to the beginning of its family."); }
                return false;
            }

            if (!attemptConstraint(firstFamilySlice.right, secondFamilySlice.left, "only-block")) {
                if (config.debug) { console.log("Can't constrain [" + firstPersonId + "," + secondPersonId + "]: parents cannot be constrained."); }
                return false;
            }
            firstConstraints.lockedChild = true;
            secondConstraints.lockedChild = true;

            // We need to mangle the begins and ends to ensure the family slices are correctly ordered.
            // And the appropriate family will be drawn first/last
            personsConstraints[firstFamilySlice.right].endsFamilySlices =
                personsConstraints[firstFamilySlice.right].endsFamilySlices.
                    filter((a) => a != firstConstraints.assignedFamily)
                    .concat([firstConstraints.assignedFamily]);
            personsConstraints[secondFamilySlice.right].endsFamilySlices =
                [secondConstraints.assignedFamily]
                    .concat(personsConstraints[secondFamilySlice.right].endsFamilySlices
                        .filter((a) => a != secondConstraints.assignedFamily));

            // We also need to mangle the children of the family to ensure the proper person is at the end/beginning
            familyAssignedChildren[firstConstraints.assignedFamily] =
                familyAssignedChildren[firstConstraints.assignedFamily].filter((a) => a != firstPersonId)
                    .concat([firstPersonId]);
            familyAssignedChildren[secondConstraints.assignedFamily] =
                [secondPersonId].concat(familyAssignedChildren[secondConstraints.assignedFamily].filter((a) => a != secondPersonId));

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
            let bestFamilyForPerson = findBestFamilyForPerson(personId);
            if (bestFamilyForPerson != undefined) {
                personsConstraints[personId].assignedFamily = bestFamilyForPerson;
                // We need to sort the begins and ends, so that we don't cross lines
                // while drawing children
                personsConstraints[personId].beginsFamilySlices.sort((a, b) =>
                    model.familyParents(a).length - model.familyParents(b).length);
                personsConstraints[personId].endsFamilySlices.sort((a, b) =>
                    model.familyParents(b).length - model.familyParents(a).length);
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
                // Note that this is pretty costly, as we possible traverse the whole tree
                // We could avoid doing it multiple times, but there is no need to do that now
                // as things seem to work fast enough.
                reverseBlock(personId);
                if (attemptConstraint(personId, partnerId)) {
                    continue;
                }
                if (attemptConstraint(partnerId, personId)) {
                    continue;
                }
                reverseBlock(personId);
            }
            for (const familyId of model.parentOfFamilies(personId)) {
                if (familySlice[+familyId] != undefined) {
                    continue;
                }
                familySlice[+familyId] = findFamilySlice(+familyId);
                let slice = familySlice[+familyId];
                if (slice != null) {
                    personsConstraints[slice.left].beginsFamilySlices.push(+familyId);
                    personsConstraints[slice.right].endsFamilySlices.push(+familyId);
                }
            }
        }
    }

    if (config.debug) {
        console.log("Final constraints:")
        for (const layerId in layers) {
            console.log(utils.deepArrayToString(layerConstraintsToArray(+layerId)));
        }
    }
}

// -------------------------- Sorting people in each layer according to the collected constraints --------------------------

type LayoutPosition = {
    layer: number
    position: number
}

type FamilyLayoutInformation = {
    familyId: model.FamilyId
    members: Array<LayoutPosition>
    depth: number | "partner" | "single"
}

// A node representing a group of peope where each person is a partner with the previous one in some family
type PeopleLayoutNode = {
    kind: "people"
    partners: Array<model.PersonId>
    // Indicates the beginning index (in partners) of the first perosn in this family
    families: Record<model.PersonId, Array<FamilyLayoutInformation>>
}

// This is just a plain family node, floating between other layout nodes.
// Depths of floating family layout nodes are calculated on in the separate pass.
// Unless the floating family happens to be exactly between two parents.
type FloatingFamilyLayoutNode = {
    kind: "family"
    family: FamilyLayoutInformation
}

type LayoutNode = PeopleLayoutNode | FloatingFamilyLayoutNode

export let layout: Array<Array<LayoutNode>> = [];
export let familyLayoutPosition: Record<model.FamilyId, LayoutPosition> = {};

export function recalculateLayout() {
    layout = [];
    let personsLayoutPosition: Record<model.PersonId, { kind: "layout", position: LayoutPosition } | {
        kind: "considered"
    }> = {};
    familyLayoutPosition = {};
    let familyDepthInLayer: Array<Record<model.FamilyId, number>> = [];

    for (const _ in layers) {
        layout.push([]);
        familyDepthInLayer.push({});
    }

    let parentlessFamiliesInLayer: Array<Array<model.FamilyId>> = [];
    for (const _ of layers) {
        parentlessFamiliesInLayer.push([]);
    }
    for (const familyId in model.families) {
        if (model.familyParents(+familyId).length > 0) {
            continue;
        }
        let layer = Math.min(...model.familyChildren(+familyId).map((childId) => personsLayer[childId])) - 1;
        if (layer == undefined || layer < 0 || layer >= layers.length) {
            layer = 0;
        }
        parentlessFamiliesInLayer[layer].push(+familyId);
    }

    function lastPersonInLayoutLayer(layer: number): model.PersonId | null {
        if (layout[layer].length == 0) {
            return null;
        }
        function extractLastPersonFromLayoutNode(layoutNode: LayoutNode): model.PersonId | null {
            if (lastLayoutNode.kind == "people") {
                return lastLayoutNode.partners.slice(-1)[0];
            } else {
                return null;
            }
        }
        const lastLayoutNode = layout[layer].slice(-1)[0];
        return extractLastPersonFromLayoutNode(lastLayoutNode);
    }

    function pushFamilyMembersIntoLayout(familyId: model.FamilyId): Array<LayoutPosition> {
        let pushed: Array<LayoutPosition> = [];
        for (const childId of familyAssignedChildren[familyId]) {
            pushSliceIntoLayout(childId);
            let childLayoutPosition = personsLayoutPosition[childId];
            if (childLayoutPosition.kind != "considered") {
                pushed.push(childLayoutPosition.position);
            }
        }
        return pushed;
    }

    function pushSliceIntoLayout(sliceId: model.PersonId) {
        if (personsLayoutPosition[sliceId] != undefined) {
            return;
        }
        // We make sure to only visit slices once.
        personsLayoutPosition[sliceId] = { kind: "considered" };
        let slice = getSlice(sliceId);
        const layer = personsLayer[slice.left];

        let finishedUnhookedFamilies: Array<{ familyId: model.FamilyId, depth: number }> = [];
        let finishedFamiliesWithinSlice: Record<model.PersonId, Array<{ familyId: model.FamilyId, depth: number | "partner" | "single" }>> = {};

        let partners: Array<model.PersonId> = [];
        let families: Array<Array<{ family: model.FamilyId, depth: number | "partner" | "single" }>> = [];

        let partnersSet: Set<model.PersonId> = new Set();
        let familiesSet: Set<model.FamilyId> = new Set();

        let openFamilies: Set<model.FamilyId> = new Set();

        let slicePeople = sliceToArray(sliceId);
        for (const index in slicePeople) {
            const currentId = slicePeople[index];
            finishedFamiliesWithinSlice[currentId] = [];
            let constraints = personsConstraints[currentId];
            let familiesOfCurrent: Array<{ family: model.FamilyId, depth: number | "partner" | "single" }> = [];

            for (const familyId of model.parentOfFamilies(currentId)) {
                if (familyDepthInLayer[layer][familyId] == undefined) {
                    if (model.familyParents(familyId).length == 2 && +index + 1 < slicePeople.length &&
                        model.familyParents(familyId).includes(slicePeople[+index + 1])) {
                    } else if (model.familyParents(familyId).length == 1) {
                    } else {
                        familyDepthInLayer[layer][familyId] = Object.keys(familyDepthInLayer[layer]).length;
                    }
                }
            }

            for (const familyId of constraints.beginsFamilySlices) {
                openFamilies.add(familyId);
            }

            for (const familyId of constraints.endsFamilySlices) {
                // This means that the family is a cross slice family and will be handled
                // as an unhooked family.
                if (!openFamilies.has(familyId)) {
                    continue;
                }
                if (model.familyParents(familyId).length == 2 && +index - 1 >= 0 &&
                    model.familyParents(familyId).includes(slicePeople[+index - 1])) {
                    familiesOfCurrent.push({ family: familyId, depth: "partner" });
                } else if (model.familyParents(familyId).length == 1) {
                    familiesOfCurrent.push({ family: familyId, depth: "single" });
                } else {
                    familiesOfCurrent.push({ family: familyId, depth: familyDepthInLayer[layer][familyId] + 2});
                    delete familyDepthInLayer[layer][familyId];
                }
                familiesSet.add(familyId);
                openFamilies.delete(familyId);
            }
            families[currentId] = familiesOfCurrent;
            partners.push(currentId);
            partnersSet.add(currentId);
            for (const familyId of model.parentOfFamilies(currentId)) {
                if (familyLayoutPosition[familyId] != undefined || familiesSet.has(familyId)) {
                    continue;
                }
                let completed = true;
                let withinSlice = true;
                for (const parentId of model.familyParents(familyId)) {
                    if ((personsLayoutPosition[parentId] == null || personsLayoutPosition[parentId].kind == "considered") &&
                        !partnersSet.has(parentId)) {
                        completed = false;
                        break;
                    }
                    if (!partnersSet.has(parentId)) {
                        withinSlice = false;
                    }
                }
                if (!completed) {
                    continue;
                }
                if (withinSlice) {
                    finishedFamiliesWithinSlice[currentId].push({ familyId: familyId, depth: familyDepthInLayer[layer][familyId] });
                }
                else {
                    finishedUnhookedFamilies.push({ familyId: familyId, depth: familyDepthInLayer[layer][familyId] });
                }
                delete familyDepthInLayer[layer][familyId];
            }
        }

        let lastPerson = lastPersonInLayoutLayer(layer);
        for (const familyInfo of finishedUnhookedFamilies) {
            const familyId = familyInfo.familyId;
            const depth = familyInfo.depth;
            const nodeLayoutPosition: LayoutPosition = { layer: layer, position: layout[layer].length };
            const parents = model.familyParents(familyId);
            let floatingFamilyNode: FloatingFamilyLayoutNode = { kind: "family", family: { familyId: familyId, members: pushFamilyMembersIntoLayout(familyId), depth: depth } };
            if (parents.length == 2 && parents.includes(lastPerson) && parents.includes(slice.left)) {
                floatingFamilyNode.family.depth = "partner";
            }
            // TODO: Attach it to ther person on the right?
            const floatingFamilyLayoutPosition: LayoutPosition = { layer: layer, position: layout[layer].length };
            familyLayoutPosition[familyId] = floatingFamilyLayoutPosition;
            layout[layer].push(floatingFamilyNode);
        }

        let familyNodes: Record<model.PersonId, Array<FamilyLayoutInformation>> = {};

        const firstPersonId = slicePeople[0];
        familyNodes[firstPersonId] = families[firstPersonId].map((familyInfo) => {
            return { familyId: familyInfo.family, members: pushFamilyMembersIntoLayout(familyInfo.family), depth: familyInfo.depth };
        }).concat(finishedFamiliesWithinSlice[firstPersonId].map((familyInfo) => {
            return { familyId: familyInfo.familyId, members: pushFamilyMembersIntoLayout(familyInfo.familyId), depth: familyInfo.depth };
        }
        ));

        for (const personId of slicePeople) {
            familyNodes[personId] = finishedFamiliesWithinSlice[personId].map((familyInfo) => {
                return { familyId: familyInfo.familyId, members: pushFamilyMembersIntoLayout(familyInfo.familyId), depth: familyInfo.depth };
            }
            ).concat(families[personId].map((familyInfo) => {
                return { familyId: familyInfo.family, members: pushFamilyMembersIntoLayout(familyInfo.family), depth: familyInfo.depth };
            }
            ));
        }
        const resultNode: PeopleLayoutNode = {
            kind: "people",
            partners: partners,
            families: familyNodes
        }
        const nodeLayoutPosition: LayoutPosition = { layer: layer, position: layout[layer].length };
        for (const personId of partnersSet) {
            personsLayoutPosition[personId] = { kind: "layout", position: nodeLayoutPosition };
        }
        for (const familyId of familiesSet) {
            familyLayoutPosition[familyId] = nodeLayoutPosition;
        }

        layout[layer].push(resultNode);
    }

    function pushBlockIntoLayout(representativePersonId: model.PersonId) {
        for (const sliceId of slicesInBlock(representativePersonId)) {
            pushSliceIntoLayout(sliceId);
        }
    }

    for (const layerIndex in layers) {
        const layer = layers[layerIndex];
        for (const personId of layer) {
            // Iterate through people in the
            pushBlockIntoLayout(personId);
        }
        for (const parentlessFamilyId of parentlessFamiliesInLayer[layerIndex]) {
            const nodeLayoutPosition: LayoutPosition = { layer: +layerIndex, position: layout[layerIndex].length };
            layout[layerIndex].push({ kind: "family", family: { familyId: parentlessFamilyId, members: pushFamilyMembersIntoLayout(parentlessFamilyId), depth: 2 } });
            familyLayoutPosition[parentlessFamilyId] = nodeLayoutPosition;
        }
    }

    if (config.debug) {
        console.log("Final layout:");
        console.log(layout);
    }
}

// -------------------------- Placing people in correct places on the plane using the layer information and some heuristics --------------------------

export const spaceBetweenLayers = 200.0;
export const spaceBetweenPeople = 300.0;
export const depthFamilyBase = 60.0;
export const depthModifier = 15.0;
export const overlayOffset = 10.0;

export function recalculatePositions() {
    // Reset the existing positions before recalculating
    personsPosition = {};
    familyPosition = {};

    let layerBox: Array<number> = [];
    let nextLayoutNodeToDrawOnLayer: Array<number> = [];
    for (const _ of layout) {
        layerBox.push(0);
        nextLayoutNodeToDrawOnLayer.push(0);
    }

    function calculatePositionForPerson(personId: model.PersonId, suggestedBoxStart: number): [number, number] {
        if (config.debug) { console.log("Starting person " + personId + ": " + suggestedBoxStart + " [" + layerBox[personsLayer[personId]] + "]"); }
        const boxStart = Math.max(suggestedBoxStart, layerBox[personsLayer[personId]]);
        personsPosition[personId] = { x: boxStart, y: spaceBetweenLayers * personsLayer[personId] };
        layerBox[personsLayer[personId]] = boxStart + spaceBetweenPeople;
        if (config.debug) { console.log("Ending person " + personId + ": " + boxStart + " [" + layerBox[personsLayer[personId]] + "]"); }
        return [boxStart, boxStart];
    }

    function calculatePositionForFamilyMembers(members: Array<LayoutPosition>, boxStart: number): [number, number] {
        if (config.debug) {
            console.log("Starting family members " + utils.deepArrayToString(members.map((a) => a.layer + " " + a.position)) + ": " + boxStart);
        }
        if (members.length == 0) {
            return [boxStart, boxStart];
        }
        let firstMemberBox = calculateLayoutNode(members[0], boxStart);
        let realBoxStart = firstMemberBox[0];
        let boxEnd = firstMemberBox[1];
        for (const node of members.slice(1)) {
            boxEnd = calculateLayoutNode(node, boxEnd)[1];
        }
        if (config.debug) {
            console.log("Ending family members " + utils.deepArrayToString(members.map((a) => a.layer + " " + a.position)) + ": " + realBoxStart + " " + boxEnd);
        }
        return [realBoxStart, boxEnd];
    }


    function calculatePosition(node: LayoutNode, suggestedBoxStart: number): [number, number] {
        if (node.kind == "people") {
            if (config.debug) {
                console.log("Starting people node " + utils.deepArrayToString(node.partners) + ": " + suggestedBoxStart);
            }
            let layer = personsLayer[node.partners[0]];
            let boxEnd = suggestedBoxStart;
            let realBoxStart: number | null = null;
            for (const personIndex in node.partners) {
                const personId = node.partners[personIndex];
                for (const familyNode of node.families[personId]) {
                    if (realBoxStart != null) {
                        // We don't want the children to be too far away from parents
                        boxEnd = Math.max(boxEnd, realBoxStart + (+personIndex - model.familyParents(familyNode.familyId).length + 1) * spaceBetweenPeople);
                    }
                    const familyBox = calculatePositionForFamilyMembers(familyNode.members, boxEnd);
                    if (realBoxStart == null) { realBoxStart = familyBox[0]; }
                    boxEnd = familyBox[1];
                    // This is to ensure that partner family children will be roughly underneath the relevant partner
                    // in case people in this partnership have not that many kids.
                    let familyDepth = 0;
                    if (familyNode.depth == "single") {
                        familyDepth = depthFamilyBase + depthModifier;
                    } else if (familyNode.depth == "partner") {
                        familyDepth = 0
                    } else {
                        familyDepth = depthFamilyBase + familyNode.depth * depthModifier;
                    }
                    familyPosition[familyNode.familyId] = {
                        x: (familyBox[0] + familyBox[1]) / 2,
                        y: layer * spaceBetweenLayers + familyDepth
                    };
                }
            }
            if (realBoxStart == null) { realBoxStart = suggestedBoxStart; }
            let partnersBoxStart = (realBoxStart + boxEnd) / 2 - (spaceBetweenPeople * (node.partners.length - 1)) / 2;
            partnersBoxStart = Math.max(partnersBoxStart, realBoxStart);
            let partnersBoxEnd = partnersBoxStart;

            let first = true;
            for (const personId of node.partners) {
                if (!first) { partnersBoxEnd += spaceBetweenPeople; } else { first = false; }
                partnersBoxEnd = calculatePositionForPerson(personId, partnersBoxEnd)[1];
            }

            for (let i = 1; i < node.partners.length; i += 1) {
                let left = node.partners[i - 1];
                let right = node.partners[i];
                let position = {
                    x: (personsPosition[left].x + personsPosition[right].x) / 2, y:
                        layer * spaceBetweenLayers
                };
                let offset = 0;
                for (const family of node.families[right]) {
                    if (family.depth != "partner") {
                        continue;
                    }
                    familyPosition[family.familyId] = { x: position.x + offset, y: position.y };
                    offset += overlayOffset;
                }
            }
            boxEnd = Math.max(boxEnd, partnersBoxEnd);

            layerBox[layer] = boxEnd + spaceBetweenPeople;
            if (config.debug) {
                console.log("Ending people node " + utils.deepArrayToString(node.partners) + ": " + boxEnd);
            }
            return [realBoxStart, boxEnd];
        } else if (node.kind == "family") {
            if (config.debug) {
                console.log("Starting family node " + node.family.familyId + ": " + suggestedBoxStart);
            }
            let layer = familyLayoutPosition[node.family.familyId].layer;
            let familyBox = calculatePositionForFamilyMembers(node.family.members, suggestedBoxStart);
            let familyDepth = 0;
            if (node.family.depth == "single") {
                familyDepth = depthFamilyBase + depthModifier;
            } else if (node.family.depth == "partner") {
                familyDepth = 0
            } else {
                familyDepth = depthFamilyBase + node.family.depth * depthModifier;
            }
            familyPosition[node.family.familyId] = {
                x: (familyBox[0] + familyBox[1]) / 2,
                y: layer * spaceBetweenLayers + familyDepth
            };
            layerBox[layer] = familyBox[1] + spaceBetweenPeople;
            if (config.debug) {
                console.log("Ending family node " + node.family.familyId + ": " + familyBox[0] + " " + familyBox[1]);
            }
            return familyBox;
        }
    }

    function calculateLayoutNode(position: LayoutPosition, suggestedBoxStart: number): [number, number] {
        if (config.debug) {
            console.log("Starting node " + position.layer + " " + position.position + ": " + suggestedBoxStart + " [" + layerBox[position.layer] + " ]");
        }
        if (position.position < nextLayoutNodeToDrawOnLayer[position.layer]) {
            console.log("BUG: This was already drawn.")
            return [suggestedBoxStart, suggestedBoxStart];
        }
        while (nextLayoutNodeToDrawOnLayer[position.layer] < position.position) {
            const backfillPosition = { layer: position.layer, position: nextLayoutNodeToDrawOnLayer[position.layer] };
            if (config.debug) {
                console.log("Backfilling " + backfillPosition.layer + " " + backfillPosition.position + ": " + layerBox[position.layer]);
            }
            calculatePosition(layout[backfillPosition.layer][backfillPosition.position], layerBox[position.layer]);
            nextLayoutNodeToDrawOnLayer[position.layer] = nextLayoutNodeToDrawOnLayer[position.layer] + 1;
        }
        layerBox[position.layer] = Math.max(layerBox[position.layer], suggestedBoxStart);
        let boxStart = layerBox[position.layer];
        if (config.debug) {
            console.log("Calculating " + position.layer + " " + position.position + ": " + boxStart);
        }
        let box = calculatePosition(layout[position.layer][position.position], boxStart);
        nextLayoutNodeToDrawOnLayer[position.layer] = position.position + 1;
        if (config.debug) {
            console.log("Ending node " + position.layer + " " + position.position + ": " + box[0] + " " + box[1]);
        }
        return box;
    }

    for (let i = 0; i < layout.length; i += 1) {
        const layoutLayer = layout[i];
        for (let j = nextLayoutNodeToDrawOnLayer[i]; j < layoutLayer.length; j += 1) {
            let boxEnd = layerBox[i];
            let position = { layer: i, position: j };
            calculateLayoutNode(position, boxEnd);
        }
    }

    // TODO: This shouldn't be necessary.
    let tmpX = 20;
    for (const personId in model.people) {
        if (personsPosition[+personId] == undefined) {
            console.log("BUG: No data for person with id " + personId);
            personsPosition[+personId] = { x: tmpX, y: 50 };
            tmpX += 30;
        }
    }


    for (const familyId in model.families) {
        if (familyPosition[+familyId] == undefined) {
            console.log("BUG: No data for family with id " + familyId);
            familyPosition[+familyId] = { x: tmpX, y: 50 };
            familyChildrenLinkOffset[familyId] = 0;
            tmpX += 30;
        }
    }

    if (config.debug) {
        console.log("Persons positions:");
        console.log(personsPosition);

        console.log("Families positions:");
        console.log(familyPosition);
    }


}

