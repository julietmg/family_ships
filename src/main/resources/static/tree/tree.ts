import * as d3 from "d3";
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import * as config from "./config.js";
import * as model from "./model.js";
import * as layout from "./layout.js";

// ----------------- Running tests ------------------
import "./scc_test.js";
import "./model_test.js";
import "./reachability_test.js";
import "./layout_test.js";
import "./deque_test.js";
import "./reversible_deque_test.js";

// Showcase the icons that we have in the debug mode.
if (config.debug) {
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

const addPersonSvg = d3.select("body").append("svg")
    .attr("width", 30)
    .attr("height", 30)
    .append("g").append("image")
    .attr("xlink:href", "icons/add_person.svg")
    .attr("x", () => 10)
    .attr("y", () => 10)
    .attr("width", () => 20)
    .attr("height", () => 20)
    .on("click", async (event, d) => {
        const newPersonId = await model.newPerson("Name");
        await updateAll();
    });

const svg = d3.select("body").append("svg").attr("class", "tree")
    .attr("width", "100%")
    .attr("height", "100%");

svg.call(d3.zoom()
    .on('zoom', (e) => {
        d3.select('.tree g')
            .attr('transform', e.transform);
    }));

const g = svg.append("g").attr('transform', "translate(" + 100 + "," + 150 + ")");

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

let activePeople = new Set();
let activeFamilies = new Set();

// -------------------------- Tweakable constants for drawing things --------------------------

const personBoxSize = { width: 150, height: 100 };

const familyBoxSize = { width: 28, height: 28 };
const familyIconSize = { width: 24, height: 24 };
const familyChildrenCircleSize = 16;

const personDeleteButtonOffset = { dx: -personBoxSize.width / 2 + 5, dy: -personBoxSize.height / 2 - 10 };
const personSaveChangesButtonOffset = { dx: -personBoxSize.width / 2 + 30, dy: -personBoxSize.height / 2 - 10 };
const personAddChildButtonOffset = { dx: personBoxSize.width / 2 - 5, dy: -personBoxSize.height / 2 - 10 };
const personAddPartnerButtonOffset = { dx: personBoxSize.width / 2 - 30, dy: -personBoxSize.height / 2 - 10 };
const personAddParentButtonOffset = { dx: personBoxSize.width / 2 - 55, dy: -personBoxSize.height / 2 - 10 };


const buttonSize = { width: 15, height: 15 };
const deleteButtonHorizontalDistanceFromPerson = personBoxSize.width / 2 + 7;
const deleteButtonVerticalDistanceFromPerson = personBoxSize.height / 2 + 7;


// -------------------------- Creating relationships with drag and drop --------------------------

type FunctionalEntity = { kind: "person-child", personId: number } |
{ kind: "person-parent", personId: number } |
{ kind: "person-partner", personId: number } |
{ kind: "family-child", familyId: number } |
{ kind: "family-parent", familyId: number };
type SelectionLink = { source: FunctionalEntity | null, cursorPosition: { x: number, y: number } }
let selectionLink: SelectionLink = { source: null, cursorPosition: { x: 0, y: 0 } };

type FunctionalTarget = { kind: "person", personId: number } |
{ kind: "family", familyId: number };

function findFunctionalEntityAtPoint(x: number, y: number): FunctionalTarget | null {
    let closest: FunctionalTarget = null;
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
            closest = { kind: "family", familyId: +familyId };
            closestDistanceSquared = distanceSquared;
        }
    }
    return closest;
}

function personNameBoxTag(d: number): string {
    return 'name_' + d;
}

async function functionalEntityConnectionAction(source: FunctionalEntity, target: FunctionalTarget) {
    if (source.kind == "person-partner") {
        if (target.kind == "person" && target.personId != source.personId) {
            let newFamilyId = await model.newFamily();
            await model.attachParent(newFamilyId, target.personId);
            await model.attachParent(newFamilyId, source.personId);
            await updateAll();
        } else if (target.kind == "family") {
            await model.attachParent(target.familyId, source.personId);
            await updateAll();

        }
    } else if (source.kind == "person-child") {
        if (target.kind == "person" && target.personId != source.personId) {
            let newFamilyId = await model.newFamily();
            await model.attachParent(newFamilyId, source.personId);
            await model.attachChild(newFamilyId, target.personId);
            await updateAll();
        }
    } else if (source.kind == "person-parent") {
        if (target.kind == "person" && target.personId != source.personId) {
            let newFamilyId = await model.newFamily();
            await model.attachChild(newFamilyId, source.personId);
            await model.attachParent(newFamilyId, target.personId);
            await updateAll();
        } else if (target.kind == "family") {
            await model.attachParent(target.familyId, source.personId);
            await updateAll();
        }
    } else if (source.kind == "family-child") {
        if (target.kind == "person") {
            await model.attachChild(source.familyId, target.personId);
            await updateAll();
        }
    } else if (source.kind == "family-parent") {
        if (target.kind == "person") {
            await model.attachParent(source.familyId, target.personId);
            await updateAll();
        }
    }
}

function updateSelectionGraphics() {
    function sourcePosition(source: FunctionalEntity): { x: number, y: number } {
        if (source.kind == "person-parent" || source.kind == "person-child" || source.kind == "person-partner") {
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
            [parentPos.x + sign * (personBoxSize.width / 2 + 20), familyPos.y],
            [parentPos.x + sign * (personBoxSize.width / 2 + 20), parentPos.y],
            [parentPos.x + sign * personBoxSize.width / 2, parentPos.y]];
        }
        if (sign == 0) {
            return [[parentPos.x, familyPos.y],
            [parentPos.x, parentPos.y + personBoxSize.height / 2]];
        }
        return [[familyPos.x - sign * familyBoxSize.width / 2, familyPos.y],
        [parentPos.x, familyPos.y],
        [parentPos.x, parentPos.y + personBoxSize.height / 2]];
    }

    // TODO: Calculate that based on point and path, calculating an offset or something.
    function parentPathDeleteButtonOffset(parentId: number, familyId: number): { x: number, y: number } {
        const familyPos = layout.familyPosition[familyId];
        const parentPos = layout.personsPosition[parentId];
        const pathPoints = parentPathPoints(parentPos, familyPos).slice(-2);
        const dx = pathPoints[0][0] - pathPoints[1][0];
        const dy = pathPoints[0][1] - pathPoints[1][1];
        return {
            x: Math.sign(dx) * (deleteButtonHorizontalDistanceFromPerson) - buttonSize.width / 2,
            y: Math.sign(dy) * (deleteButtonVerticalDistanceFromPerson) - buttonSize.height / 2
        };
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
                    .attr("x", (d: { parentId: number, familyId: number }) =>
                        layout.personsPosition[d.parentId].x + parentPathDeleteButtonOffset(d.parentId, d.familyId).x)
                    .attr("y", (d: { parentId: number, familyId: number }) =>
                        layout.personsPosition[d.parentId].y + parentPathDeleteButtonOffset(d.parentId, d.familyId).y)
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
                // TODO: Verify if path is different. We need the leftious path here!
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
                    .attr("x", (d: { parentId: number, familyId: number }) =>
                        layout.personsPosition[d.parentId].x + parentPathDeleteButtonOffset(d.parentId, d.familyId).x)
                    .attr("y", (d: { parentId: number, familyId: number }) =>
                        layout.personsPosition[d.parentId].y + parentPathDeleteButtonOffset(d.parentId, d.familyId).y);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activePeople.has(d.parentId)).select("image")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activePeople.has(d.parentId)).select("image")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activePeople.has(d.parentId)).select("image").attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                update.filter((d) => activePeople.has(d.parentId)).select("path").style("stroke-width", "2");
                update.filter((d) => !activePeople.has(d.parentId)).select("path").style("stroke-width", null);
                return update;
            },
            exit => exit.remove()
        );

    // -------------------------- Drawing children paths --------------------------

    function childPathPoints(childPos: { x: number, y: number }, familyPos: { x: number, y: number }): Array<[number, number]> {
        let sign = Math.sign(familyPos.x - childPos.x);
        if (familyPos.y > childPos.y) {
            return [[familyPos.x, familyPos.y + familyBoxSize.height / 2],
            [familyPos.x, familyPos.y + familyBoxSize.height / 2 + 20],
            [childPos.x + personBoxSize.width, familyPos.y + familyBoxSize.height / 2 + 20],
            [childPos.x + personBoxSize.width, childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2]];
        }
        if (childPos.y > familyPos.y + layout.spaceBetweenLayers) {
            return [[familyPos.x, familyPos.y + familyBoxSize.height / 2],
            [familyPos.x, familyPos.y + familyBoxSize.height / 2 + 20],
            [childPos.x + sign * (personBoxSize.width / 2 + 20), familyPos.y + familyBoxSize.height / 2 + 20],
            [childPos.x + sign * (personBoxSize.width / 2 + 20), childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2]];
        }
        if (childPos.y == familyPos.y) {
            return [[familyPos.x, familyPos.y + familyBoxSize.height / 2],
            [familyPos.x, familyPos.y + familyBoxSize.height / 2 + 20],
            [childPos.x + sign * (personBoxSize.width / 2 + 20), familyPos.y + familyBoxSize.height / 2 + 20],
            [childPos.x + sign * (personBoxSize.width / 2 + 20), childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2 - 40],
            [childPos.x, childPos.y - personBoxSize.height / 2]];
        }
        const midHeight = (familyPos.y + childPos.y) / 2;
        return [[familyPos.x, familyPos.y + familyBoxSize.height / 2],
        [familyPos.x, midHeight],
        [childPos.x, midHeight],
        [childPos.x, childPos.y - personBoxSize.height / 2]];
    }

    function childPathDeleteButtonOffset(childId: number, familyId: number): { x: number, y: number } {
        const familyPos = layout.familyPosition[familyId];
        const childPos = layout.personsPosition[childId];
        const pathPoints = childPathPoints(childPos, familyPos).slice(-2);
        const dx = pathPoints[0][0] - pathPoints[1][0];
        const dy = pathPoints[0][1] - pathPoints[1][1];
        return {
            x: Math.sign(dx) * (deleteButtonHorizontalDistanceFromPerson) - buttonSize.width / 2,
            y: Math.sign(dy) * (deleteButtonVerticalDistanceFromPerson) - buttonSize.height / 2
        };
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
                    .attr("x", (d: { childId: number, familyId: number }) =>
                        layout.personsPosition[d.childId].x + childPathDeleteButtonOffset(d.childId, d.familyId).x)
                    .attr("y", (d: { childId: number, familyId: number }) =>
                        layout.personsPosition[d.childId].y + childPathDeleteButtonOffset(d.childId, d.familyId).y)
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

                changedPosition
                    .select("image")
                    .attr("x", (d) =>
                        layout.personsPosition[d.childId].x + + childPathDeleteButtonOffset(d.childId, d.familyId).x)
                    .attr("y", (d) =>
                        layout.personsPosition[d.childId].y + childPathDeleteButtonOffset(d.childId, d.familyId).y);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activePeople.has(d.childId)).select("image")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activePeople.has(d.childId)).select("image")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activePeople.has(d.childId)).select("image").attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                update.filter((d) => activePeople.has(d.childId)).select("path").style("stroke-width", "2");
                update.filter((d) => !activePeople.has(d.childId)).select("path").style("stroke-width", null);
                return update;
            }
            ,
            exit => exit.remove()
        );

    // -------------------------- Drawing family nodes --------------------------

    function familyDeleteButtonOffset(d: model.FamilyId): { dx: number, dy: number } {
        if (model.familyParents(d).length == 1) {
            return { dx: familyIconSize.width / 2, dy: -familyIconSize.height / 2 - 15 };
        }
        return { dx: -familyIconSize.width / 2 - 15, dy: -familyIconSize.height / 2 };
    }

    function familyAddChildButtonOffset(d: model.FamilyId): { dx: number, dy: number } {
        if (model.familyParents(d).length == 1) {
            return { dx: familyIconSize.width / 2, dy: familyIconSize.height / 2 + 15 };
        }
        return { dx: familyIconSize.width / 2 + 15, dy: -familyIconSize.height / 2 };
    }

    function familyAddParentButtonOffset(d: model.FamilyId): { dx: number, dy: number } {
        if (model.familyParents(d).length == 1) {
            return { dx: familyIconSize.width / 2 + 21, dy: 0 };
        }
        return { dx: 0, dy: -familyIconSize.height / 2 - 21 };
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
                    .attr("height", () => familyIconSize.height).on("click", (event, d: model.FamilyId) => {
                        if (activeFamilies.has(d)) {
                            activeFamilies.delete(d);
                            updateGraphics();
                        } else {
                            activeFamilies.add(d);
                            updateGraphics();
                        }
                    }
                    );;

                if (config.debug) {
                    familyHook.append("text").text((d: number) => d);
                }

                let familyDeleteButton = familyHook.append("g")
                    .attr("class", () => "family_delete_button")
                    .style("opacity", 0).attr("display", "none");

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

                familyAddChildButton.call(d3.drag().on("start", (event, d: number) => {
                    let kind: "family-child" = "family-child";
                    let eventAbsPos = [layout.familyPosition[d].x + event.x, layout.familyPosition[d].y + event.y];
                    selectionLink = { source: { kind: kind, familyId: d }, cursorPosition: { x: eventAbsPos[0], y: eventAbsPos[1] } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    let eventAbsPos = [layout.familyPosition[d].x + event.x, layout.familyPosition[d].y + event.y];
                    selectionLink.cursorPosition = { x: eventAbsPos[0], y: eventAbsPos[1] };
                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    let eventAbsPos = [layout.familyPosition[d].x + event.x, layout.familyPosition[d].y + event.y];
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(eventAbsPos[0], eventAbsPos[1]);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    updateSelectionGraphics();
                }));

                familyAddChildButton.on("click", async (event, d) => {
                    let childId = await model.newPerson("Child");
                    await model.attachChild(d, childId);
                    await updateAll();
                }
                );

                let familyAddParentButton = familyHook.append("g")
                    .attr("class", () => "family_add_parent_button")
                    .style("opacity", 0).attr("display", "none");;

                familyAddParentButton.append("image").attr("xlink:href", "icons/partner.svg")
                    .attr("x", (d) => familyAddParentButtonOffset(d).dx - buttonSize.width / 2)
                    .attr("y", (d) => familyAddParentButtonOffset(d).dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);

                familyAddParentButton.append("image")
                    .attr("xlink:href", "icons/plus.svg")
                    .attr("x", (d) => familyAddParentButtonOffset(d).dx - buttonSize.width / 2 - 4)
                    .attr("y", (d) => familyAddParentButtonOffset(d).dy - buttonSize.height / 2)
                    .attr("width", () => 8)
                    .attr("height", () => 8);

                familyAddParentButton.call(d3.drag().on("start", (event, d: number) => {
                    let kind: "family-parent" = "family-parent";
                    let eventAbsPos = [layout.familyPosition[d].x + event.x, layout.familyPosition[d].y + event.y];
                    selectionLink = { source: { kind: kind, familyId: d }, cursorPosition: { x: eventAbsPos[0], y: eventAbsPos[1] } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    let eventAbsPos = [layout.familyPosition[d].x + event.x, layout.familyPosition[d].y + event.y];
                    selectionLink.cursorPosition = { x: eventAbsPos[0], y: eventAbsPos[1] };
                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    let eventAbsPos = [layout.familyPosition[d].x + event.x, layout.familyPosition[d].y + event.y];
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(eventAbsPos[0], eventAbsPos[1]);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    updateSelectionGraphics();
                }));

                familyAddParentButton.on("click", async (event, d) => {
                    let childId = await model.newPerson("Parent");
                    await model.attachParent(d, childId);
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
                update.filter((d) => !activeFamilies.has(d)).select(".family_delete_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activeFamilies.has(d)).select(".family_delete_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activeFamilies.has(d)).select(".family_delete_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activeFamilies.has(d)).select(".family_add_child_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activeFamilies.has(d)).select(".family_add_child_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activeFamilies.has(d)).select(".family_add_child_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activeFamilies.has(d)).select(".family_add_parent_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activeFamilies.has(d)).select(".family_add_parent_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activeFamilies.has(d)).select(".family_add_parent_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                return update;
            },
            exit => exit.remove()
        );

    // -------------------------- Drawing people nodes --------------------------

    g.selectAll(".person").data(personNodes, (d: number) => d)
        .join(
            enter => {
                let personHook = enter.append("g")
                    .attr("class", () => "person");

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
                        textAreaStyleAttrs["width"] = "" + (personBoxSize.width - 10) + "px";
                        textAreaStyleAttrs["height"] = "" + (personBoxSize.height - 10) + "px";
                        textAreaStyleAttrs["resize"] = "none";
                        textAreaStyleAttrs["border"] = "none";
                        textAreaStyleAttrs["border-radius"] = "4px";
                        textAreaStyleAttrs["background"] = "transparent";
                        textAreaStyleAttrs["outline"] = "none";
                        let styleString = "";
                        for (const attr in textAreaStyleAttrs) {
                            styleString += attr + ":" + textAreaStyleAttrs[attr];
                            styleString += ";";
                        }
                        let nameText = model.people[+d].names.join(' ');
                        if (config.debug) {
                            nameText = d + "\n" + nameText;
                        }
                        return '<textarea oninput="updateGraphics()" style="' + styleString + '" rows="2" id="' + personNameBoxTag(d) + '">' +
                            nameText +
                            '</textarea>';
                    }).on("click", (event, d: model.PersonId) => {
                        if (activePeople.has(d)) {
                            activePeople.delete(d);
                            updateGraphics();
                        } else {
                            activePeople.add(d);
                            updateGraphics();
                        }
                    }
                    );


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

                let personAddParentButton = personHook.append("g")
                    .attr("class", () => "person_add_parent_button")
                    .style("opacity", 0).attr("display", "none");

                personAddParentButton.append("image").attr("xlink:href", "icons/add_parent.svg")
                    .attr("x", () => personAddParentButtonOffset.dx - buttonSize.width / 2)
                    .attr("y", () => personAddParentButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);



                personAddParentButton.on("click", async (event, d) => {
                    let familyId = await model.newFamily();
                    let parent = await model.newPerson("Parent");
                    await model.attachParent(familyId, parent);
                    await model.attachChild(familyId, d);
                    await updateAll();
                }
                );

                personAddParentButton.call(d3.drag().on("start", (event, d: number) => {
                    let kind: "person-parent" = "person-parent";
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    selectionLink = { source: { kind: kind, personId: d }, cursorPosition: { x: eventAbsPos[0], y: eventAbsPos[1] } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    selectionLink.cursorPosition = { x: eventAbsPos[0], y: eventAbsPos[1] };
                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(eventAbsPos[0], eventAbsPos[1]);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    updateSelectionGraphics();
                }));



                let personAddPartnerButton = personHook.append("g")
                    .attr("class", () => "person_add_partner_button")
                    .style("opacity", 0).attr("display", "none");

                personAddPartnerButton.append("image").attr("xlink:href", "icons/partner.svg")
                    .attr("x", () => personAddPartnerButtonOffset.dx - buttonSize.width / 2)
                    .attr("y", () => personAddPartnerButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);

                personAddPartnerButton.call(d3.drag().on("start", (event, d: number) => {
                    let kind: "person-partner" = "person-partner";
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    selectionLink = { source: { kind: kind, personId: d }, cursorPosition: { x: eventAbsPos[0], y: eventAbsPos[1] } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    selectionLink.cursorPosition = { x: eventAbsPos[0], y: eventAbsPos[1] };
                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(eventAbsPos[0], eventAbsPos[1]);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    updateSelectionGraphics();
                }));

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

                let personAddChildButton = personHook.append("g")
                    .attr("class", () => "person_add_child_button")
                    .style("opacity", 0).attr("display", "none");;

                personAddChildButton.append("image").attr("xlink:href", "icons/child_bottle.svg")
                    .attr("x", (d) => personAddChildButtonOffset.dx - buttonSize.width / 2)
                    .attr("y", (d) => personAddChildButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => buttonSize.width)
                    .attr("height", () => buttonSize.height);

                personAddChildButton.append("image")
                    .attr("xlink:href", "icons/plus.svg")
                    .attr("x", (d) => personAddChildButtonOffset.dx - buttonSize.width / 2 - 4)
                    .attr("y", (d) => personAddChildButtonOffset.dy - buttonSize.height / 2)
                    .attr("width", () => 8)
                    .attr("height", () => 8);

                personAddChildButton.call(d3.drag().on("start", (event, d: number) => {
                    let kind: "person-child" = "person-child";
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    selectionLink = { source: { kind: kind, personId: d }, cursorPosition: { x: eventAbsPos[0], y: eventAbsPos[1] } };
                    updateSelectionGraphics();
                }).on("drag", (event, d: number) => {
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    selectionLink.cursorPosition = { x: eventAbsPos[0], y: eventAbsPos[1] };
                    updateSelectionGraphics();
                }).on("end", async (event, d: number) => {
                    let eventAbsPos = [layout.personsPosition[d].x + event.x, layout.personsPosition[d].y + event.y];
                    const source = selectionLink.source;
                    selectionLink.source = null;
                    let selected = findFunctionalEntityAtPoint(eventAbsPos[0], eventAbsPos[1]);
                    if (selected != null) {
                        functionalEntityConnectionAction(source, selected);
                    }
                    updateSelectionGraphics();
                }));

                personAddChildButton.on("click", async (event, d) => {
                    let familyId = await model.newFamily();
                    let childId = await model.newPerson("Child");
                    await model.attachParent(familyId, d);
                    await model.attachChild(familyId, childId);
                    await updateAll();
                }
                );

                return personHook;
            },
            update => {
                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activePeople.has(d)).select(".person_add_parent_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activePeople.has(d)).select(".person_add_parent_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activePeople.has(d)).select(".person_add_parent_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activePeople.has(d)).select(".person_delete_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activePeople.has(d)).select(".person_delete_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activePeople.has(d)).select(".person_delete_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);


                // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
                update.filter((d) => !activePeople.has(d)).select(".person_add_partner_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activePeople.has(d)).select(".person_add_partner_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activePeople.has(d)).select(".person_add_partner_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                update.filter((d) => !activePeople.has(d)).select(".person_add_child_button")
                    .transition().duration(500).style("opacity", 0);
                update.filter((d) => !activePeople.has(d)).select(".person_add_child_button")
                    .transition().delay(500).attr("display", "none");
                update.filter((d) => activePeople.has(d)).select(".person_add_child_button")
                    .transition().delay(0).attr("display", null)
                    .transition().duration(500).style("opacity", 1);

                function inputContainsDifferentName(d: number) {
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
    activePeople = new Set();
    activeFamilies = new Set();
    updateGraphics();
}

updateAll();



