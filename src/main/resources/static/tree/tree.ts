import * as d3 from "d3";
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as model from "./model.js";
import * as layout from "./layout.js";
// Replace "d3" with CDN version "https://cdn.jsdelivr.net/npm/d3@7/+esm" for the web version.


// set the dimensions and margins of the diagram
const margin = { top: 50, right: 90, bottom: 30, left: 130 },
    width = 10000 + margin.left + margin.right,
    height = 10000 + margin.top + margin.bottom;

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom),
    g = svg.append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

let parentLinks: Array<Array<number>> = [];
let familyNodes: Array<number> = [];
let personNodes: Array<number> = [];
let childrenLinks: Array<Array<number>> = [];

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


async function familyClicked(d: number) {
    // TODO: Reload the graph after this finishes.
    // And preferably do it smoothly.
    // Also, block all the input for that period.
    // It's annoying, but it would work.
    console.log("Adding a child to " + d);
    let newPersonId = await fetch('/model/new_person', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'name': "child",
        })
    }).then(data => data.json());

    console.log(newPersonId);
    let addingChildResult = await fetch('/model/new_family_child', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + d,
            'childId': newPersonId
        })
    });
    console.log("Done");
    updateAll();
    console.log("Updating");
    console.log("DOZNO");
}

function personClicked(d: number) {
    // TODO: Erase debug in the production version
    console.log("Info about person: " + d);
    console.log(model.people[+d]);
    console.log("Parents:");
    console.log(model.parents(+d));
    console.log("Children:");
    console.log(model.children(+d));
    console.log("partners:");
    console.log(model.partners(+d));
    console.log("Siblings:");
    console.log(model.siblings(+d));
    console.log("Parent of families:");
    console.log(model.parentOfFamilies(+d));
    console.log("Child of families:");
    console.log(model.childOfFamilies(+d));
    console.log("Position:");
    console.log(layout.personsPosition[+d]);
}

function updateGraphics() {
    g.selectAll(".parent").data(parentLinks, (link: Array<number>) => link[0] + "parent" + link[1])
        .join(
            enter => {
                let parentLinkHook = enter.append("path").attr("class", () => "parent");
                parentLinkHook.style("stroke", () => "grey").style("fill", () => "none");
                parentLinkHook.attr("d", (d: Array<number>) => {
                    const source = layout.familyPosition[d[1]];
                    const target = layout.personsPosition[d[0]];
                    return d3.line()([[source.x, source.y],
                    [target.x, source.y],
                    [target.x, target.y]]);
                }).attr("stroke-dasharray", (d: Array<number>) => {
                        const source = layout.familyPosition[d[1]];
                        const target = layout.personsPosition[d[0]];
                        const lineLength = Math.abs(source.y - target.y) + Math.abs(source.x - target.x);
                        return lineLength + " " + lineLength;
                }).attr("stroke-dashoffset", (d: Array<number>) => {
                        const source = layout.familyPosition[d[1]];
                        const target = layout.personsPosition[d[0]];
                        const lineLength = Math.abs(source.y - target.y) + Math.abs(source.x - target.x);
                        return lineLength;
                });
                return parentLinkHook;
            },
            update => update.transition().attr("d", (d: Array<number>) => {
                const source = layout.familyPosition[d[1]];
                const target = layout.personsPosition[d[0]];
                return d3.line()([[source.x, source.y],
                [target.x, source.y],
                [target.x, target.y]]);
            }).attr("stroke-dasharray", (d: Array<number>) => {
                const source = layout.familyPosition[d[1]];
                const target = layout.personsPosition[d[0]];
                const lineLength = Math.abs(source.y - target.y) + Math.abs(source.x - target.x);
                return lineLength + " " + lineLength;
            }).attr("stroke-dashoffset", (d: Array<number>) => {
                return 0;
            }),
            exit => exit.remove()
        );

    g.selectAll(".child").data(childrenLinks, (link: Array<number>) => link[0] + "child" + link[1])
        .join(
            enter => {
                let childLinkHook = enter.append("path").attr("class", () => "child")
                childLinkHook.style("stroke", () => "grey").style("fill", () => "none");
                childLinkHook.attr("d", (d: Array<number>) => {
                    const source = layout.familyPosition[d[1]];
                    const target = layout.personsPosition[d[0]];
                    const midHeight = (source.y + target.y) / 2;
                    return d3.line()([[source.x, source.y],
                    [source.x, midHeight],
                    [target.x, midHeight],
                    [target.x, target.y]]);
                }).attr("stroke-dasharray", (d: Array<number>) => {
                    const source = layout.familyPosition[d[1]];
                    const target = layout.personsPosition[d[0]];
                    const midHeight = (source.y + target.y) / 2;
                    const lineLength = Math.abs(source.y - midHeight) + Math.abs(source.x - target.x) + Math.abs(midHeight - target.y);
                    return lineLength + " " + lineLength;
                }).attr("stroke-dashoffset", (d: Array<number>) => {
                    const source = layout.familyPosition[d[1]];
                    const target = layout.personsPosition[d[0]];
                    const midHeight = (source.y + target.y) / 2;
                    const lineLength = Math.abs(source.y - midHeight) + Math.abs(source.x - target.x) + Math.abs(midHeight - target.y);
                    return lineLength;
                });
                return childLinkHook;
            },
            update => update.transition().attr("d", (d: Array<number>) => {
                const source = layout.familyPosition[d[1]];
                const target = layout.personsPosition[d[0]];
                const midHeight = (source.y + target.y) / 2;
                return d3.line()([[source.x, source.y],
                [source.x, midHeight],
                [target.x, midHeight],
                [target.x, target.y]]);
            }).attr("stroke-dasharray", (d: Array<number>) => {
                const source = layout.familyPosition[d[1]];
                const target = layout.personsPosition[d[0]];
                const midHeight = (source.y + target.y) / 2;
                const lineLength = Math.abs(source.y - midHeight) + Math.abs(source.x - target.x) + Math.abs(midHeight - target.y);
                return lineLength + " " + lineLength;
            }).attr("stroke-dashoffset", (d: Array<number>) => {
                return 0;
            }),
            exit => exit.remove()

        );
    // adds the links between the nodes
    g.selectAll(".family").data(familyNodes, (d: number) => d)
        .join(
            enter => {
                let familyHook = enter.append("g").attr("class", () => "family");
                familyHook
                    .append("circle")
                    .attr("r", () => 12)
                    .style("stroke", () => "white")
                    .style("fill", () => "white");
                familyHook.append("image")
                    .attr("xlink:href", "heart.svg")
                    .attr("x", () => -5)
                    .attr("y", () => -5)
                    .attr("width", () => 10)
                    .attr("height", () => 10)
                    .on("click", async function (_event: any, d) {
                    });
                familyHook.on("click", (_event: any, d: any) => familyClicked(d));
                familyHook.attr("transform", (d) => {
                    return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")"
                });
                return familyHook;
            },
            update => update.transition().attr("transform", (d) => {
                return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")"
            }),
            exit => exit.remove()
        );

    g.selectAll(".person").data(personNodes, (d: number) => d)
        .join(
            enter => {
                let personHook = enter.append("g")
                    .attr("class", () => "person");
                personHook
                    .append("rect")
                    .attr("width", () => 80)
                    .attr("height", () => 40)
                    .attr("x", () => -40)
                    .attr("y", () => -20)
                    .style("stroke", () => "white")
                    .style("fill", () => "white");
                personHook.append("text")
                    .style("text-anchor",
                        () => "middle")
                    .text((d: any) => model.people[+d].formattedNames + " " + d)
                    .style("font-size", "20px")
                    .attr("font-family", "Dancing Script");
                personHook.on("click", (_event: any, d: any) => personClicked(d));
                personHook.attr("transform", (d: number) => {
                    return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")"
                });
                return personHook;
            },
            update => update.transition().attr("transform", (d: number) => {
                return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")"
            })
        );

}


async function updateAll() {
    await updateData();
    updateGraphics();
    updateGraphics();
}

updateAll();


