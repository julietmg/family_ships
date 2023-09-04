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
const margin = { top: 50, right: 90, bottom: 30, left: 130 }, width = 10000 + margin.left + margin.right, height = 10000 + margin.top + margin.bottom;
const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom), g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
let parentLinks = [];
let familyNodes = [];
let personNodes = [];
let childrenLinks = [];
async function updateData() {
    await model.reload();
    layout.recalculate();
    parentLinks = [];
    for (const personId in model.people) {
        for (const familyId of model.parentOfFamilies(+personId)) {
            parentLinks.push([+personId, familyId]);
        }
    }
    familyNodes = [];
    for (const familyId in model.families) {
        familyNodes.push(+familyId);
    }
    personNodes = [];
    for (const personId in model.people) {
        personNodes.push(+personId);
    }
    childrenLinks = [];
    for (const personId in model.people) {
        for (const familyId of model.childOfFamilies(+personId)) {
            childrenLinks.push([+personId, +familyId]);
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
const personBoxSize = { width: 150, height: 80 };
function updateGraphics() {
    const deleteIconSize = { width: 15, height: 15 };
    const distanceFromPerson = 15;
    // TODO: Have some functions here.
    g.selectAll(".parent").data(parentLinks, (link) => link[0] + "parent" + link[1])
        .join(enter => {
        // -------------------------- Drawing initial parent path --------------------------
        let parentLinkHook = enter.append("g").attr("class", () => "parent");
        let parentPath = parentLinkHook.append("path");
        parentPath.style("stroke", () => "grey").style("fill", () => "none");
        parentPath.attr("d", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            return d3.line()([[source.x, source.y],
                [target.x, source.y],
                [target.x, target.y]]);
        }).attr("stroke-dasharray", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            const lineLength = Math.abs(source.y - target.y) + Math.abs(source.x - target.x);
            return lineLength + " " + lineLength;
        }).attr("stroke-dashoffset", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            const lineLength = Math.abs(source.y - target.y) + Math.abs(source.x - target.x);
            return lineLength;
        });
        // -------------------------- Deleted parent link button --------------------------
        parentLinkHook.append("image")
            .attr("xlink:href", "icons/delete.svg")
            .attr("x", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            if (target.y == source.y) {
                return +target.x + Math.sign(source.x - target.x) * (personBoxSize.width / 2 + distanceFromPerson) - deleteIconSize.width / 2;
            }
            return target.x;
        })
            .attr("y", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            if (target.y == source.y) {
                return target.y - deleteIconSize.height / 2;
            }
            return target.y + (personBoxSize.height / 2 + distanceFromPerson) - deleteIconSize.height / 2;
        })
            .attr("width", () => deleteIconSize.width)
            .attr("height", () => deleteIconSize.height)
            .on("click", async (event, d) => {
            await model.detachParent(d[1], d[0]);
            await updateAll();
        });
        return parentLinkHook;
    }, update => {
        update.select("path").transition().attr("d", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            return d3.line()([[source.x, source.y],
                [target.x, source.y],
                [target.x, target.y]]);
        }).attr("stroke-dasharray", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            const lineLength = Math.abs(source.y - target.y) + Math.abs(source.x - target.x);
            return lineLength + " " + lineLength;
        }).attr("stroke-dashoffset", (d) => {
            return 0;
        });
        update.select("image").transition().attr("x", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            if (target.y == source.y) {
                return +target.x + Math.sign(source.x - target.x) * (personBoxSize.width / 2 + distanceFromPerson) - deleteIconSize.width / 2;
            }
            return target.x;
        })
            .attr("y", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            if (target.y == source.y) {
                return target.y - deleteIconSize.height / 2;
            }
            return target.y + (personBoxSize.height / 2 + distanceFromPerson) - deleteIconSize.height / 2;
        });
        return update;
    }, exit => exit.remove());
    g.selectAll(".child").data(childrenLinks, (link) => link[0] + "child" + link[1])
        .join(enter => {
        let childLinkHook = enter.append("path").attr("class", () => "child");
        childLinkHook.style("stroke", () => "grey").style("fill", () => "none");
        childLinkHook.attr("d", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            const midHeight = (source.y + target.y) / 2;
            return d3.line()([[source.x, source.y],
                [source.x, midHeight],
                [target.x, midHeight],
                [target.x, target.y]]);
        }).attr("stroke-dasharray", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            const midHeight = (source.y + target.y) / 2;
            const lineLength = Math.abs(source.y - midHeight) + Math.abs(source.x - target.x) + Math.abs(midHeight - target.y);
            return lineLength + " " + lineLength;
        }).attr("stroke-dashoffset", (d) => {
            const source = layout.familyPosition[d[1]];
            const target = layout.personsPosition[d[0]];
            const midHeight = (source.y + target.y) / 2;
            const lineLength = Math.abs(source.y - midHeight) + Math.abs(source.x - target.x) + Math.abs(midHeight - target.y);
            return lineLength;
        });
        return childLinkHook;
    }, update => update.transition().attr("d", (d) => {
        const source = layout.familyPosition[d[1]];
        const target = layout.personsPosition[d[0]];
        const midHeight = (source.y + target.y) / 2;
        return d3.line()([[source.x, source.y],
            [source.x, midHeight],
            [target.x, midHeight],
            [target.x, target.y]]);
    }).attr("stroke-dasharray", (d) => {
        const source = layout.familyPosition[d[1]];
        const target = layout.personsPosition[d[0]];
        const midHeight = (source.y + target.y) / 2;
        const lineLength = Math.abs(source.y - midHeight) + Math.abs(source.x - target.x) + Math.abs(midHeight - target.y);
        return lineLength + " " + lineLength;
    }).attr("stroke-dashoffset", (d) => {
        return 0;
    }), exit => exit.remove());
    // adds the links between the nodes
    g.selectAll(".family").data(familyNodes, (d) => d)
        .join(enter => {
        let familyHook = enter.append("g").attr("class", () => "family");
        familyHook
            .append("circle")
            .attr("r", () => 25)
            .style("stroke", () => "white")
            .style("fill", () => "white");
        if (tools.debug()) {
            familyHook.append("text").text((d) => d);
        }
        else {
            familyHook.append("image")
                .attr("xlink:href", "heart.svg")
                .attr("x", () => -10)
                .attr("y", () => -10)
                .attr("width", () => 20)
                .attr("height", () => 20)
                .on("click", async function (_event, d) {
            });
        }
        familyHook.on("click", (_event, d) => familyClicked(d));
        familyHook.attr("transform", (d) => {
            return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")";
        });
        return familyHook;
    }, update => update.transition().attr("transform", (d) => {
        return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")";
    }), exit => exit.remove());
    g.selectAll(".person").data(personNodes, (d) => d)
        .join(enter => {
        let personHook = enter.append("g")
            .attr("class", () => "person");
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
        personHook.on("click", (_event, d) => personClicked(d));
        personHook.attr("transform", (d) => {
            return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")";
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