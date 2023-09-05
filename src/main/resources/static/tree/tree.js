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
    .on("click", (event, d) => {
    const newPersonId = model.newPerson("Name");
    tools.log("Added a new person " + newPersonId);
    updateAll();
});
const margin = { top: 50, right: 90, bottom: 30, left: 130 };
const svg = d3.select("body").append("svg")
    .attr("width", margin.left + margin.right)
    .attr("height", margin.top + margin.bottom);
const g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
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
async function familyClicked(d) {
    // TODO: Reload the graph after this finishes.
    // And preferably do it smoothly.
    // Also, block all the input for that period.
    // It's annoying, but it would work.
    tools.log("Adding a child to " + d);
    let newPersonId = await fetch('/model/new_person', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'name': "child",
        })
    }).then(data => data.json());
    tools.log(newPersonId);
    let addingChildResult = await fetch('/model/attach_child', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + d,
            'childId': newPersonId
        })
    });
    tools.log("Done");
    updateAll();
    tools.log("Updating");
    tools.log("DOZNO");
}
function personClicked(d) {
    // TODO: Erase debug in the production version
    tools.log("Info about person: " + d);
    tools.log(model.people[+d]);
    tools.log("Parents:");
    tools.log(model.parents(+d));
    tools.log("Children:");
    tools.log(model.children(+d));
    tools.log("partners:");
    tools.log(model.partners(+d));
    tools.log("Siblings:");
    tools.log(model.siblings(+d));
    tools.log("Parent of families:");
    tools.log(model.parentOfFamilies(+d));
    tools.log("Child of families:");
    tools.log(model.childOfFamilies(+d));
    tools.log("Position:");
    tools.log(layout.personsPosition[+d]);
}
// -------------------------- Tweakable constants for drawing things --------------------------
// This indicates how big is the white "invisible" box around the
// persons text.
const personBoxSize = { width: 150, height: 80 };
// This indicates how big is the white "invisible" box around the
// family symbol.
const familyBoxSize = { width: 28, height: 28 };
const familyIconSize = { width: 24, height: 24 };
const familyDeleteButtonOffset = { dx: 0, dy: -30 };
const personDeleteButtonOffset = { dx: 0, dy: -30 };
const deleteButtonSize = { width: 15, height: 15 };
const deleteButtonDistanceFromPerson = 15;
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
        return [[source.x, source.y],
            [target.x, source.y],
            [target.x, target.y]];
    }
    function parentPathDeleteButtonPosition(parentId, familyId) {
        const source = layout.familyPosition[familyId];
        const target = layout.personsPosition[parentId];
        if (target.y == source.y) {
            return { x: +target.x + Math.sign(source.x - target.x) * (personBoxSize.width / 2 + deleteButtonDistanceFromPerson) - deleteButtonSize.width / 2, y: target.y - deleteButtonSize.height / 2 };
        }
        return { x: target.x, y: target.y + (personBoxSize.height / 2 + deleteButtonDistanceFromPerson) - deleteButtonSize.height / 2 };
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
        const midHeight = (source.y + target.y) / 2;
        return [[source.x, source.y],
            [source.x, midHeight],
            [target.x, midHeight],
            [target.x, target.y]];
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
            .attr("stroke-dasharray", (d) => fadePathStrokeBeforeTransition(parentPathPoints(d.childId, d.familyId))["stroke-dasharray"])
            .attr("stroke-dashoffset", (d) => fadePathStrokeBeforeTransition(parentPathPoints(d.childId, d.familyId))["stroke-dashoffset"]);
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
            .attr("stroke-dasharray", (d) => fadePathStrokeAfterTransition(parentPathPoints(d.childId, d.familyId))["stroke-dasharray"])
            .attr("stroke-dashoffset", (d) => fadePathStrokeAfterTransition(parentPathPoints(d.childId, d.familyId))["stroke-dashoffset"]);
        update.select("image").transition().attr("x", (d) => childPathDeleteButtonPosition(d.childId, d.familyId).x)
            .attr("y", (d) => childPathDeleteButtonPosition(d.childId, d.familyId).y);
        return update;
    }, exit => exit.remove());
    // -------------------------- Drawing family nodes --------------------------
    g.selectAll(".family").data(familyNodes, (d) => d)
        .join(enter => {
        let familyHook = enter.append("g").attr("class", () => "family");
        familyHook.attr("transform", (d) => {
            return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")";
        });
        familyHook
            .append("rect")
            .attr("x", () => -familyBoxSize.width / 2)
            .attr("y", () => -familyBoxSize.height / 2)
            .attr("width", () => familyBoxSize.width)
            .attr("height", () => familyBoxSize.height)
            .style("stroke", () => "white")
            .style("fill", () => "white");
        if (tools.debug()) {
            familyHook.append("text").text((d) => d);
        }
        else {
            familyHook.append("image")
                .attr("xlink:href", "icons/red_heart.svg")
                .style("stroke", () => "red")
                .style("fill", () => "red")
                .attr("x", () => -familyIconSize.width / 2)
                .attr("y", () => -familyIconSize.height / 2)
                .attr("width", () => familyIconSize.width)
                .attr("height", () => familyIconSize.height);
        }
        let familyDeleteButton = familyHook.append("g");
        familyDeleteButton.append("image").attr("xlink:href", "icons/heart.svg")
            .attr("x", () => familyDeleteButtonOffset.dx - deleteButtonSize.width / 2)
            .attr("y", () => familyDeleteButtonOffset.dy - deleteButtonSize.height / 2)
            .attr("width", () => deleteButtonSize.width)
            .attr("height", () => deleteButtonSize.height);
        familyDeleteButton.append("image")
            .attr("xlink:href", "icons/delete.svg")
            .attr("x", () => familyDeleteButtonOffset.dx - deleteButtonSize.width / 2)
            .attr("y", () => familyDeleteButtonOffset.dy - deleteButtonSize.height / 2)
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
        personHook.attr("transform", (d) => {
            return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")";
        });
        personHook
            .append("rect")
            .attr("width", () => personBoxSize.width)
            .attr("height", () => personBoxSize.height)
            .attr("x", () => -personBoxSize.width / 2)
            .attr("y", () => -personBoxSize.height / 2)
            .style("stroke", () => "white")
            .style("fill", () => "white");
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
        let personDeleteButton = personHook.append("g");
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
    }, update => update.transition().attr("transform", (d) => {
        return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")";
    }));
}
async function updateAll() {
    await updateData();
    updateGraphics();
    updateGraphics();
}
updateAll();
//# sourceMappingURL=tree.js.map