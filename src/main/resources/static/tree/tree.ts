import * as d3 from "d3";
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import * as tools from "./tools.js";
import * as model from "./model.js";
import * as layout from "./layout.js";

// Showcase the icons that we have in the debug mode.
if (tools.debug()) {
    function showDebugIcon(path: string) {
        const iconSvg = d3.select("body").append("svg")
            .attr("width", 200)
            .attr("height", 100);

        const g = iconSvg.append("g")
            .attr("transform",
                "translate(" + 20 + "," + 20 + ")")
        g.append("text").text(path);
        g.append("image")
            .attr("xlink:href", path)
            .attr("x", () => 10)
            .attr("y", () => 10)
            .attr("width", () => 30)
            .attr("height", () => 30);
    }
    showDebugIcon("icons/add_person.svg");
    showDebugIcon("icons/delete_person.svg");
    showDebugIcon("icons/delete.svg");
    showDebugIcon("icons/heart_minus.svg");
    showDebugIcon("icons/heart.svg");
    showDebugIcon("icons/person_off.svg");
    showDebugIcon("icons/child_bottle.svg");
    showDebugIcon("icons/add_parent.svg");
    showDebugIcon("icons/partner.svg");
    showDebugIcon("icons/save.svg");
}

// -------------------------- Add new person button --------------------------

// const addPersonSvg = d3.select("body").append("svg")
//     .attr("width", 100)
//     .attr("height", 100).append("g").append("image")
//     .attr("xlink:href", "icons/add_person.svg")
//     .attr("x", () => 10)
//     .attr("y", () => 10)
//     .attr("width", () => 80)
//     .attr("height", () => 80)
//     .on("click", async (event, d) => {
//         const newPersonId = await model.newPerson("Name");
//         tools.log("Added a new person " + newPersonId);
//         await updateAll();
//     });

const svg = d3.select("body").append("svg")
    .attr("width", "100%")
    .attr("height", "100%").style("background", "#e5deca");;

svg.call(d3.zoom()
    .on('zoom', (e) => {
        d3.select('svg g')
            .attr('transform', e.transform);
    }));

const g = svg.append("g");

// -------------------------- Data points that trigger draws --------------------------

let personNodes: Array<number> = [];
let familyNodes: Array<number> = [];
let parentLinks: Array<{ parentId: number, familyId: number }> = [];
let childrenLinks: Array<{ childId: number, familyId: number }> = [];

async function updateData() {
    await model.reload();
    layout.recalculate();

    familyNodes = [];
    for (const familyId in model.families) {
        familyNodes.push(+familyId);
    }

    personNodes = [];
    for (const personId in model.people) {
        personNodes.push(+personId);
    }

    parentLinks = [];
    for (const personId in model.people) {
        for (const familyId of model.parentOfFamilies(+personId)) {
            parentLinks.push({ parentId: +personId, familyId: familyId });
        }
    }

    childrenLinks = [];
    for (const personId in model.people) {
        for (const familyId of model.childOfFamilies(+personId)) {
            childrenLinks.push({ childId: +personId, familyId: familyId });
        }
    }
}

let peopleToDrawDeleteButtonOn = new Set();
let familiesToDrawButtonsOn = new Set();

// -------------------------- Tweakable constants for drawing things --------------------------

const personBoxSize = { width: 150, height: 80 };

const familyBoxSize = { width: 28, height: 28 };
const familyIconSize = { width: 24, height: 24 };
const familyChildrenCircleSize = 16;

const personDeleteButtonOffset = { dx: -personBoxSize.width / 2 + 5, dy: -personBoxSize.height / 2 - 10 };
const personAddPartnerButtonOffset = { dx: -personBoxSize.width / 2 + 30, dy: -personBoxSize.height / 2 - 10 };
const personSaveChangesButtonOffset = { dx: -personBoxSize.width / 2 + 55, dy: -personBoxSize.height / 2 - 10 };


const buttonSize = { width: 15, height: 15 };
const deleteButtonDistanceFromPerson = 10;


// -------------------------- Creating relationships with drag and drop --------------------------

type FunctionalEntity = { kind: "person", personId: number } |
{ kind: "family-child", familyId: number } |
{ kind: "family-parent", familyId: number };
type SelectionLink = { source: FunctionalEntity | null, cursorPosition: { x: number, y: number } }
let selectionLink: SelectionLink = { source: null, cursorPosition: { x: 0, y: 0 } };

function findFunctionalEntityAtPoint(x: number, y: number): FunctionalEntity | null {
    let closest: FunctionalEntity = null;
    let closestDistanceSquared = null;
    for (const personId in model.people) {
        let pos = layout.personsPosition[personId];
        const distanceSquared = Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2);
        if (distanceSquared < Math.pow(personBoxSize.height, 2) && closestDistanceSquared == null || distanceSquared < closestDistanceSquared) {
            closest = { kind: "person", personId: +personId };
            closestDistanceSquared = distanceSquared;
        }
    }

    for (const familyId in model.families) {
        let pos = layout.familyPosition[familyId];
        const distanceSquared = Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2);
        if (distanceSquared < Math.pow(familyBoxSize.height, 2) && closestDistanceSquared == null || distanceSquared < closestDistanceSquared) {
            let kind: "family-parent" | "family-child" = "family-parent";
            // Dragging to/from bottom parts creates a child. 
            // Dragging to/from top parts creates a parent.
            if (y > pos.y + familyBoxSize.height / 4) {
                kind = "family-child";
            }
            closest = { kind: kind, familyId: +familyId };
            closestDistanceSquared = distanceSquared;
        }
    }
    return closest;
}

async function functionalEntityConnectionAction(source: FunctionalEntity, target: FunctionalEntity) {
    if (source.kind == target.kind) {
        if (source.kind == "person") {
            if (peopleToDrawDeleteButtonOn.has(source.personId)) {
                peopleToDrawDeleteButtonOn.delete(source.personId);
            } else {
                peopleToDrawDeleteButtonOn.add(source.personId);
            }
            updateGraphics();
        } else {
            if (familiesToDrawButtonsOn.has(source.familyId)) {
                familiesToDrawButtonsOn.delete(source.familyId);
            } else {
                familiesToDrawButtonsOn.add(source.familyId);
            }
            updateGraphics();
        }
    }
    if (source.kind != "person") {
        if (target.kind != "person") {
            return;
        }
        await functionalEntityConnectionAction(target, source);
        return;
    }
    if (target.kind == "person" && target.personId != source.personId) {
        let newFamilyId = await model.newFamily();
        await model.attachParent(newFamilyId, target.personId);
        await model.attachParent(newFamilyId, source.personId);
        await updateAll();
    }
    if (target.kind == "family-child") {
        await model.attachChild(target.familyId, source.personId);
        await updateAll();
    }
    if (target.kind == "family-parent") {
        await model.attachParent(target.familyId, source.personId);
        await updateAll();
    }
}

function updateSelectionGraphics() {
    function sourcePosition(source: FunctionalEntity): { x: number, y: number } {
        if (source.kind == "person") {
            return layout.personsPosition[source.personId];
        }
        return layout.familyPosition[source.familyId];
    }

    g.selectAll(".selectionLink").data([selectionLink].filter((selectionLink) => selectionLink.source != null))
        .join(
            enter => {
                return enter.append("line").attr("class", () => "selectionLink")
                    .style("stroke", () => "grey")
                    .attr("x1", (selectionLink: SelectionLink) =>
                        sourcePosition(selectionLink.source).x
                    )
                    .attr("y1", (selectionLink: SelectionLink) =>
                        sourcePosition(selectionLink.source).y
                    )
                    .attr("x2", (selectionLink: SelectionLink) =>
                        selectionLink.cursorPosition.x
                    )
                    .attr("y2", (selectionLink: SelectionLink) =>
                        selectionLink.cursorPosition.y
                    ).style("stroke-dasharray", "3 3")

            },
            update => {
                return update
                    .attr("x1", (selectionLink: SelectionLink) =>
                        sourcePosition(selectionLink.source).x
                    )
                    .attr("y1", (selectionLink: SelectionLink) =>
                        sourcePosition(selectionLink.source).y
                    )
                    .attr("x2", (selectionLink: SelectionLink) =>
                        selectionLink.cursorPosition.x
                    )
                    .attr("y2", (selectionLink: SelectionLink) =>
                        selectionLink.cursorPosition.y
                    );
            },
            exit => exit.remove()
        );
}

let personsDrawnPosition: Record<number, { x: number, y: number }> = {}
let familyDrawnPosition: Record<number, { x: number, y: number }> = {}


export function updateGraphics() {
    let maxX = 0;
    let maxY = 0;
    for (const personId in layout.personsPosition) {
        const personPosition = layout.personsPosition[personId];
        const personXEnd = personPosition.x + personBoxSize.width;
        const personYEnd = personPosition.y + personBoxSize.height;
        if (personXEnd > maxX) {
            maxX = personXEnd;
        }
        if (personYEnd > maxY) {
            maxY = personYEnd;
        }
    }

    // -------------------------- Utilities for drawing lines nicely --------------------------

    function pathLength(path: Array<[number, number]>) {
        let length = 0;
        for (let i = 1; i < path.length; i += 1) {
            length += Math.sqrt(Math.pow(path[i][0] - path[i - 1][0], 2)
                + Math.pow(path[i][1] - path[i - 1][1], 2));
        }
        return length;
    }

    function fadePathStrokeBeforeTransition(path: Array<[number, number]>): { "stroke-dasharray": string, "stroke-dashoffset": string } {
        const lineLength = pathLength(path);
        return { "stroke-dasharray": lineLength + " " + lineLength, "stroke-dashoffset": "" + lineLength };
    }

    function fadePathStrokeAfterTransition(path: Array<[number, number]>): { "stroke-dasharray": string, "stroke-dashoffset": string } {
        const lineLength = pathLength(path);
        return { "stroke-dasharray": lineLength + " " + lineLength, "stroke-dashoffset": "" + 0 };
    }

    const line = d3.line();

    // -------------------------- Drawing parent paths --------------------------

    function parentPathPoints(parentPos: { x: number, y: number }, familyPos: { x: number, y: number }): Array<[number, number]> {
        let sign = Math.sign(familyPos.x - parentPos.x);
        if (familyPos.y == parentPos.y) {
            return [[familyPos.x - sign * familyBoxSize.width / 2, familyPos.y], [parentPos.x + sign * personBoxSize.width / 2, parentPos.y]];
        }
        if (familyPos.y < parentPos.y) {
            return [[familyPos.x - sign * familyBoxSize.width / 2, familyPos.y],
            [parentPos.x + sign * personBoxSize.width / 2, familyPos.y],
            [parentPos.x + sign * personBoxSize.width / 2, parentPos.y]];

        }
        return [[familyPos.x - sign * familyBoxSize.width / 2, familyPos.y],
        [parentPos.x, familyPos.y],
        [parentPos.x, parentPos.y + personBoxSize.height / 2]];
    }

    function parentPathDeleteButtonPosition(parentId: number, familyId: number): { x: number, y: number } {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[parentId];
        if (target.y == source.y) {
            return { x: +target.x + Math.sign(source.x - target.x) * (personBoxSize.width / 2 + deleteButtonDistanceFromPerson) - buttonSize.width / 2, y: target.y - buttonSize.height / 2 };
        }
        return { x: target.x - buttonSize.width / 2, y: target.y + (personBoxSize.height / 2 + deleteButtonDistanceFromPerson) - buttonSize.height / 2 };
    }

    function posEqual(a: { x: number, y: number }, b: { x: number, y: number }): boolean {
        return a.x == b.x && a.y == b.y;
    }

    g.selectAll(".parent").data(parentLinks, (d: { parentId: number, familyId: number }) => d.parentId + "parent" + d.familyId)
        .join(
            enter => {
                let parentLinkHook = enter.append("g").attr("class", () => "parent");
                let parentPath = parentLinkHook.append("path");
                parentPath.style("stroke", () => "grey").style("fill", () => "none");
                parentPath
                    .transition().delay(500)
                    .attr("d", (d: { parentId: number, familyId: number }) =>
                        line(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId])))
                    .attr("stroke-dasharray", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dashoffset"])
                    .transition().delay(1000)
                    .transition().duration(1500)
                    .attr("stroke-dasharray", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dashoffset"]);

                parentLinkHook.append("image")
                    .attr("xlink:href", "icons/delete.svg")
                    .attr("x", (d: { parentId: number, familyId: number }) => parentPathDeleteButtonPosition(d.parentId, d.familyId).x)
                    .attr("y", (d: { parentId: number, familyId: number }) => parentPathDeleteButtonPosition(d.parentId, d.familyId).y)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height)
                    .style("opacity", 0).attr("display", "none")
                    .on("click", async (event, d: { parentId: number, familyId: number }) => {
                        await model.detachParent(d.familyId, d.parentId);
                        await updateAll();
                    }
                    );
                return parentLinkHook;
            },
            update => {
                let changedPosition = update.filter((d) => !posEqual(personsDrawnPosition[d.parentId], layout.personsPosition[d.parentId]) ||
                    !posEqual(familyDrawnPosition[d.familyId], layout.familyPosition[d.familyId]));
                // TODO: Verify if path is different. We need the previous path here!
                changedPosition.select("path")
                    .transition().duration(500)
                    .attr("stroke-dasharray", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(parentPathPoints(personsDrawnPosition[d.parentId], familyDrawnPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(parentPathPoints(personsDrawnPosition[d.parentId], familyDrawnPosition[d.familyId]))["stroke-dashoffset"])
                    .transition().delay(0)
                    .attr("display", "none")
                    .attr("d", (d: { parentId: number, familyId: number }) => line(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId])))
                    .attr("stroke-dasharray", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dashoffset"])
                    .transition().delay(1000)
                    .attr("display", null)
                    .transition().duration(1500)
                    .attr("stroke-dasharray", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { parentId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(parentPathPoints(layout.personsPosition[d.parentId], layout.familyPosition[d.familyId]))["stroke-dashoffset"])

                changedPosition
                    .select("image")
                    .attr("x", (d: { parentId: number, familyId: number }) => {
                        return parentPathDeleteButtonPosition(d.parentId, d.familyId).x;
                    })
                    .attr("y", (d: { parentId: number, familyId: number }) =>
                        parentPathDeleteButtonPosition(d.parentId, d.familyId).y);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d.parentId)).select("image")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d.parentId)).select("image")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => peopleToDrawDeleteButtonOn.has(d.parentId)).select("image").attr("display", null)
                    .transition().duration(500).style("opacity", 1);
                return update;
            },
            exit => exit.remove()
        );

    // -------------------------- Drawing children paths --------------------------

    function childPathPoints(childPos: { x: number, y: number }, familyPos: { x: number, y: number }): Array<[number, number]> {
        if (familyPos.y > childPos.y) {
            return [[familyPos.x, familyPos.y],
            [familyPos.x, familyPos.y + 20],
            [childPos.x + personBoxSize.width, familyPos.y + 20],
            [childPos.x + personBoxSize.width, childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2]];
        }
        const midHeight = (familyPos.y + childPos.y) / 2;
        return [[familyPos.x, familyPos.y + familyBoxSize.height / 2],
        [familyPos.x, midHeight],
        [childPos.x, midHeight],
        [childPos.x, childPos.y - personBoxSize.height / 2]];
    }

    function childPathDeleteButtonPosition(childId: number, familyId: number): { x: number, y: number } {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[childId];
        return { x: target.x - buttonSize.width / 2, y: target.y - deleteButtonDistanceFromPerson - personBoxSize.height / 2 - buttonSize.height / 2 };
    }

    g.selectAll(".child").data(childrenLinks, (d: { childId: number, familyId: number }) => d.childId + "child" + d.familyId)
        .join(
            enter => {
                let childLinkHook = enter.append("g").attr("class", () => "child")
                let childPath = childLinkHook.append("path");
                childPath.style("stroke", () => "grey").style("fill", () => "none");
                childPath
                    .transition().delay(500)
                    .attr("d", (d: { childId: number, familyId: number }) =>
                        line(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))
                    )
                    .attr("stroke-dasharray", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dashoffset"])
                    .transition().delay(1000)
                    .transition().duration(1500)
                    .attr("stroke-dasharray", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dashoffset"]);

                childLinkHook.append("image")
                    .attr("xlink:href", "icons/delete.svg")
                    .attr("x", (d: { childId: number, familyId: number }) => childPathDeleteButtonPosition(d.childId, d.familyId).x)
                    .attr("y", (d: { childId: number, familyId: number }) => childPathDeleteButtonPosition(d.childId, d.familyId).y)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height)
                    .style("opacity", 0).attr("display", "none")
                    .on("click", async (event, d: { childId: number, familyId: number }) => {
                        await model.detachChild(d.familyId, d.childId);
                        await updateAll();
                    }
                    );

                return childLinkHook;
            },
            update => {
                let changedPosition = update.filter((d) => !posEqual(personsDrawnPosition[d.childId], layout.personsPosition[d.childId]) ||
                    !posEqual(familyDrawnPosition[d.familyId], layout.familyPosition[d.familyId]));

                changedPosition.select("path")
                    .transition().duration(500)
                    .attr("stroke-dasharray", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(childPathPoints(personsDrawnPosition[d.childId], familyDrawnPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(childPathPoints(personsDrawnPosition[d.childId], familyDrawnPosition[d.familyId]))["stroke-dashoffset"])
                    .transition().delay(0)
                    .attr("display", "none")
                    .attr("d", (d: { childId: number, familyId: number }) => line(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId])))
                    .attr("stroke-dasharray", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeBeforeTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dashoffset"])
                    .transition().delay(1000)
                    .attr("display", null)
                    .transition().duration(1500)
                    .attr("stroke-dasharray", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dasharray"])
                    .attr("stroke-dashoffset", (d: { childId: number, familyId: number }) =>
                        fadePathStrokeAfterTransition(childPathPoints(layout.personsPosition[d.childId], layout.familyPosition[d.familyId]))["stroke-dashoffset"]);

                update
                    .select("image")
                    .transition().duration(500)
                    .style("opacity", 0)
                    .transition().delay(0)
                    .attr("x", (d) =>
                        childPathDeleteButtonPosition(d.childId, d.familyId).x)
                    .attr("y", (d) =>
                        childPathDeleteButtonPosition(d.childId, d.familyId).y)
                    .transition().delay(1000);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d.childId)).select("image")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d.childId)).select("image")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => peopleToDrawDeleteButtonOn.has(d.childId)).select("image").attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                return update;
            }
            ,
            exit => exit.remove()
        );

    // -------------------------- Drawing family nodes --------------------------

    function familyDeleteButtonOffset(d: number): { dx: number, dy: number } {
        if (model.familyParents(d).length == 1) {
            return { dx: 25, dy: 10 };
        }
        return { dx: 10, dy: -25 };
    }

    function familyAddChildButtonOffset(d: number): { dx: number, dy: number } {
        if (model.familyParents(d).length == 1) {
            return { dx: 25, dy: -10 };
        }
        return { dx: -10, dy: -25 };
    }

    g.selectAll(".family").data(familyNodes, (d: number) => d)
        .join(
            enter => {
                let familyHook = enter.append("g").attr("class", () => "family");
                familyHook.attr("transform", (d) => {
                    return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")"
                }).style("opacity", 0)
                    .transition().delay(500)
                    .transition().duration(1500).style("opacity", 1);

                let heart = familyHook.append("image")
                    .attr("xlink:href", "icons/red_heart.svg")
                    .attr("x", () => -familyIconSize.width / 2)
                    .attr("y", () => -familyIconSize.height / 2)
                    .attr("width", () => familyIconSize.width)
                    .attr("height", () => familyIconSize.height);

                familyHook.call(d3.drag().on("start", (event, d: number) => {
                    let kind: "family-parent" | "family-child" = "family-parent";
                    if (event.y > layout.familyPosition[d].y + familyIconSize.height / 4) {
                        kind = "family-child"
                    }
                    selectionLink = { source: { kind: kind, familyId: d }, cursorPosition: { x: event.x, y: event.y } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    selectionLink.cursorPosition = { x: event.x, y: event.y };
                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    console.log(selectionLink.source);
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(event.x, event.y);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    await updateSelectionGraphics();
                }));

                if (tools.debug()) {
                    familyHook.append("text").text((d: number) => d);
                }

                let familyDeleteButton = familyHook.append("g")
                    .attr("class", () => "family_delete_button")
                    .style("opacity", 0).attr("display", "none");;

                familyDeleteButton.append("image").attr("xlink:href", "icons/heart.svg")
                    .attr("x", (d) => familyDeleteButtonOffset(d).dx - buttonSize.width / 2)
                    .attr("y", (d) => familyDeleteButtonOffset(d).dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);

                familyDeleteButton.append("image")
                    .attr("xlink:href", "icons/delete.svg")
                    .attr("x", (d) => familyDeleteButtonOffset(d).dx - buttonSize.width / 2)
                    .attr("y", (d) => familyDeleteButtonOffset(d).dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);


                familyDeleteButton.on("click", async (event, d) => {
                    await model.deleteFamily(d);
                    await updateAll();
                }
                );

                let familyAddChildButton = familyHook.append("g")
                    .attr("class", () => "family_add_child_button")
                    .style("opacity", 0).attr("display", "none");;

                familyAddChildButton.append("image").attr("xlink:href", "icons/child_bottle.svg")
                    .attr("x", (d) => familyAddChildButtonOffset(d).dx - buttonSize.width / 2)
                    .attr("y", (d) => familyAddChildButtonOffset(d).dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);

                familyAddChildButton.append("image")
                    .attr("xlink:href", "icons/plus.svg")
                    .attr("x", (d) => familyAddChildButtonOffset(d).dx - buttonSize.width / 2 - 4)
                    .attr("y", (d) => familyAddChildButtonOffset(d).dy - buttonSize.height / 2)
                    .attr("width", () => 8)
                    .attr("height", () => 8);


                familyAddChildButton.on("click", async (event, d) => {
                    let childId = await model.newPerson("Child");
                    await model.attachChild(d, childId);
                    await updateAll();
                }
                );

                return familyHook;
            },
            update => {
                let changedPosition = update.filter((d) => !posEqual(familyDrawnPosition[d], layout.familyPosition[d]));

                changedPosition.
                    transition().duration(500)
                    .style("opacity", 0)
                    .transition().delay(0)
                    .attr("transform", (d) => {
                        return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")"
                    }).transition().duration(1500).style("opacity", 1)

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !familiesToDrawButtonsOn.has(d)).select(".family_delete_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !familiesToDrawButtonsOn.has(d)).select(".family_delete_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => familiesToDrawButtonsOn.has(d)).select(".family_delete_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !familiesToDrawButtonsOn.has(d)).select(".family_add_child_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !familiesToDrawButtonsOn.has(d)).select(".family_add_child_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => familiesToDrawButtonsOn.has(d)).select(".family_add_child_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                return update;
            },
            exit => exit.remove()
        );

    // -------------------------- Drawing people nodes --------------------------
    
    function personNameBoxTag(d: number): string {
        return 'name_' + d;
    }

    g.selectAll(".person").data(personNodes, (d: number) => d)
        .join(
            enter => {
                let personHook = enter.append("g")
                    .attr("class", () => "person");

                personHook.call(d3.drag().on("start", (event, d: number) => {
                    selectionLink = { source: { kind: "person", personId: d }, cursorPosition: { x: event.x, y: event.y } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    selectionLink = { source: { kind: "person", personId: d }, cursorPosition: { x: event.x, y: event.y } };

                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(event.x, event.y);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    updateSelectionGraphics();
                }));

                personHook.attr("transform", (d: number) => {
                    return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")"
                });

                personHook.append("foreignObject")
                    .attr("x", -personBoxSize.width / 2)
                    .attr("y", -personBoxSize.height / 2)
                    .attr("width", personBoxSize.width)
                    .attr("height", personBoxSize.height)
                    .html(function (d) {
                        let textAreaStyleAttrs: Record<string, string> = {};
                        textAreaStyleAttrs["font-size"] = "24px";
                        textAreaStyleAttrs["font-family"] = "Dancing Script";
                        textAreaStyleAttrs["text-align"] = "Center";
                        textAreaStyleAttrs["width"] = "" + personBoxSize.width + "px";
                        textAreaStyleAttrs["resize"] = "none";
                        textAreaStyleAttrs["border"] = "none";
                        textAreaStyleAttrs["background"] = "transparent";
                        textAreaStyleAttrs["outline"] = "none";
                        let styleString = "";
                        for (const attr in textAreaStyleAttrs) {
                            styleString += attr + ":" + textAreaStyleAttrs[attr];
                            styleString += ";";
                        }
                        return '<textarea oninput="updateGraphics()" style="' + styleString + '" rows="2" id="' + personNameBoxTag(d) + '">' +
                            model.people[+d].names.join(' ') +
                            '</textarea>';
                    });


                let personDeleteButton = personHook.append("g")
                    .attr("class", () => "person_delete_button")
                    .style("opacity", 0).attr("display", "none");

                personDeleteButton.append("image").attr("xlink:href", "icons/person_off.svg")
                    .attr("x", () => personDeleteButtonOffset.dx - buttonSize.width / 2)
                    .attr("y", () => personDeleteButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);


                personDeleteButton.on("click", async (event, d) => {
                    await model.deletePerson(d);
                    await updateAll();
                }
                );

                let personAddPartnerButton = personHook.append("g")
                    .attr("class", () => "person_add_partner_button")
                    .style("opacity", 0).attr("display", "none");

                personAddPartnerButton.append("image").attr("xlink:href", "icons/partner.svg")
                    .attr("x", () => personAddPartnerButtonOffset.dx - buttonSize.width / 2)
                    .attr("y", () => personAddPartnerButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);


                personAddPartnerButton.on("click", async (event, d) => {
                    let familyId = await model.newFamily();
                    let partner = await model.newPerson("Partner");
                    await model.attachParent(familyId, partner);
                    await model.attachParent(familyId, d);
                    await updateAll();
                }
                );

                let personSaveChangedNameButton = personHook.append("g")
                    .attr("class", () => "person_save_changes_button")
                    .style("opacity", 0).attr("display", "none");

                personSaveChangedNameButton.append("image").attr("xlink:href", "icons/save.svg")
                    .attr("x", () => personSaveChangesButtonOffset.dx - buttonSize.width / 2)
                    .attr("y", () => personSaveChangesButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);


                personSaveChangedNameButton.on("click", async (event, d) => {
                    let boxData = document.getElementById(personNameBoxTag(d)) as HTMLTextAreaElement;
                    let namesInBox = boxData.value.split(/\s+/);
                    let normalizedNames = namesInBox.join(' ');
                    if (normalizedNames != model.people[d].names.join(' ')) {
                        await model.setNames(d, normalizedNames);
                        await updateAll();
                    }
                }
                );
                return personHook;
            },
            update => {
                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d)).select(".person_delete_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d)).select(".person_delete_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => peopleToDrawDeleteButtonOn.has(d)).select(".person_delete_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);


                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d)).select(".person_add_partner_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !peopleToDrawDeleteButtonOn.has(d)).select(".person_add_partner_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => peopleToDrawDeleteButtonOn.has(d)).select(".person_add_partner_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                function inputContainsDifferentName(d : number) {
                    let boxData = document.getElementById(personNameBoxTag(d)) as HTMLTextAreaElement;
                    let namesInBox = boxData.value.split(/\s+/);
                    let normalizedNames = namesInBox.join(' ');
                    return normalizedNames != model.people[d].names.join(' ');
                }

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !inputContainsDifferentName(d)).select(".person_save_changes_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !inputContainsDifferentName(d)).select(".person_save_changes_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => inputContainsDifferentName(d)).select(".person_save_changes_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                return update.transition().delay(500).transition().duration(1000).attr("transform", (d: number) => {
                    return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")"
                });
            }
        );

    personsDrawnPosition = {};
    familyDrawnPosition = {};
    for (const personId in layout.personsPosition) {
        const position = layout.personsPosition[personId];
        personsDrawnPosition[personId] = { x: position.x, y: position.y };
    }

    for (const familyId in layout.familyPosition) {
        const position = layout.familyPosition[familyId];
        familyDrawnPosition[familyId] = { x: position.x, y: position.y };
    }

}


async function updateAll() {
    await updateData();
    peopleToDrawDeleteButtonOn = new Set();
    familiesToDrawButtonsOn = new Set();
    updateGraphics();
}

updateAll();



