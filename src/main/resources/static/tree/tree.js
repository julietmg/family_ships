// import * as d3 from "d3";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as tools from "./tools.js";
import * as model from "./model.js";
import * as layout from "./layout.js";
// TODO: Add a lock, which will hide all the functional buttons.
// Showcase the icons that we have in the debug mode.
if (tools.debug()) {
    function showDebugIcon(path) {
        const iconSvg = d3.select("body").append("svg")
            .attr("width", 200)
            .attr("height", 100);
        const g = iconSvg.append("g")
            .attr("transform", "translate(" + 20 + "," + 20 + ")");
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
}
// -------------------------- Add new person button --------------------------
const addPersonSvg = d3.select("body").append("svg")
    .attr("width", 100)
    .attr("height", 100).append("g").append("image")
    .attr("xlink:href", "icons/add_person.svg")
    .attr("x", () => 10)
    .attr("y", () => 10)
    .attr("width", () => 80)
    .attr("height", () => 80)
    .on("click", async (event, d) => {
    const newPersonId = await model.newPerson("Name");
    tools.log("Added a new person " + newPersonId);
    await updateAll();
});
const margin = { top: 150, right: 100, bottom: 100, left: 150 };
const svg = d3.select("body").append("svg")
    .attr("width", margin.left + margin.right)
    .attr("height", margin.top + margin.bottom);
const g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
// -------------------------- Data points that trigger draws --------------------------
let personNodes = [];
let familyNodes = [];
let parentLinks = [];
let childrenLinks = [];
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
// -------------------------- Tweakable constants for drawing things --------------------------
const personBoxSize = { width: 150, height: 80 };
const familyBoxSize = { width: 28, height: 28 };
const familyIconSize = { width: 24, height: 24 };
const familyChildrenCircleSize = 16;
const personDeleteButtonOffset = { dx: 0, dy: -30 };
const deleteButtonSize = { width: 15, height: 15 };
const deleteButtonDistanceFromPerson = 10;
let selectionLink = { source: null, cursorPosition: { x: 0, y: 0 } };
function findFunctionalEntityAtPoint(x, y) {
    let closest = null;
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
            let kind = "family-parent";
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
async function functionalEntityConnectionAction(source, target) {
    if (source.kind != "person") {
        if (target.kind != "person") {
            return;
        }
        functionalEntityConnectionAction(target, source);
        return;
    }
    if (target.kind == "person" && target.personId == source.personId) {
        if (peopleToDrawDeleteButtonOn.has(source.personId)) {
            peopleToDrawDeleteButtonOn.delete(source.personId);
        }
        else {
            peopleToDrawDeleteButtonOn.add(source.personId);
        }
        await updateGraphics();
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
    function sourcePosition(source) {
        if (source.kind == "person") {
            return layout.personsPosition[source.personId];
        }
        return layout.familyPosition[source.familyId];
    }
    g.selectAll(".selectionLink").data([selectionLink].filter((selectionLink) => selectionLink.source != null))
        .join(enter => {
        return enter.append("line").attr("class", () => "selectionLink")
            .style("stroke", () => "grey")
            .attr("x1", (selectionLink) => sourcePosition(selectionLink.source).x)
            .attr("y1", (selectionLink) => sourcePosition(selectionLink.source).y)
            .attr("x2", (selectionLink) => selectionLink.cursorPosition.x)
            .attr("y2", (selectionLink) => selectionLink.cursorPosition.y).style("stroke-dasharray", "3 3");
    }, update => {
        return update
            .attr("x1", (selectionLink) => sourcePosition(selectionLink.source).x)
            .attr("y1", (selectionLink) => sourcePosition(selectionLink.source).y)
            .attr("x2", (selectionLink) => selectionLink.cursorPosition.x)
            .attr("y2", (selectionLink) => selectionLink.cursorPosition.y);
    }, exit => exit.remove());
}
function updateGraphics() {
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
    svg.attr("width", margin.left + personBoxSize.width / 2 + maxX + margin.right);
    svg.attr("height", margin.top + personBoxSize.height / 2 + maxY + margin.bottom);
    // -------------------------- Utilities for drawing things --------------------------
    function pathLength(path) {
        let length = 0;
        for (let i = 1; i < path.length; i += 1) {
            length += Math.sqrt(Math.pow(path[i][0] - path[i - 1][0], 2)
                + Math.pow(path[i][1] - path[i - 1][1], 2));
        }
        return length;
    }
    function fadePathStrokeBeforeTransition(path) {
        const lineLength = pathLength(path);
        return { "stroke-dasharray": lineLength + " " + lineLength, "stroke-dashoffset": "" + lineLength };
    }
    function fadePathStrokeAfterTransition(path) {
        const lineLength = pathLength(path);
        return { "stroke-dasharray": lineLength + " " + lineLength, "stroke-dashoffset": "" + 0 };
    }
    const line = d3.line();
    // -------------------------- Drawing parent paths --------------------------
    function parentPathPoints(parentId, familyId) {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[parentId];
        let sign = Math.sign(source.x - target.x);
        if (source.y == target.y) {
            return [[source.x - sign * familyBoxSize.width / 2, source.y], [target.x + sign * personBoxSize.width / 2, target.y]];
        }
        if (source.y < target.y) {
            return [[source.x - sign * familyBoxSize.width / 2, source.y],
                [target.x + sign * personBoxSize.width / 2, source.y],
                [target.x + sign * personBoxSize.width / 2, target.y]];
        }
        return [[source.x - sign * familyBoxSize.width / 2, source.y],
            [target.x, source.y],
            [target.x, target.y + personBoxSize.height / 2]];
    }
    function parentPathDeleteButtonPosition(parentId, familyId) {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[parentId];
        if (target.y == source.y) {
            return { x: +target.x + Math.sign(source.x - target.x) * (personBoxSize.width / 2 + deleteButtonDistanceFromPerson) - deleteButtonSize.width / 2, y: target.y - deleteButtonSize.height / 2 };
        }
        return { x: target.x - deleteButtonSize.width / 2, y: target.y + (personBoxSize.height / 2 + deleteButtonDistanceFromPerson) - deleteButtonSize.height / 2 };
    }
    g.selectAll(".parent").data(parentLinks, (d) => d.parentId + "parent" + d.familyId)
        .join(enter => {
        let parentLinkHook = enter.append("g").attr("class", () => "parent");
        let parentPath = parentLinkHook.append("path");
        parentPath.style("stroke", () => "grey").style("fill", () => "none");
        parentPath
            .attr("d", (d) => line(parentPathPoints(d.parentId, d.familyId)))
            .attr("stroke-dasharray", (d) => fadePathStrokeBeforeTransition(parentPathPoints(d.parentId, d.familyId))["stroke-dasharray"])
            .attr("stroke-dashoffset", (d) => fadePathStrokeBeforeTransition(parentPathPoints(d.parentId, d.familyId))["stroke-dashoffset"]);
        parentLinkHook.append("image")
            .attr("xlink:href", "icons/delete.svg")
            .attr("x", (d) => parentPathDeleteButtonPosition(d.parentId, d.familyId).x)
            .attr("y", (d) => parentPathDeleteButtonPosition(d.parentId, d.familyId).y)
            .attr("width", () => deleteButtonSize.width)
            .attr("height", () => deleteButtonSize.height)
            .on("click", async (event, d) => {
            await model.detachParent(d.familyId, d.parentId);
            await updateAll();
        });
        return parentLinkHook;
    }, update => {
        update.select("path").transition().attr("d", (d) => line(parentPathPoints(d.parentId, d.familyId)))
            .attr("stroke-dasharray", (d) => fadePathStrokeAfterTransition(parentPathPoints(d.parentId, d.familyId))["stroke-dasharray"])
            .attr("stroke-dashoffset", (d) => fadePathStrokeAfterTransition(parentPathPoints(d.parentId, d.familyId))["stroke-dashoffset"]);
        update.select("image").transition().attr("x", (d) => parentPathDeleteButtonPosition(d.parentId, d.familyId).x)
            .attr("y", (d) => parentPathDeleteButtonPosition(d.parentId, d.familyId).y);
        return update;
    }, exit => exit.remove());
    // -------------------------- Drawing children paths --------------------------
    function childPathPoints(childId, familyId) {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[childId];
        if (source.y > target.y) {
            return [[source.x, source.y],
                [source.x, source.y + 20],
                [target.x + personBoxSize.width, source.y + 20],
                [target.x + personBoxSize.width, target.y - personBoxSize.height / 2 - 40],
                [target.x, target.y - personBoxSize.height / 2 - 40],
                [target.x, target.y - personBoxSize.height / 2]];
        }
        const midHeight = (source.y + target.y) / 2;
        return [[source.x, source.y + familyBoxSize.height / 2],
            [source.x, midHeight],
            [target.x, midHeight],
            [target.x, target.y - personBoxSize.height / 2]];
    }
    function childPathDeleteButtonPosition(childId, familyId) {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[childId];
        return { x: target.x - deleteButtonSize.width / 2, y: target.y - deleteButtonDistanceFromPerson - personBoxSize.height / 2 - deleteButtonSize.height / 2 };
    }
    g.selectAll(".child").data(childrenLinks, (d) => d.childId + "child" + d.familyId)
        .join(enter => {
        let childLinkHook = enter.append("g").attr("class", () => "child");
        let childPath = childLinkHook.append("path");
        childPath.style("stroke", () => "grey").style("fill", () => "none");
        childPath
            .attr("d", (d) => line(childPathPoints(d.childId, d.familyId)))
            .attr("stroke-dasharray", (d) => fadePathStrokeBeforeTransition(childPathPoints(d.childId, d.familyId))["stroke-dasharray"])
            .attr("stroke-dashoffset", (d) => fadePathStrokeBeforeTransition(childPathPoints(d.childId, d.familyId))["stroke-dashoffset"]);
        childLinkHook.append("image")
            .attr("xlink:href", "icons/delete.svg")
            .attr("x", (d) => childPathDeleteButtonPosition(d.childId, d.familyId).x)
            .attr("y", (d) => childPathDeleteButtonPosition(d.childId, d.familyId).y)
            .attr("width", () => deleteButtonSize.width)
            .attr("height", () => deleteButtonSize.height)
            .on("click", async (event, d) => {
            await model.detachChild(d.familyId, d.childId);
            await updateAll();
        });
        return childLinkHook;
    }, update => {
        update.select("path").transition()
            .attr("d", (d) => line(childPathPoints(d.childId, d.familyId)))
            .attr("stroke-dasharray", (d) => fadePathStrokeAfterTransition(childPathPoints(d.childId, d.familyId))["stroke-dasharray"])
            .attr("stroke-dashoffset", (d) => fadePathStrokeAfterTransition(childPathPoints(d.childId, d.familyId))["stroke-dashoffset"]);
        update.select("image").transition().attr("x", (d) => childPathDeleteButtonPosition(d.childId, d.familyId).x)
            .attr("y", (d) => childPathDeleteButtonPosition(d.childId, d.familyId).y);
        return update;
    }, exit => exit.remove());
    // -------------------------- Drawing family nodes --------------------------
    function familyDeleteButtonOffset(d) {
        console.log(d);
        if (model.familyParents(d).length == 1) {
            return { dx: 25, dy: 0 };
        }
        return { dx: 0, dy: -25 };
    }
    g.selectAll(".family").data(familyNodes, (d) => d)
        .join(enter => {
        let familyHook = enter.append("g").attr("class", () => "family");
        familyHook.attr("transform", (d) => {
            return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")";
        });
        let heart = familyHook.append("image")
            .attr("xlink:href", "icons/red_heart.svg")
            .attr("x", () => -familyIconSize.width / 2)
            .attr("y", () => -familyIconSize.height / 2)
            .attr("width", () => familyIconSize.width)
            .attr("height", () => familyIconSize.height);
        heart.call(d3.drag().on("start", (event, d) => {
            let kind = "family-parent";
            if (event.y > layout.familyPosition[d].y + familyIconSize.height / 4) {
                kind = "family-child";
            }
            selectionLink = { source: { kind: kind, familyId: d }, cursorPosition: { x: event.x, y: event.y } };
            updateSelectionGraphics();
        }).on("drag", (event, d) => {
            selectionLink.cursorPosition = { x: event.x, y: event.y };
            updateSelectionGraphics();
        }).on("end", async (event, d) => {
            const source = selectionLink.source;
            selectionLink.source = null;
            let selected = findFunctionalEntityAtPoint(event.x, event.y);
            if (selected != null) {
                functionalEntityConnectionAction(source, selectionLink.source);
            }
            await updateSelectionGraphics();
        }));
        if (tools.debug()) {
            familyHook.append("text").text((d) => d);
        }
        let familyDeleteButton = familyHook.append("g");
        familyDeleteButton.append("image").attr("xlink:href", "icons/heart.svg")
            .attr("x", (d) => familyDeleteButtonOffset(d).dx - deleteButtonSize.width / 2)
            .attr("y", (d) => familyDeleteButtonOffset(d).dy - deleteButtonSize.height / 2)
            .attr("width", () => deleteButtonSize.width)
            .attr("height", () => deleteButtonSize.height);
        familyDeleteButton.append("image")
            .attr("xlink:href", "icons/delete.svg")
            .attr("x", (d) => familyDeleteButtonOffset(d).dx - deleteButtonSize.width / 2)
            .attr("y", (d) => familyDeleteButtonOffset(d).dy - deleteButtonSize.height / 2)
            .attr("width", () => deleteButtonSize.width)
            .attr("height", () => deleteButtonSize.height);
        familyDeleteButton.on("click", async (event, d) => {
            await model.deleteFamily(d);
            await updateAll();
        });
        return familyHook;
    }, update => update.transition().attr("transform", (d) => {
        return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")";
    }), exit => exit.remove());
    g.selectAll(".person").data(personNodes, (d) => d)
        .join(enter => {
        let personHook = enter.append("g")
            .attr("class", () => "person");
        personHook.call(d3.drag().on("start", (event, d) => {
            selectionLink = { source: { kind: "person", personId: d }, cursorPosition: { x: event.x, y: event.y } };
            updateSelectionGraphics();
        }).on("drag", (event, d) => {
            selectionLink = { source: { kind: "person", personId: d }, cursorPosition: { x: event.x, y: event.y } };
            updateSelectionGraphics();
        }).on("end", async (event, d) => {
            const source = selectionLink.source;
            selectionLink.source = null;
            let selected = findFunctionalEntityAtPoint(event.x, event.y);
            if (selected != null) {
                functionalEntityConnectionAction(source, selected);
            }
            await updateSelectionGraphics();
        }));
        personHook.attr("transform", (d) => {
            return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")";
        });
        personHook.append("text")
            .style("text-anchor", () => "middle")
            .text((d) => {
            if (tools.debug()) {
                return d;
            }
            return model.people[+d].names[0];
        })
            .style("font-size", "24px")
            .attr("font-family", "Dancing Script");
        let personDeleteButton = personHook.append("g").style("opacity", 1)
            .attr("class", () => "person_delete_button");
        personDeleteButton.append("image").attr("xlink:href", "icons/person_off.svg")
            .attr("x", () => personDeleteButtonOffset.dx - deleteButtonSize.width / 2)
            .attr("y", () => personDeleteButtonOffset.dy - deleteButtonSize.height / 2)
            .attr("width", () => deleteButtonSize.width)
            .attr("height", () => deleteButtonSize.height);
        personDeleteButton.on("click", async (event, d) => {
            await model.deletePerson(d);
            await updateAll();
        });
        return personHook;
    }, update => {
        console.log("CALLING UPDATE.");
        // https://groups.google.com/g/d3-js/c/hRlz9hndpmA/m/BH89BQIRCp4J
        update.filter((d) => !peopleToDrawDeleteButtonOn.has(d)).select("g")
            .transition().duration(500).style("opacity", 0);
        update.filter((d) => !peopleToDrawDeleteButtonOn.has(d)).select("g")
            .transition().delay(500).attr("display", "none");
        update.filter((d) => peopleToDrawDeleteButtonOn.has(d)).select("g").attr("display", null)
            .transition().duration(500).style("opacity", 1);
        return update.transition().duration(2000).attr("transform", (d) => {
            return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")";
        });
    });
}
async function updateAll() {
    await updateData();
    updateGraphics();
    updateGraphics();
}
updateAll();
//# sourceMappingURL=tree.js.map