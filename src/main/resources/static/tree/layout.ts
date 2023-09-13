import * as config from "./config.js";

import * as model from "./model.js";
import * as reachability from "./reachability.js";
import * as scc from "./scc.js";
import * as reversible_deque from "./reversible_deque.js";

type Position = {
    x: number
    y: number
}

export let personsPosition: Record<model.PersonId, Position> = {};
export let familyPosition: Record<model.FamilyId, Position> = {};


// -------------------------- Assigning people to layers --------------------------

// Exported just for testing purposes
export let layers: Array<Array<model.PersonId>> = [];
export let personsLayer: Record<model.PersonId, number> = {};

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
                    changed = considered.delete(id) || changed;
                }
            }
        }

        // If we fail, we want to fail semi-gently, so we just go back to the assignment from 
        // before the process of throwing out people.
        if (considered.size == 0) {
            console.log("BUG: There is something weird with partner resolution.")
            considered = leftiousConsidered;
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

export type Block = reversible_deque.ReversibleDeque<model.PersonId>;
export let personsBlock: Record<model.PersonId,
    { kind: "root", block: Block } |
    { kind: "merged", with: model.PersonId }> = {};
export let personsNode: Record<model.PersonId, reversible_deque.Node<model.PersonId>> = {};

export function getBlockId(personId: model.PersonId): model.PersonId {
    let block = personsBlock[personId];
    if (block.kind == "root") {
        return personId;
    }
    // Compress paths as we go.
    let result = getBlockId(block.with);
    block.with = result;
    return result;
}

export function getBlock(personId: model.PersonId): Block {
    return (personsBlock[getBlockId(personId)] as { kind: "root", block: Block }).block;
}

function mergeBlocks(firstPersonId: model.PersonId, secondPersonId: model.PersonId) {
    let firstBlockId = getBlockId(firstPersonId);
    let secondBlockId = getBlockId(secondPersonId);
    (personsBlock[firstBlockId] as { kind: "root", block: Block })
        .block.appendRight((personsBlock[secondBlockId] as { kind: "root", block: Block }).block);
    personsBlock[secondBlockId] = { kind: "merged", with: firstBlockId };
}

// Note that the parents slice doesn't necessarily contain all the family's parents
export type FamilyConstraints = {
    leftParent: model.PersonId
    rightParent: model.PersonId
    leftChild?: model.PersonId
    rightChild?: model.PersonId
}
export let familyConstraints: Record<model.FamilyId, FamilyConstraints> = {};

export type PersonsConstraints = {
    parents?: model.FamilyId
    beginOfFamilies: Array<model.FamilyId>
    endOfFamilies: Array<model.FamilyId>
}
export let personsConstraints: Record<model.PersonId, PersonsConstraints> = {};

export let familyAssignedChildren: Record<model.FamilyId, Array<model.PersonId>> = {};

// This recursively reverses all the blocks this block depends on.
// TODO: Fix this! This should also reverse the child dependencies.
export function reverseBlock(personId: model.PersonId) {
    getBlock(personId).reverse();
    let constraints = personsConstraints[personId];
    if (constraints.parents != undefined) {
        let family = familyConstraints[constraints.parents];
        let tmpChild = family.leftChild;
        family.leftChild = family.rightChild;
        family.rightChild = tmpChild;
        let parentsSlice = familyConstraints[constraints.parents];
        let tmpParent = parentsSlice.leftParent;
        parentsSlice.leftParent = parentsSlice.rightParent;
        parentsSlice.rightParent = tmpParent;
        reverseBlock(parentsSlice.leftParent);
    }
}

export function recalculateConstraints() {
    familyConstraints = {};
    personsConstraints = {};
    familyAssignedChildren = {};
    personsBlock = {};
    personsNode = {};

    for (const personId in model.people) {
        let peopleInBlock: reversible_deque.ReversibleDeque<model.PersonId> = new reversible_deque.ReversibleDeque();
        let node = peopleInBlock.pushLeft(+personId);
        personsBlock[+personId] = { kind: "root", block: peopleInBlock };
        personsNode[+personId] = node;
        personsConstraints[+personId] = { beginOfFamilies: [], endOfFamilies: [] };
    }

    function areNeighbours(peopleIds: Set<model.PersonId>): boolean {
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

    function calculateSliceAmongstNeighbouringSet(peopleIds: Set<model.PersonId>): { begin: model.PersonId, end: model.PersonId } {
        let anyPerson = peopleIds.values().next().value;
        let currentNode = personsNode[anyPerson];
        let block = getBlock(anyPerson);

        // See if the parents have something to the right of them.
        while (block.right(currentNode) != undefined && peopleIds.has(block.right(currentNode).value)) {
            currentNode = block.right(currentNode);
        }

        let end = currentNode;

        // See if the parents have something to the left of them.
        currentNode = personsNode[anyPerson];
        while (block.left(currentNode) != undefined && peopleIds.has(block.left(currentNode).value)) {
            currentNode = block.left(currentNode);
        }

        let begin = currentNode;
        return { begin: begin.value, end: end.value };
    }

    function findFamilySlice(familyId: model.FamilyId): FamilyConstraints {
        const parentIds = new Set(model.familyParents(familyId));
        if (areNeighbours(parentIds)) {
            let parentSlice = calculateSliceAmongstNeighbouringSet(parentIds);
            return { leftParent: parentSlice.begin, rightParent: parentSlice.end };
        }
        let anyParent = parentIds.values().next().value;
        return { leftParent: anyParent, rightParent: anyParent };
    }

    // This attempts to find a set of parents that this child can be added as a dependency too.
    // It uses a set of heuristics.
    // This assumes, the layers above (parents of the person) already were attempted to be partner constrained.
    function findBestFamilyForPerson(personId: model.PersonId): model.FamilyId | undefined {
        let personsFamilies = model.childOfFamilies(personId).filter((familyId) => {
            const parentIds = model.familyParents(familyId);
            if (parentIds.length == 0) {
                return false;
            }

            return personsLayer[familyConstraints[familyId].leftParent] < personsLayer[personId];
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
            return familyConstraints[familyId].leftParent != familyConstraints[familyId].rightParent;
        }
        );
        if (neighbouringFamilies.length > 0) {
            return neighbouringFamilies.values().next().value;
        }
        return personsFamilies.values().next().value;
    }

    // Will attempt to add a constraint between two people, so that they are kept together in a layout.
    // Return `false` and doesn't modify anything if this constraint cannot be added.
    function attemptConstraint(firstPersonId: model.PersonId, secondPersonId: model.PersonId): boolean {
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

        if (getBlockId(firstPersonId) == getBlockId(secondPersonId)) {
            if (firstBlock.right(personsNode[firstPersonId]) != undefined && firstBlock.right(personsNode[firstPersonId]).value == secondPersonId) {
                return true;
            }
            console.log("same block, but not correct");
            return false;
        }

        if (firstBlock.peekRight() != firstPersonId) {
            console.log("first not edge");

            return false;
        }

        if (secondBlock.peekLeft() != secondPersonId) {
            console.log("snd not edge");

            return false;
        }

        let firstConstraints = personsConstraints[firstPersonId];
        let secondConstraints = personsConstraints[secondPersonId];

        if (firstConstraints.parents != undefined && secondConstraints.parents != undefined) {
            let firstFamilyConstraint = familyConstraints[firstConstraints.parents];
            let secondFamilyConstraint = familyConstraints[secondConstraints.parents];

            if (firstFamilyConstraint.rightChild != undefined) {
                console.log("right child sad");
                return false;
            }

            if (secondFamilyConstraint.leftChild != undefined) {
                console.log("left child sad");
                return false;
            }

            if (!attemptConstraint(firstFamilyConstraint.rightParent, secondFamilyConstraint.leftParent)) {
                console.log("parents sad");
                return false;
            }
            mergeBlocks(firstPersonId, secondPersonId);
            firstFamilyConstraint.rightChild = firstPersonId;
            secondFamilyConstraint.leftChild = secondPersonId;
            return true;
        }
        if (firstConstraints.parents != undefined) {
            let firstFamilyConstraint = familyConstraints[firstConstraints.parents];
            if (firstFamilyConstraint.rightChild != undefined) {
                console.log("right child sad in single");
                return false;
            }
            mergeBlocks(firstPersonId, secondPersonId);
            firstFamilyConstraint.rightChild = firstPersonId;
            return true;
        }
        if (secondConstraints.parents != undefined) {
            let secondFamilyConstraint = familyConstraints[secondConstraints.parents];
            if (secondFamilyConstraint.leftChild != undefined) {
                console.log("left child sad in single");
                return false;
            }
            mergeBlocks(firstPersonId, secondPersonId);
            secondFamilyConstraint.leftChild = secondPersonId;
            return true;
        }
        mergeBlocks(firstPersonId, secondPersonId);
        return true;
    }

    for (const layer of layers) {
        for (const personId of layer) {
            for (const familyId of model.childOfFamilies(personId)) {
                if (familyConstraints[familyId] != undefined) {
                    continue;
                }
                familyConstraints[familyId] = findFamilySlice(familyId);
                familyAssignedChildren[familyId] = [];

                personsConstraints[familyConstraints[familyId].leftParent].beginOfFamilies.push(familyId);
                personsConstraints[familyConstraints[familyId].rightParent].endOfFamilies.push(familyId);
            }
        }
        for (const personId of layer) {
            let bestFamilyForPerson = findBestFamilyForPerson(personId);
            if (bestFamilyForPerson != undefined) {
                personsConstraints[personId].parents = bestFamilyForPerson;
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
                familyConstraints[familyId] = findFamilySlice(familyId);
                familyAssignedChildren[familyId] = [];

                personsConstraints[familyConstraints[familyId].leftParent].beginOfFamilies.push(familyId);
                personsConstraints[familyConstraints[familyId].rightParent].endOfFamilies.push(familyId);
            }
        }
    }

    let printed: Set<model.PersonId> = new Set();
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

    // // -------------------------- Sorting people in each layer according to the collected constraints --------------------------

    type FamilyLayoutNode = {
        kind: "family"
        id: number
        depth: number
        members: Array<{ layer: number, position: number }>
    }

    type PersonLayoutNode = {
        kind: "person"
        id: number
        singleParentFamilies: Array<FamilyLayoutNode>
    }


    type LayoutNode = FamilyLayoutNode | PersonLayoutNode

    let layout: Array<Array<LayoutNode>> = [];
    for (const _ in layers) {
        layout.push([]);
    }

    let personPushedIntoLayout: Set<model.PersonId> = new Set();

    function pushFamilyIntoLayout(familyId: model.FamilyId): FamilyLayoutNode {
        let pushed: Array<{ layer: number, position: number }> = [];
        let familyConstraint = familyConstraints[familyId];
        if (familyConstraint.leftChild != undefined) {
            pushed = pushed.concat(pushPersonIntoLayout(familyConstraint.leftChild));
        }
        for (const childId of familyAssignedChildren[familyId]) {
            if (childId == familyConstraint.rightChild) {
                continue;
            }
            pushed = pushed.concat(pushPersonIntoLayout(childId));
        }
        if (familyConstraint.rightChild != undefined) {
            pushed = pushed.concat(pushPersonIntoLayout(familyConstraint.rightChild));
        }
        return { kind: "family", id: familyId, depth: 1, members: pushed };
    }

    function pushSliceIntoLayout(begin: model.PersonId, end: model.PersonId): Array<{ layer: number, position: number }> {
        let pushed = [];
        let openFamilies: Set<model.FamilyId> = new Set();
        let beginNode = personsNode[begin];
        let endNode = personsNode[end];

        let block = getBlock(begin);

        let familyNodes: Array<FamilyLayoutNode> = [];
        let peopleNodes: Array<PersonLayoutNode> = [];
        while (beginNode != block.right(endNode)) {
            if (personPushedIntoLayout.has(beginNode.value)) {
                continue;
            }
            let currentId = beginNode.value;
            let constraints = personsConstraints[currentId];
            for (const familyId of constraints.beginOfFamilies) {
                openFamilies.add(familyId);
            }
            for (const familyId of constraints.endOfFamilies) {
                let familyNode = pushFamilyIntoLayout(familyId);
                // TODO:
                layout[personsLayer[begin]].push(familyNode);
                pushed.push({ layer: personsLayer[begin], position: layout[personsLayer[begin]].length - 1 });
                familyNodes.push(familyNode);
                openFamilies.delete(familyId);
            }

            layout[personsLayer[begin]].push({ kind: "person", id: currentId, singleParentFamilies: [] });
            pushed.push({ layer: personsLayer[begin], position: layout[personsLayer[begin]].length - 1 });
            personPushedIntoLayout.add(currentId);
            beginNode = block.right(beginNode);
        }
        return pushed;
    }


    function pushPersonIntoLayout(personId: model.PersonId): Array<{ layer: number, position: number }> {
        if (personPushedIntoLayout.has(personId)) {
            return [];
        }
        let block = getBlock(personId);
        return pushSliceIntoLayout(block.peekLeft(), block.peekRight());
    }

    for (const layer of layers) {
        for (const personId of layer) {
            if (personPushedIntoLayout.has(personId)) {
                continue;
            }
            pushPersonIntoLayout(personId);
        }
    }

    // TODO: Get rid of debug log lines for production version.
    console.log("Final layout:");
    console.log(layout);

    // -------------------------- Placing people in correct places on the plane using the layer information and some heuristics --------------------------

    let layerBox: Array<number> = [];
    for (const _ of layout) {
        layerBox.push(0);
    }

    const spaceBetweenLayers = 200.0;
    const spaceBetweenPeople = 300.0;
    const depthFamilyBase = 60.0;
    const depthModifier = 20.0;

    function isEmptyFamily(familyNode: FamilyLayoutNode) {
        return familyNode.members.length == 0;
    }

    function areEmptyFamilyNodes(familyNodes: Array<FamilyLayoutNode>) {
        for (const familyNode of familyNodes) {
            if (!isEmptyFamily(familyNode)) {
                return false;
            }
        }
        return true;
    }

    function calculatePosition(node: LayoutNode, boxStart: number, layer: number): number {
        if (node.kind == "person") {
            console.log("Calculating position for " + node.kind + " " + node.id + " " + boxStart + " on layer " + layer);
            if (personsPosition[node.id] != null) {
                console.log("Cached");
                return boxStart;
            }

            let boxEnd = boxStart;
            let first = true;
            const actualBoxStart = boxEnd;
            for (const singleParentFamilyNode of node.singleParentFamilies) {
                if (first) { first = false; } else { boxEnd += spaceBetweenPeople; }
                boxEnd = calculatePosition(singleParentFamilyNode, boxEnd, layer);
            }
            personsPosition[node.id] = { x: (actualBoxStart + boxEnd) / 2, y: layer * spaceBetweenLayers };
            for (const singleParentFamilyNode of node.singleParentFamilies) {
                familyPosition[singleParentFamilyNode.id].x = personsPosition[node.id].x;
            }
            console.log("Done with " + node.kind + " " + node.id + " " + boxEnd);
            return boxEnd;
        } else if (node.kind == "family") {
            console.log("Calculating position for " + node.kind + " " + node.id + " " + boxStart + " on layer " + layer + " depth " + node.depth);

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
                boxEnd = calculatePosition(memberNode, boxEnd, member.layer);
                console.log("Setting layerBox " + member.layer + " " + boxEnd);
                layerBox[member.layer] = Math.max(layerBox[member.layer], boxEnd);
            }
            const depth = depthFamilyBase + node.depth * depthModifier;
            familyPosition[node.id] = { x: (boxStart + boxEnd) / 2, y: layer * spaceBetweenLayers + depth };
            console.log("Done with " + node.kind + " " + node.id + " " + boxEnd + " y pos of family is " + familyPosition[node.id].y);

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
        console.log("Layer " + i + " boxEnd: " + boxEnd);
        for (const node of layoutLayer) {
            let newBoxEnd = calculatePosition(node, boxEnd, i);

            boxEnd = newBoxEnd + spaceBetweenPeople;

        }
        biggestBoxEnd = Math.max(boxEnd, biggestBoxEnd);
    }

    // TODO: This shouldn't be necessary.
    let tmpX = 20;
    for (const personId in model.people) {
        if (personsPosition[+personId] == undefined) {
            personsPosition[+personId] = { x: tmpX, y: 50 };
            tmpX += 30;
        }
    }


    for (const familyId in model.families) {
        if (familyPosition[+familyId] == undefined) {
            familyPosition[+familyId] = { x: tmpX, y: 50 };
            tmpX += 30;
        }
    }

    console.log("Persons positions:");
    console.log(personsPosition);

    console.log("Families positions:");
    console.log(familyPosition);
}