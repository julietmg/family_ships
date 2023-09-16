import * as config from "./config.js";
import * as model from "./model.js";
import * as layout from "./layout.js";
import * as scc from "./scc.js";

import * as utils from "./utils.js";

function printCopyablePersonsPositions() {
    let result = "{\n";
    let first = true;
    for (const personId in layout.personsPosition) {
        const pos = layout.personsPosition[personId];
        if (!first) { result += ",\n" } else { first = false; }
        result += personId + ": { x:" + pos.x + ", y:" + pos.y + " }";
    }
    result += "}";
    console.log(result);
}

function printCopyableFamilyPositions() {
    let result = "{\n";
    let first = true;
    for (const familyId in layout.familyPosition) {
        const pos = layout.familyPosition[familyId];
        if (!first) { result += ",\n" } else { first = false; }
        result += familyId + ": { x:" + pos.x + ", y:" + pos.y + " }";
    }
    result += "}";
    console.log(result);
}

if (config.test) {
    console.log("layout_test.ts: Starting [sccs]");
    model.reset();

    for (let i = 1; i <= 10; i += 1) {
        model.fakeNewPerson("name" + i);
    }

    async function addParentChildEdge(a: model.PersonId, b: model.PersonId) {
        let familyId = model.fakeNewFamily();
        model.fakeAttachParent(familyId, a);
        model.fakeAttachChild(familyId, b);
    }

    addParentChildEdge(1, 2);
    addParentChildEdge(2, 3);
    addParentChildEdge(3, 1);

    addParentChildEdge(3, 4);

    addParentChildEdge(4, 5);

    addParentChildEdge(5, 6);
    addParentChildEdge(6, 7);
    addParentChildEdge(7, 8);
    addParentChildEdge(8, 9);
    addParentChildEdge(9, 6);
    addParentChildEdge(7, 9);
    addParentChildEdge(9, 5);

    layout.recalculateLayerAssignment();

    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);

    console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 3, 6, 7, 8, 9, 10]))

    console.log("layout_test.ts: Finished [sccs]");
}

if (config.test) {
    console.log("layout_test.ts: Starting [nuclear]");
    model.reset();

    for (let i = 1; i <= 14; i += 1) {
        model.fakeNewPerson("name" + i);
    }

    // Parents: 1 2
    // Children: 3 4
    model.fakeNewFamily(); model.fakeAttachParent(1, 1); model.fakeAttachParent(1, 2);
    model.fakeAttachChild(1, 3);
    model.fakeAttachChild(1, 4);

    // Parents: 5 6
    // Children 7
    model.fakeNewFamily(); model.fakeAttachParent(2, 5); model.fakeAttachParent(2, 6);
    model.fakeAttachChild(2, 7);

    // Parents: 3 7
    // Children: 8
    model.fakeNewFamily(); model.fakeAttachParent(3, 3); model.fakeAttachParent(3, 7);
    model.fakeAttachChild(3, 8);

    // Parents: 7 11
    // Children 12
    model.fakeNewFamily(); model.fakeAttachParent(4, 7); model.fakeAttachParent(4, 11);
    model.fakeAttachChild(4, 12);

    // Parents: 8 12
    // Children 13
    model.fakeNewFamily(); model.fakeAttachParent(5, 8); model.fakeAttachParent(5, 12);
    model.fakeAttachChild(5, 13);

    // Parents: 10
    // Children 14
    model.fakeNewFamily(); model.fakeAttachParent(6, 10);
    model.fakeAttachChild(6, 14);

    // Parents: 13 14
    model.fakeNewFamily(); model.fakeAttachParent(7, 13); model.fakeAttachParent(7, 14);

    layout.recalculateLayerAssignment();

    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);
    // let sccs: Record<scc.SccId, Array<model.PersonId>> = {};
    // for (const personId in model.people) {
    //     if (sccs[scc.personsSccId[personId]] == undefined) {
    //         sccs[scc.personsSccId[personId]] = [];
    //     }
    //     sccs[scc.personsSccId[personId]].push(+personId);
    // }
    // console.log("sccs:");
    // console.log(sccs);
    // console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 5, 6, 9, 10]));
    // console.assert(utils.arraysEqual(layout.layers[1], [3, 4, 7, 11]));
    // console.assert(utils.arraysEqual(layout.layers[2], [8, 12]));
    // console.assert(utils.arraysEqual(layout.layers[3], [13, 14]));

    layout.recalculateConstraints();
    // console.log("constraints:");
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(0)));
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(1)));
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(2)));
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(3)));

    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(0), [[[1, 2], [5, 6]], [[9]], [[10]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(1), [[[3], [7, 11]], [[4]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(2), [[[8], [12]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(3), [[[13]], [[14]]]));


    layout.recalculateLayout();
    layout.recalculatePositions();

    // This might be useful to copy the output
    // printCopyablePersonsPositions();
    // printCopyableFamilyPositions();

    const expectedPersonsPosition: Record<model.PersonId, {x:number,y:number}> = {
        1: { x:0, y:0 },
        2: { x:300, y:0 },
        3: { x:300, y:200 },
        4: { x:0, y:200 },
        5: { x:1200, y:0 },
        6: { x:1500, y:0 },
        7: { x:1200, y:200 },
        8: { x:600, y:400 },
        9: { x:1800, y:0 },
        10: { x:2100, y:0 },
        11: { x:1500, y:200 },
        12: { x:1200, y:400 },
        13: { x:900, y:600 },
        14: { x:2100, y:600 }};
    const expectedFamilyPosition: Record<model.FamilyId, {x:number,y:number}> = {
        1: { x:150, y:0 },
        2: { x:1350, y:0 },
        3: { x:600, y:200 },
        4: { x:1350, y:200 },
        5: { x:900, y:400 },
        6: { x:2100, y:80 },
        7: { x:1200, y:600 }};
    for (const personId in layout.personsPosition) {
        console.assert(layout.personsPosition[+personId].x == expectedPersonsPosition[+personId].x &&
            layout.personsPosition[+personId].y == expectedPersonsPosition[+personId].y);
    }
    for (const familyId in layout.familyPosition) {
        console.assert(layout.familyPosition[+familyId].x == expectedFamilyPosition[+familyId].x &&
            layout.familyPosition[+familyId].y == expectedFamilyPosition[+familyId].y);
    }

    console.log("layout_test.ts: Finished [nuclear]");
}

if (config.test) {
    console.log("layout_test.ts: Starting [children ordering]");
    model.reset();

    for (let i = 1; i <= 7; i += 1) {
        model.fakeNewPerson("name" + i);
    }

    // Parents: 1 2
    // Children: 3
    model.fakeNewFamily(); model.fakeAttachParent(1, 1); model.fakeAttachParent(1, 2);
    model.fakeAttachChild(1, 3);

    // Parents: 2
    // Children 4
    model.fakeNewFamily(); model.fakeAttachParent(2, 2);
    model.fakeAttachChild(2, 4);

    // Parents: 5
    // Children: 6
    model.fakeNewFamily(); model.fakeAttachParent(3, 5);
    model.fakeAttachChild(3, 6);

    // Parents: 4 6
    // Children 7
    model.fakeNewFamily(); model.fakeAttachParent(4, 4); model.fakeAttachParent(4, 6);
    model.fakeAttachChild(4, 7);

    layout.recalculateLayerAssignment();

    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);
    // let sccs: Record<scc.SccId, Array<model.PersonId>> = {};
    // for (const personId in model.people) {
    //     if (sccs[scc.personsSccId[personId]] == undefined) {
    //         sccs[scc.personsSccId[personId]] = [];
    //     }
    //     sccs[scc.personsSccId[personId]].push(+personId);
    // }
    // console.log("sccs:");
    // console.log(sccs);
    // console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 5, 6, 9, 10]));
    // console.assert(utils.arraysEqual(layout.layers[1], [3, 4, 7, 11]));
    // console.assert(utils.arraysEqual(layout.layers[2], [8, 12]));
    // console.assert(utils.arraysEqual(layout.layers[3], [13, 14]));
    layout.recalculateConstraints();
    // console.log("constraints:");
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(0)));
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(1)));
    // console.log(layout.personsConstraints[1]);
    // console.log(layout.personsConstraints[2]);

    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(0), [[[1, 2], [5]]]));
    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(1), [[[3]], [[4], [6]]]));

    layout.recalculateLayout();
    layout.recalculatePositions();

    // This might be useful to copy the output
    // printCopyablePersonsPositions();
    // printCopyableFamilyPositions();

    const expectedPersonsPosition: Record<model.PersonId, {x:number,y:number}> = {
        1: { x:0, y:0 },
        2: { x:300, y:0 },
        3: { x:0, y:200 },
        4: { x:300, y:200 },
        5: { x:900, y:0 },
        6: { x:900, y:200 },
        7: { x:600, y:400 }};
    const expectedFamilyPosition: Record<model.FamilyId, {x:number,y:number}> = {
        1: { x:150, y:0 },
        2: { x:300, y:80 },
        3: { x:900, y:80 },
        4: { x:600, y:200 }};
    for (const personId in layout.personsPosition) {
        console.assert(layout.personsPosition[+personId].x == expectedPersonsPosition[+personId].x &&
            layout.personsPosition[+personId].y == expectedPersonsPosition[+personId].y);
    }
    for (const familyId in layout.familyPosition) {
        console.assert(layout.familyPosition[+familyId].x == expectedFamilyPosition[+familyId].x &&
            layout.familyPosition[+familyId].y == expectedFamilyPosition[+familyId].y);
    }

    console.log("layout_test.ts: Finished [children ordering]");
}

if (config.test) {
    console.log("layout_test.ts: Starting [families ordering]");
    model.reset();

    for (let i = 1; i <= 2; i += 1) {
        model.fakeNewPerson("name" + i);
    }

    // Parents: 1 2
    model.fakeNewFamily(); model.fakeAttachParent(1, 1); model.fakeAttachParent(1, 2);

    // Parents: 2
    model.fakeNewFamily(); model.fakeAttachParent(2, 2);

    layout.recalculateLayerAssignment();

    // This output might be useful when debugging this test.
    // console.log("layers:");
    // console.log(layout.layers);
    // let sccs: Record<scc.SccId, Array<model.PersonId>> = {};
    // for (const personId in model.people) {
    //     if (sccs[scc.personsSccId[personId]] == undefined) {
    //         sccs[scc.personsSccId[personId]] = [];
    //     }
    //     sccs[scc.personsSccId[personId]].push(+personId);
    // }
    // console.log("sccs:");
    // console.log(sccs);
    // console.assert(utils.arraysEqual(layout.layers[0], [1, 2, 5, 6, 9, 10]));
    // console.assert(utils.arraysEqual(layout.layers[1], [3, 4, 7, 11]));
    // console.assert(utils.arraysEqual(layout.layers[2], [8, 12]));
    // console.assert(utils.arraysEqual(layout.layers[3], [13, 14]));
    layout.recalculateConstraints();
    // console.log("constraints:");
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(0)));
    // console.log(utils.deepArrayToString(layout.layerConstraintsToArray(1)));
    // console.log(layout.personsConstraints[1]);
    // console.log(layout.personsConstraints[2]);

    console.assert(utils.arraysDeepEqual(layout.layerConstraintsToArray(0), [[[1, 2]]]));

    layout.recalculateLayout();
    layout.recalculatePositions();

     // This might be useful to copy the output
    //  printCopyablePersonsPositions();
    //  printCopyableFamilyPositions();
 
     const expectedPersonsPosition: Record<model.PersonId, {x:number,y:number}> = {
        1: { x:0, y:0 },
        2: { x:300, y:0 }};
     const expectedFamilyPosition: Record<model.FamilyId, {x:number,y:number}> = {
        1: { x:150, y:0 },
        2: { x:300, y:80 }};
     for (const personId in layout.personsPosition) {
         console.assert(layout.personsPosition[+personId].x == expectedPersonsPosition[+personId].x &&
             layout.personsPosition[+personId].y == expectedPersonsPosition[+personId].y);
     }
     for (const familyId in layout.familyPosition) {
         console.assert(layout.familyPosition[+familyId].x == expectedFamilyPosition[+familyId].x &&
             layout.familyPosition[+familyId].y == expectedFamilyPosition[+familyId].y);
     }

    console.log("layout_test.ts: Finished [families ordering]");
    // model.reset();
}